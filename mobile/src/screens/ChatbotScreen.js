import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-voice/voice';
import { API } from '../services/api';

const QUICK_QUESTIONS = [
  'What are the signs of malnutrition?',
  'What vaccines are due at 6 months?',
  'What should I feed a 2-year-old child?',
];

const ChatbotScreen = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am PoshanAI. Ask me anything, or use the microphone to speak your question.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechResults = (event) => {
      const transcript = event.value?.[0];
      if (transcript) {
        setInput(transcript);
      }
    };
    Voice.onSpeechError = (event) => {
      setIsListening(false);
      const message = event.error?.message || 'Speech recognition was not available.';
      Alert.alert('Voice input unavailable', message.replace(/\[|\]/g, ''));
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isSending]);

  const requestMicrophonePermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Allow microphone access',
        message: 'PoshanAI uses the microphone only to turn your spoken question into text.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      },
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handleVoiceInput = async () => {
    try {
      if (isListening) {
        await Voice.stop();
        return;
      }

      if (!(await requestMicrophonePermission())) {
        Alert.alert('Microphone permission required', 'Allow microphone access in Android settings to use voice input.');
        return;
      }

      const available = await Voice.isAvailable();
      if (!available) {
        Alert.alert('Voice input unavailable', 'Install or enable a speech recognition service on this device, then try again.');
        return;
      }

      await Voice.start('en-IN');
    } catch (error) {
      setIsListening(false);
      Alert.alert('Voice input unavailable', error.message || 'Could not start speech recognition.');
    }
  };

  const handleSend = async (value = input) => {
    const message = value.trim();
    if (!message || isSending) {
      return;
    }

    const userMessage = { id: `${Date.now()}-user`, sender: 'user', text: message };
    const conversationHistory = messages
      .filter((item) => item.id !== 'welcome')
      .slice(-8)
      .map((item) => ({ role: item.sender === 'bot' ? 'assistant' : 'user', text: item.text }));

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const response = await API.chatbot.sendMessage(message, conversationHistory);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-bot`,
          sender: 'bot',
          text: response.response || 'I could not generate a response. Please try again.',
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          sender: 'bot',
          text: error.response?.data?.message || 'I could not reach the assistant. Check your API connection and try again.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <Text style={styles.headerSubtitle}>Ask by typing or speaking</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[styles.messageWrapper, message.sender === 'user' ? styles.userMessageWrapper : styles.botMessageWrapper]}
          >
            <View style={[styles.messageBubble, message.sender === 'user' ? styles.userBubble : styles.botBubble]}>
              <Text style={[styles.messageText, message.sender === 'user' ? styles.userText : styles.botText]}>
                {message.text}
              </Text>
            </View>
          </View>
        ))}
        {isSending && (
          <View style={[styles.messageWrapper, styles.botMessageWrapper]}>
            <View style={[styles.messageBubble, styles.botBubble]}>
              <Text style={styles.botText}>Thinking…</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.quickQuestionsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {QUICK_QUESTIONS.map((question) => (
            <TouchableOpacity
              key={question}
              style={styles.quickQuestionButton}
              onPress={() => handleSend(question)}
              disabled={isSending}
            >
              <Text style={styles.quickQuestionText}>{question}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask a question..."
          placeholderTextColor="#7f8c8d"
          multiline
          accessibilityLabel="Chat message"
        />
        <TouchableOpacity
          style={[styles.roundButton, styles.voiceButton, isListening && styles.voiceButtonActive]}
          onPress={handleVoiceInput}
          accessibilityLabel={isListening ? 'Stop voice input' : 'Start voice input'}
        >
          <Icon name={isListening ? 'stop' : 'mic'} size={22} color={isListening ? '#fff' : '#165C55'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roundButton, styles.sendButton, (!input.trim() || isSending) && styles.buttonDisabled]}
          onPress={() => handleSend()}
          disabled={!input.trim() || isSending}
          accessibilityLabel="Send message"
        >
          <Icon name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#165C55' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#d6ebe6', marginTop: 4 },
  messagesContainer: { flex: 1, paddingHorizontal: 15 },
  messagesContent: { paddingVertical: 15 },
  messageWrapper: { marginBottom: 12 },
  userMessageWrapper: { alignItems: 'flex-end' },
  botMessageWrapper: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '85%', borderRadius: 18, padding: 14 },
  userBubble: { backgroundColor: '#1877C9', borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1 },
  messageText: { fontSize: 16, lineHeight: 22 },
  userText: { color: '#fff' },
  botText: { color: '#22302f' },
  quickQuestionsContainer: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e6eceb' },
  quickQuestionButton: { backgroundColor: '#edf6f3', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, marginRight: 8 },
  quickQuestionText: { fontSize: 12, color: '#165C55' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e6eceb', gap: 8 },
  input: { flex: 1, backgroundColor: '#f5f7f7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, maxHeight: 110, borderWidth: 1, borderColor: '#d9e1df' },
  roundButton: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  voiceButton: { backgroundColor: '#edf6f3' },
  voiceButtonActive: { backgroundColor: '#c0392b' },
  sendButton: { backgroundColor: '#165C55' },
  buttonDisabled: { opacity: 0.45 },
});

export default ChatbotScreen;
