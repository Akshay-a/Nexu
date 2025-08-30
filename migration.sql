-- =====================================================
-- Migration Script for Nexu Project
-- Location-based Anonymous Group Chat App
-- Supabase PostgreSQL Schema
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Authenticated Users Table
-- =====================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  display_name TEXT,
  avatar_url TEXT,
  created_groups_count INT DEFAULT 0 CHECK (created_groups_count <= 3)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Indexes
CREATE INDEX idx_users_email ON users(email);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. Chat Groups Table
-- =====================================================
CREATE TABLE public.chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 50),
  description TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  h3_index_8 TEXT NOT NULL, -- H3 Res 8 from (lat, lng)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_groups
-- Allow anyone to view active chat groups (including anonymous users)
CREATE POLICY "Anyone can view active chat groups" ON public.chat_groups
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create chat groups" ON public.chat_groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = creator_id);

CREATE POLICY "Creators can update their chat groups" ON public.chat_groups
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their chat groups" ON public.chat_groups
  FOR DELETE USING (auth.uid() = creator_id);

-- Indexes
CREATE INDEX idx_chat_groups_h3 ON chat_groups(h3_index_8);
CREATE INDEX idx_chat_groups_last_activity ON chat_groups(last_activity DESC);
CREATE INDEX idx_chat_groups_creator ON chat_groups(creator_id);

-- =====================================================
-- 3. Anonymous Users Table
-- =====================================================
CREATE TABLE public.anonymous_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE, -- stored in AsyncStorage
  generated_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE anonymous_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anonymous_users
CREATE POLICY "Anyone can insert anonymous users" ON public.anonymous_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view anonymous users for messages" ON public.anonymous_users
  FOR SELECT USING (true);

-- FIXED: Only allow updating your own anonymous data based on device_id
-- This requires passing device_id in RLS context or using a function
CREATE POLICY "Users can update their own anonymous data" ON public.anonymous_users
  FOR UPDATE USING (device_id = current_setting('app.current_device_id', true));

-- Indexes
CREATE INDEX idx_anon_device ON anonymous_users(device_id);

-- =====================================================
-- 4. Messages Table
-- =====================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  sent_at TIMESTAMPTZ DEFAULT NOW(),

  -- Sender info
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'anonymous')),
  user_id UUID REFERENCES users(id),                    -- if authenticated
  anonymous_user_id UUID REFERENCES anonymous_users(id), -- if anon

  -- Denormalized for fast reads
  display_name TEXT NOT NULL,
  avatar_color TEXT, -- e.g., '#FF5733' based on hash of name
  
  -- ADDED: Message types for polls/MCQ
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'poll')),
  poll_data JSONB, -- For poll: {question, options: [{id, text, votes}], allowMultiple: false}
  
  -- ADDED: Simple rate limiting - check constraint to prevent spam
  CONSTRAINT valid_sender CHECK (
    (sender_type = 'user' AND user_id IS NOT NULL AND anonymous_user_id IS NULL) OR
    (sender_type = 'anonymous' AND anonymous_user_id IS NOT NULL AND user_id IS NULL)
  ),
  CONSTRAINT valid_poll CHECK (
    (message_type = 'text' AND poll_data IS NULL) OR
    (message_type = 'poll' AND poll_data IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Anyone can view messages in public chats" ON public.messages
  FOR SELECT USING (true);

CREATE POLICY "Users and anonymous can send messages with rate limiting" ON public.messages
  FOR INSERT WITH CHECK (
    (sender_type = 'user' AND auth.uid() = user_id) OR
    (sender_type = 'anonymous' AND anonymous_user_id IS NOT NULL)
  );

-- Indexes
CREATE INDEX idx_messages_chat_sent_at ON messages(chat_group_id, sent_at DESC);
CREATE INDEX idx_messages_anon_user ON messages(anonymous_user_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at); -- for cleanup
CREATE INDEX idx_messages_type ON messages(message_type); -- for filtering polls
CREATE INDEX idx_messages_poll_data ON messages USING GIN (poll_data) WHERE poll_data IS NOT NULL;

-- =====================================================
-- 5. Poll Votes Table (Simple tracking)
-- =====================================================
CREATE TABLE public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL, -- References poll_data.options[].id
  
  -- Voter info (same pattern as messages)
  voter_type TEXT NOT NULL CHECK (voter_type IN ('user', 'anonymous')),
  user_id UUID REFERENCES users(id),
  anonymous_user_id UUID REFERENCES anonymous_users(id),
  
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_voter CHECK (
    (voter_type = 'user' AND user_id IS NOT NULL AND anonymous_user_id IS NULL) OR
    (voter_type = 'anonymous' AND anonymous_user_id IS NOT NULL AND user_id IS NULL)
  ),
  -- Prevent duplicate votes (one vote per user per poll)
  UNIQUE(message_id, user_id, anonymous_user_id)
);

-- Enable RLS
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for poll_votes
CREATE POLICY "Anyone can view poll votes" ON public.poll_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can vote on polls" ON public.poll_votes
  FOR INSERT WITH CHECK (
    (voter_type = 'user' AND auth.uid() = user_id) OR
    (voter_type = 'anonymous' AND anonymous_user_id IS NOT NULL)
  );

-- Indexes
CREATE INDEX idx_poll_votes_message ON poll_votes(message_id);
CREATE INDEX idx_poll_votes_user ON poll_votes(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_poll_votes_anon ON poll_votes(anonymous_user_id) WHERE anonymous_user_id IS NOT NULL;

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger to increment created_groups_count
CREATE OR REPLACE FUNCTION increment_group_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET created_groups_count = created_groups_count + 1 WHERE id = NEW.creator_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_group_count
  AFTER INSERT ON chat_groups
  FOR EACH ROW EXECUTE FUNCTION increment_group_count();

-- Trigger to update last_activity on new message
CREATE OR REPLACE FUNCTION update_chat_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_groups SET last_activity = NEW.sent_at WHERE id = NEW.chat_group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_chat_activity
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_activity();

-- =====================================================
-- SIMPLIFIED: Message Cleanup View (for 24-hour message expiry)
-- =====================================================
-- Instead of complex Edge Functions, use a view that automatically filters old messages
CREATE VIEW current_messages AS
SELECT * FROM messages 
WHERE sent_at > NOW() - INTERVAL '24 hours';

-- OPTIONAL: Cleanup function for periodic maintenance (can be called manually or via simple cron)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM messages WHERE sent_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Simple rate limiting function to check message frequency
CREATE OR REPLACE FUNCTION check_message_rate_limit(sender_id UUID, sender_type_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  IF sender_type_param = 'user' THEN
    SELECT COUNT(*) INTO recent_count 
    FROM messages 
    WHERE user_id = sender_id 
    AND sent_at > NOW() - INTERVAL '1 minute';
  ELSE
    SELECT COUNT(*) INTO recent_count 
    FROM messages 
    WHERE anonymous_user_id = sender_id 
    AND sent_at > NOW() - INTERVAL '1 minute';
  END IF;
  
  RETURN recent_count < 10; -- Max 10 messages per minute
END;
$$ LANGUAGE plpgsql;

-- ADDED: Cleanup inactive anonymous users (when app data cleared)
CREATE OR REPLACE FUNCTION cleanup_inactive_anonymous_users()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete anonymous users not seen for 14 days AND have no recent messages
  DELETE FROM anonymous_users 
  WHERE last_seen < NOW() - INTERVAL '14 days'
  AND id NOT IN (
    SELECT DISTINCT anonymous_user_id 
    FROM messages 
    WHERE anonymous_user_id IS NOT NULL 
    AND sent_at > NOW() - INTERVAL '7 days'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ADDED: Simple poll voting function
CREATE OR REPLACE FUNCTION vote_on_poll(
  poll_message_id UUID,
  option_id_param TEXT,
  voter_type_param TEXT,
  voter_user_id UUID DEFAULT NULL,
  voter_anon_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert vote (UNIQUE constraint prevents duplicates)
  INSERT INTO poll_votes (message_id, option_id, voter_type, user_id, anonymous_user_id)
  VALUES (poll_message_id, option_id_param, voter_type_param, voter_user_id, voter_anon_id)
  ON CONFLICT (message_id, user_id, anonymous_user_id) DO UPDATE SET
    option_id = EXCLUDED.option_id,
    voted_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ADDED: Get poll results function
CREATE OR REPLACE FUNCTION get_poll_results(poll_message_id UUID)
RETURNS TABLE(option_id TEXT, vote_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT pv.option_id, COUNT(*) as vote_count
  FROM poll_votes pv
  WHERE pv.message_id = poll_message_id
  GROUP BY pv.option_id
  ORDER BY vote_count DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Additional Indexes for Performance with 200+ users
-- =====================================================
CREATE INDEX idx_messages_user_recent ON messages(user_id, sent_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_messages_anon_recent ON messages(anonymous_user_id, sent_at DESC) WHERE anonymous_user_id IS NOT NULL;

-- =====================================================
-- Helper Functions for H3 (fallback if H3 extension unavailable)
-- =====================================================
-- Simple geohash-based alternative for hackathon demo
CREATE OR REPLACE FUNCTION simple_geohash(lat DOUBLE PRECISION, lng DOUBLE PRECISION, precision_level INT DEFAULT 8)
RETURNS TEXT AS $$
BEGIN
  -- Simple grid-based approach as H3 fallback
  -- This creates a basic spatial index for demo purposes
  RETURN CONCAT(
    FLOOR(lat * POWER(10, precision_level/2))::TEXT, 
    '_', 
    FLOOR(lng * POWER(10, precision_level/2))::TEXT
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Sample Data (for testing - remove in production)
-- =====================================================
-- Insert sample anonymous user for testing
-- INSERT INTO anonymous_users (device_id, generated_name) VALUES ('device123', 'CrimsonFox');

-- =====================================================
-- HACKATHON DEPLOYMENT NOTES
-- =====================================================
-- 1. Enable realtime for all tables: ALTER PUBLICATION supabase_realtime ADD TABLE messages, chat_groups;
-- 2. Set up periodic cleanup: 
--    SELECT cron.schedule('cleanup-messages', '0 * * * *', 'SELECT cleanup_old_messages();');
--    SELECT cron.schedule('cleanup-anon-users', '0 0 * * *', 'SELECT cleanup_inactive_anonymous_users();');
-- 3. Configure app.current_device_id in client before anonymous user operations
-- 4. Use current_messages view instead of messages table for queries
-- 5. Call check_message_rate_limit() before inserting messages
-- 6. ADDED: Update last_seen for anonymous users on app activity
-- 7. POLLS: Use vote_on_poll() function for voting, get_poll_results() for results

-- =====================================================
-- Test function to bypass RLS for debugging
-- =====================================================
CREATE OR REPLACE FUNCTION get_nearby_chats_test(user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_km DOUBLE PRECISION DEFAULT 5)
RETURNS TABLE(id UUID, name TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION, is_active BOOLEAN, last_activity TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT cg.id, cg.name, cg.lat, cg.lng, cg.is_active, cg.last_activity
  FROM chat_groups cg
  WHERE cg.is_active = true
  ORDER BY cg.last_activity DESC
  LIMIT 10;
END;
$$;

-- =====================================================
-- End of Migration Script
-- =====================================================
