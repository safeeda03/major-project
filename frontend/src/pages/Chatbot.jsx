import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { chatbotAPI } from '../services/api';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I am PoshanAI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (input.trim()) {
      const newMessage = { sender: 'user', text: input };
      setMessages([...messages, newMessage]);
      const currentInput = input;
      setInput('');
      setLoading(true);

      try {
        const response = await chatbotAPI.sendMessage(currentInput);
        const botResponse = { sender: 'bot', text: response.response || 'I understand your question. Let me help you with that information.' };
        setMessages(prev => [...prev, botResponse]);
      } catch (err) {
        const botResponse = { sender: 'bot', text: 'Sorry, I encountered an error. Please try again.' };
        setMessages(prev => [...prev, botResponse]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVoiceInput = () => {
    setIsListening(true);
    // Voice input will be implemented using Web Speech API
    setTimeout(() => {
      setIsListening(false);
      setInput('What should I feed my 2-year-old child?');
    }, 2000);
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <Sidebar role="worker" />
        <main className="main-content">
          <h2>AI Chatbot</h2>
          <div className="chatbot-container">
            <div className="chat-messages">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.sender}`}>
                  <div className="message-content">{msg.text}</div>
                </div>
              ))}
            </div>
            <div className="chat-input-area">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about child nutrition, vaccination, health..."
              />
              <button onClick={handleVoiceInput} className="voice-btn" disabled={isListening}>
                {isListening ? '🎤 Listening...' : '🎤 Voice'}
              </button>
              <button onClick={handleSend} className="send-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
          <div className="chatbot-features">
            <h3>Quick Questions</h3>
            <div className="quick-questions">
              <button onClick={() => setInput('What are the nutritional requirements for a 3-year-old?')}>
                Nutritional requirements for 3-year-old
              </button>
              <button onClick={() => setInput('When is the next vaccination due?')}>
                Vaccination schedule
              </button>
              <button onClick={() => setInput('What are the signs of malnutrition?')}>
                Signs of malnutrition
              </button>
              <button onClick={() => setInput('How much should my 2-year-old eat daily?')}>
                Daily food intake for 2-year-old
              </button>
              <button onClick={() => setInput('What vaccines are due at 6 months?')}>
                Vaccines at 6 months
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Chatbot;