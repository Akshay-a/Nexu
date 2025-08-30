import React, { useState, useRef } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Alert,
  Platform,
  KeyboardAvoidingView 
} from 'react-native';

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message..." 
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  const handleSend = async () => {
    if (!message.trim() || isSending || disabled) {
      return;
    }

    const messageToSend = message.trim();
    
    // Validate message length
    if (messageToSend.length > 1000) {
      Alert.alert('Message Too Long', 'Messages must be under 1000 characters.');
      return;
    }

    console.log('📤 Sending message from input:', messageToSend.substring(0, 50) + '...');
    
    setIsSending(true);
    
    try {
      await onSend(messageToSend);
      setMessage(''); // Clear input on successful send
      console.log('✅ Message sent successfully from input');
    } catch (error: any) {
      console.error('❌ Failed to send message from input:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Failed to send message';
      Alert.alert('Send Failed', errorMessage);
    } finally {
      setIsSending(false);
      // Re-focus input for continued typing
      if (textInputRef.current) {
        textInputRef.current.focus();
      }
    }
  };

  const handleSubmitEditing = () => {
    if (Platform.OS === 'ios') {
      // On iOS, allow multiline by default, send with button
      return;
    }
    // On Android, send on enter
    handleSend();
  };

  const canSend = message.trim().length > 0 && !isSending && !disabled;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inputContainer}>
        <View style={styles.textInputContainer}>
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              disabled && styles.disabledInput
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder={disabled ? "Join chat to send messages" : placeholder}
            placeholderTextColor="#19323C"
            multiline={true}
            maxLength={1000}
            scrollEnabled={true}
            textAlignVertical="center"
            editable={!disabled && !isSending}
            onSubmitEditing={handleSubmitEditing}
            blurOnSubmit={false}
            returnKeyType={Platform.OS === 'ios' ? 'default' : 'send'}
          />
          
          {/* Character count indicator when approaching limit */}
          {message.length > 800 && (
            <Text style={[
              styles.characterCount,
              message.length > 950 && styles.characterCountWarning
            ]}>
              {message.length}/1000
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonInactive
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Text style={[
            styles.sendButtonText,
            canSend ? styles.sendButtonTextActive : styles.sendButtonTextInactive
          ]}>
            {isSending ? '⏳' : '📤'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF5E5',
    borderTopWidth: 1,
    borderTopColor: '#C9F5D3',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  textInputContainer: {
    flex: 1,
    position: 'relative',
  },
  textInput: {
    backgroundColor: '#C9F5D3',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#19323C',
    maxHeight: 100,
    minHeight: 44,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  disabledInput: {
    backgroundColor: '#E5E5E5',
    color: '#666',
  },
  characterCount: {
    position: 'absolute',
    bottom: 4,
    right: 12,
    fontSize: 10,
    color: '#19323C',
    opacity: 0.6,
    backgroundColor: 'rgba(255, 245, 229, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  characterCountWarning: {
    color: '#FF7E67',
    fontWeight: '600',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonActive: {
    backgroundColor: '#FF7E67',
    shadowColor: '#FF7E67',
  },
  sendButtonInactive: {
    backgroundColor: '#E5E5E5',
    shadowColor: '#000',
  },
  sendButtonText: {
    fontSize: 18,
  },
  sendButtonTextActive: {
    opacity: 1,
  },
  sendButtonTextInactive: {
    opacity: 0.5,
  },
});

export default MessageInput;
