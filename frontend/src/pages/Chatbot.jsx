import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { chatbotAPI } from '../services/api';

const QUICK_QUESTIONS = [
  'What are the signs of malnutrition?',
  'What should I feed a 2-year-old child?',
  'How do I monitor a child\'s growth?',
];

const welcomeMessage = {
  id: 'welcome',
  sender: 'bot',
  text: 'Hello! I am PoshanAI. Ask me about child nutrition, growth, or Anganwadi activities.',
};

const getSupportedMimeType = () => {
  if (!window.MediaRecorder) return '';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

const getTextLanguage = (text) => /[\u0D00-\u0D7F]/.test(text) ? 'ml-IN' : 'en-IN';

const Chatbot = () => {
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('en-IN');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const messagesRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechRecognitionRef = useRef(null);
  const lastSpeechTranscriptRef = useRef('');
  const fallbackTranscriptRef = useRef('');
  const inputLanguageRef = useRef(null);

  useEffect(() => () => {
    mediaRecorderRef.current?.stop();
    speechRecognitionRef.current?.stop();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, loading, isTranscribing]);

  const addNotice = (text) => setMessages((current) => [...current, { id: `${Date.now()}-notice`, sender: 'notice', text }]);

  const handleSend = async (value = input) => {
    const currentInput = value.trim();
    if (!currentInput || loading || isTranscribing) return;

    const history = messages
      .filter((message) => message.id !== 'welcome' && message.sender !== 'notice')
      .slice(-8)
      .map((message) => ({ role: message.sender === 'bot' ? 'assistant' : 'user', text: message.text }));
    setMessages((current) => [...current, { id: `${Date.now()}-user`, sender: 'user', text: currentInput }]);
    setInput('');
    setLoading(true);

    try {
      const responseLanguage = inputLanguageRef.current || getTextLanguage(currentInput);
      inputLanguageRef.current = null;
      const response = await chatbotAPI.sendMessage(currentInput, history, responseLanguage);
      setMessages((current) => [...current, { id: `${Date.now()}-bot`, sender: 'bot', text: response.response }]);
    } catch (error) {
      addNotice(error.message || 'The AI assistant is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    speechRecognitionRef.current?.stop();
  };

  const startRecording = async () => {
    setRecordingError('');
    if (isRecording) {
      stopRecording();
      return;
    }
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = language;
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;
        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .slice(event.resultIndex)
            .map((result) => result[0]?.transcript || '')
            .join(' ')
            .trim();
          if (!transcript || transcript === lastSpeechTranscriptRef.current) return;
          lastSpeechTranscriptRef.current = transcript;
          inputLanguageRef.current = language;
          setInput((current) => current && current !== transcript ? `${current} ${transcript}` : transcript);
        };
        recognition.onerror = (event) => {
          setIsRecording(false);
          setRecordingError(event.error === 'not-allowed'
            ? 'Microphone permission is required for voice input.'
            : 'Voice recognition is unavailable in the embedded VS Code browser. Open this page directly in Chrome or Edge, allow microphone access, and try again.');
        };
        recognition.onend = () => {
          speechRecognitionRef.current = null;
          setIsRecording(false);
          lastSpeechTranscriptRef.current = '';
        };
        speechRecognitionRef.current = recognition;
        recognition.start();
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setRecordingError('Voice recognition is currently unavailable. Open this page directly in Chrome or Edge and allow microphone access.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      fallbackTranscriptRef.current = '';

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          await new Promise((resolve) => setTimeout(resolve, 350));
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const result = await chatbotAPI.transcribeVoice(blob, language);
          setInput((current) => (current ? `${current} ${result.text}` : result.text));
        } catch (error) {
          if (fallbackTranscriptRef.current) {
            setInput((current) => (current ? `${current} ${fallbackTranscriptRef.current}` : fallbackTranscriptRef.current));
            setRecordingError('');
          } else {
            setRecordingError(error.message || 'Voice recognition is currently unavailable. Please type your question instead.');
          }
        } finally {
          speechRecognitionRef.current = null;
          setIsTranscribing(false);
          audioChunksRef.current = [];
        }
      };
      recorder.onerror = () => setRecordingError('The recording could not be read. Please try again.');
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setRecordingError(error.name === 'NotAllowedError'
        ? 'Microphone permission is required for voice input.'
        : 'The microphone is unavailable. Check your device and try again.');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if (isRecording) stopRecording();
    setMessages([welcomeMessage]);
    setInput('');
    setRecordingError('');
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <Sidebar role="worker" />
        <main className="main-content">
          <div className="chatbot-heading">
            <div>
              <p className="eyebrow">POSHANAI ASSISTANT</p>
              <h2>AI Assistant</h2>
              <p className="chatbot-subtitle">Practical guidance for child nutrition and Anganwadi work.</p>
            </div>
            <button type="button" className="clear-chat-btn" onClick={clearChat}>Clear chat</button>
          </div>

          <section className="chatbot-container" aria-label="PoshanAI chat">
            <div className="chatbot-header">
              <div className="assistant-avatar" aria-hidden="true">P</div>
              <div>
                <strong>PoshanAI</strong>
                <span>Local AI assistant</span>
              </div>
              <label className="language-control">
                <span>Speech language</span>
                <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Speech language">
                  <option value="en-IN">English</option>
                  <option value="ml-IN">Malayalam</option>
                </select>
              </label>
            </div>

            <div className="chat-messages" ref={messagesRef} aria-live="polite" aria-label="Conversation">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.sender}`}>
                  {message.sender !== 'notice' && <span className="message-label">{message.sender === 'user' ? 'You' : 'PoshanAI'}</span>}
                  <div className="message-content">{message.text}</div>
                </div>
              ))}
              {loading && <div className="message bot"><span className="message-label">PoshanAI</span><div className="message-content typing-indicator" aria-label="AI is typing"><i /><i /><i /></div></div>}
              {isTranscribing && <div className="voice-processing" role="status">Converting your recording to text...</div>}
            </div>

            <div className="chat-input-area">
              <textarea
                value={input}
                onChange={(event) => {
                  inputLanguageRef.current = null;
                  setInput(event.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type your question..."
                aria-label="Chat message"
                rows={2}
                disabled={isTranscribing}
              />
              <button type="button" onClick={startRecording} className={`voice-btn ${isRecording ? 'recording' : ''}`} aria-label={isRecording ? 'Stop voice recording' : 'Start voice input'} aria-pressed={isRecording} disabled={isTranscribing}>
                <span className="microphone-icon" aria-hidden="true">{isRecording ? '■' : '🎙'}</span>
                <span>{isRecording ? 'Stop' : 'Mic'}</span>
              </button>
              <button type="button" onClick={() => handleSend()} className="send-btn" disabled={loading || isTranscribing || !input.trim()} aria-label="Send message">
                Send <span aria-hidden="true">→</span>
              </button>
            </div>
            {recordingError && <p className="chatbot-error" role="alert">{recordingError}</p>}
          </section>

          <div className="chatbot-features">
            <h3>Start with a question</h3>
            <div className="quick-questions">
              {QUICK_QUESTIONS.map((question) => <button key={question} type="button" onClick={() => handleSend(question)} disabled={loading || isTranscribing}>{question}</button>)}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Chatbot;
