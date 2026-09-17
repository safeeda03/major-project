import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { chatbotAPI } from '../services/api';

const QUICK_QUESTIONS = [
  'What are the signs of malnutrition?',
  'What vaccines are due at 6 months?',
  'What should I feed a 2-year-old child?',
];

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { id: 'welcome', sender: 'bot', text: 'Hello! I am PoshanAI. Ask me anything, or use voice input to speak your question.' },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const handleSend = async (value = input) => {
    const currentInput = value.trim();
    if (!currentInput || loading) return;

    const newMessage = { id: `${Date.now()}-user`, sender: 'user', text: currentInput };
    const history = messages
      .filter((message) => message.id !== 'welcome')
      .slice(-8)
      .map((message) => ({ role: message.sender === 'bot' ? 'assistant' : 'user', text: message.text }));

    setMessages((current) => [...current, newMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatbotAPI.sendMessage(currentInput, history);
      setMessages((current) => [...current, { id: `${Date.now()}-bot`, sender: 'bot', text: response.response }]);
    } catch (error) {
      setMessages((current) => [...current, { id: `${Date.now()}-error`, sender: 'bot', text: error.message || 'Sorry, I could not reach the assistant.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages((current) => [...current, { id: `${Date.now()}-voice`, sender: 'bot', text: 'Voice input is not supported by this browser. Try Chrome or type your question.' }]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setMessages((current) => [...current, { id: `${Date.now()}-voice-error`, sender: 'bot', text: 'I could not hear that. Check microphone permission and try again.' }]);
    };
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <Sidebar role="worker" />
        <main className="main-content">
          <h2>AI Assistant</h2>
          <div className="chatbot-container">
            <div className="chat-messages" aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.sender}`}>
                  <div className="message-content">{message.text}</div>
                </div>
              ))}
              {loading && <div className="message bot"><div className="message-content">Thinking…</div></div>}
            </div>
            <div className="chat-input-area">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSend()}
                placeholder="Ask a question..."
                aria-label="Chat message"
              />
              <button type="button" onClick={handleVoiceInput} className="voice-btn" aria-pressed={isListening}>
                {isListening ? 'Stop voice' : 'Voice'}
              </button>
              <button type="button" onClick={() => handleSend()} className="send-btn" disabled={loading || !input.trim()}>
                {loading ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
          <div className="chatbot-features">
            <h3>Quick questions</h3>
            <div className="quick-questions">
              {QUICK_QUESTIONS.map((question) => (
                <button key={question} type="button" onClick={() => handleSend(question)} disabled={loading}>{question}</button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Chatbot;
