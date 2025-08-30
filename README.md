# NexU - Location-Based Anonymous Chat App

A React Native/Expo app that connects users to local conversations through location-based anonymous group chats.

## Features

- 🌍 **Location-based Discovery**: Find chat groups based on your current location using H3 geospatial indexing
- 👤 **Anonymous Participation**: Join chats without signing up using device-generated names
- 🔐 **Optional Authentication**: Sign up to create and manage your own chat groups
- 📱 **Cross-Platform**: Works on iOS, Android, and Web
- ⚡ **Real-time Chat**: Powered by Supabase real-time subscriptions

## Tech Stack

- **Frontend**: React Native + Expo
- **Navigation**: React Navigation 6+
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Maps**: react-native-maps with web fallback
- **Location**: expo-location
- **Geospatial**: H3 indexing for location-based features
- **Storage**: expo-secure-store + localStorage
- **Language**: TypeScript throughout

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nexu-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

**✅ Ready to use!** The `.env` file includes working credentials for the NexU MVP server:
- Supabase URL: `https://jtkewgtvezjukhzbtuxw.supabase.co`
- Project configured with the complete database schema
- All features enabled for testing

For detailed environment configuration, see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)

### Database Setup

**✅ Database already configured!** The NexU MVP server includes:
- Complete schema from `migration.sql` already applied
- Realtime enabled for `messages` and `chat_groups` tables
- Sample data and proper RLS policies configured

To set up your own Supabase project:
1. Create a new Supabase project
2. Run the SQL migration script from `migration.sql` in your Supabase SQL editor
3. Enable Realtime for the `messages` and `chat_groups` tables
4. Update the environment variables with your project credentials

### Running the App

```bash
# Web
npm run web

# iOS (requires macOS)
npm run ios

# Android
npm run android
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
├── navigation/         # Navigation setup
├── services/           # API and external services
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── config/             # App configuration
└── utils/              # Utility functions
```

## Core Features

### Anonymous User System
- Device ID-based identity generation
- Persistent anonymous names (e.g., "CrimsonFox")
- Cross-session continuity

### Location Services
- GPS-based positioning
- H3 geospatial indexing for efficient location queries
- Permission handling for all platforms

### Authentication
- Email/password authentication via Supabase
- Optional user registration for chat creation
- Session management

### Map Integration
- Native maps on mobile devices
- Web-compatible fallback for browser environments
- Real-time chat pin display

## Environment Configuration

The app uses Expo's environment variable system:

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Platform Compatibility

- ✅ **Web**: Full functionality with fallback components
- ✅ **iOS**: Native maps and location services
- ✅ **Android**: Native maps and location services

## Development Notes

- Cross-platform compatibility prioritized throughout
- Error boundaries and loading states implemented
- TypeScript strict mode enabled
- Metro bundler configured for multi-platform builds

## Contributing

This is a hackathon project focused on rapid development and core functionality demonstration.
