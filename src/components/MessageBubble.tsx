import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../types/app';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  isOptimistic?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwn, 
  showAvatar = true,
  isOptimistic = false 
}) => {
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarColor = (color: string | null): string => {
    if (color && color.startsWith('#')) {
      return color;
    }
    if (color && color.startsWith('hsl')) {
      return color;
    }
    // Fallback to hash-based color
    const hash = message.display_name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const avatarColor = getAvatarColor(message.avatar_color);
  const initials = message.display_name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={[
      styles.container,
      isOwn ? styles.ownMessage : styles.otherMessage
    ]}>
      {/* Avatar for other messages */}
      {!isOwn && showAvatar && (
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      )}
      
      {/* Message content */}
      <View style={[
        styles.messageContainer,
        isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
        isOptimistic && styles.optimisticMessage
      ]}>
        {/* Show sender name for other messages */}
        {!isOwn && (
          <Text style={styles.senderName}>{message.display_name}</Text>
        )}
        
        {/* Message content */}
        <Text style={[
          styles.messageText,
          isOwn ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {message.content}
        </Text>
        
        {/* Timestamp */}
        <Text style={[
          styles.timestamp,
          isOwn ? styles.ownTimestamp : styles.otherTimestamp
        ]}>
          {formatTime(message.sent_at)}
          {isOptimistic && ' •'}
        </Text>
      </View>
      
      {/* Spacer for own messages to push them right */}
      {isOwn && <View style={styles.spacer} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  messageContainer: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  ownMessageContainer: {
    backgroundColor: '#FF7E67',
    borderBottomRightRadius: 4,
    marginLeft: 60,
  },
  otherMessageContainer: {
    backgroundColor: '#C9F5D3',
    borderBottomLeftRadius: 4,
    marginRight: 60,
  },
  optimisticMessage: {
    opacity: 0.7,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#19323C',
    marginBottom: 2,
    opacity: 0.8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 2,
  },
  ownMessageText: {
    color: '#FFF5E5',
  },
  otherMessageText: {
    color: '#19323C',
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.7,
    alignSelf: 'flex-end',
  },
  ownTimestamp: {
    color: '#FFF5E5',
  },
  otherTimestamp: {
    color: '#19323C',
  },
  spacer: {
    width: 40,
  },
});

export default MessageBubble;
