import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { chatbotAPI, reportAssistantAPI } from '../services/api';

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
const CHAT_STORAGE_PREFIX = 'poshanai-chat-history:';

const createChat = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: 'New chat',
  messages: [welcomeMessage],
  updatedAt: Date.now(),
});

const Chatbot = () => {
  const { user } = useAuth();
  const userKey = user?.id || user?._id || user?.user_id || user?.email || 'guest';
  const storageKey = `${CHAT_STORAGE_PREFIX}${userKey}`;
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('en-IN');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [pendingReport, setPendingReport] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const messagesRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechRecognitionRef = useRef(null);
  const lastSpeechTranscriptRef = useRef('');
  const fallbackTranscriptRef = useRef('');
  const inputLanguageRef = useRef(null);
  const hydratedKeyRef = useRef('');
  const hydratedPendingKeyRef = useRef('');

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const messages = activeChat?.messages || [welcomeMessage];
  const pendingReportStorageKey = activeChatId ? `${storageKey}:pending-report:${activeChatId}` : '';

  useEffect(() => {
    let savedChats = [];
    try {
      savedChats = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      savedChats = [];
    }
    const nextChats = Array.isArray(savedChats) && savedChats.length ? savedChats : [createChat()];
    setChats(nextChats);
    setActiveChatId(nextChats[0].id);
    hydratedKeyRef.current = storageKey;
  }, [storageKey]);

  useEffect(() => {
    if (hydratedKeyRef.current !== storageKey || !chats.length) return;
    localStorage.setItem(storageKey, JSON.stringify(chats));
  }, [chats, storageKey]);

  useEffect(() => {
    if (!pendingReportStorageKey) return;
    try {
      const savedDraft = JSON.parse(localStorage.getItem(pendingReportStorageKey) || 'null');
      setPendingReport(savedDraft);
      hydratedPendingKeyRef.current = pendingReportStorageKey;
    } catch {
      setPendingReport(null);
      hydratedPendingKeyRef.current = pendingReportStorageKey;
    }
  }, [pendingReportStorageKey]);

  useEffect(() => {
    if (!pendingReportStorageKey || hydratedPendingKeyRef.current !== pendingReportStorageKey) return;
    if (pendingReport) localStorage.setItem(pendingReportStorageKey, JSON.stringify(pendingReport));
    else localStorage.removeItem(pendingReportStorageKey);
  }, [pendingReport, pendingReportStorageKey]);

  useEffect(() => () => {
    mediaRecorderRef.current?.stop();
    speechRecognitionRef.current?.stop();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, loading, isTranscribing]);

  const updateActiveChat = (updater) => {
    setChats((current) => current.map((chat) => chat.id === activeChatId ? updater(chat) : chat));
  };

  const updateMessages = (updater) => {
    updateActiveChat((chat) => ({
      ...chat,
      messages: typeof updater === 'function' ? updater(chat.messages) : updater,
      updatedAt: Date.now(),
    }));
  };

  const addNotice = (text) => updateMessages((current) => [...current, { id: `${Date.now()}-notice`, sender: 'notice', text }]);

  const appendUserMessage = (text) => updateActiveChat((chat) => ({
    ...chat,
    title: chat.title === 'New chat' ? text.slice(0, 42) : chat.title,
    messages: [...chat.messages, { id: `${Date.now()}-user`, sender: 'user', text }],
    updatedAt: Date.now(),
  }));

  const formatReportPreview = (preview) => {
    const labels = {
      reportType: 'Report type',
      beneficiary_name: 'Child',
      age: 'Age',
      weight: 'Weight',
      height: 'Height',
      bmi: 'BMI',
      nutrition_status: 'Nutrition status',
      vaccine: 'Vaccine',
      beneficiaries_served: 'Children served',
      date: 'Date',
      details: 'Details',
    };
    return Object.entries(preview || {})
      .filter(([key, value]) => key !== 'beneficiary_id' && value !== '' && value !== null && value !== undefined)
      .map(([key, value]) => `${labels[key] || key}: ${Array.isArray(value) ? value.map((row) => `${row.name || row.beneficiary_name || row.beneficiary_id || 'Child'}${row.status ? `: ${row.status}` : ''}`).join(', ') : value}`)
      .join('\n');
  };

  const reportResponseText = (result) => {
    const previewText = result.preview ? `\n\n${formatReportPreview(result.preview)}` : '';
    const missingText = result.missing?.length ? `\n\nMissing: ${result.missing.join(', ')}` : '';
    return `${result.assistantText || 'Report details updated.'}${missingText}${previewText}`;
  };

  const handleSend = async (value = input) => {
    const currentInput = value.trim();
    if (!currentInput || loading || isTranscribing) return;

    const responseLanguage = inputLanguageRef.current || getTextLanguage(currentInput);
    inputLanguageRef.current = null;
    const history = messages
      .filter((message) => message.id !== 'welcome' && message.sender !== 'notice')
      .slice(-8)
      .map((message) => ({ role: message.sender === 'bot' ? 'assistant' : 'user', text: message.text }));
    appendUserMessage(currentInput);
    setInput('');
    setLoading(true);

    try {
      const normalized = currentInput.toLowerCase();
      const cancelRequest = /\b(cancel|discard|stop)\b/.test(normalized) || /[\u0D00-\u0D7F]/.test(currentInput) && /(റദ്ദാക്ക|നിർത്തുക)/.test(currentInput);
      const confirmRequest = /\b(yes|confirm|save|submit|ok)\b/.test(normalized) || /[\u0D00-\u0D7F]/.test(currentInput) && /(അതെ|ശരി|സംരക്ഷ)/.test(currentInput);
      const reuseDetailsRequest = /\b(same|above|previous|earlier|repeat)\b/.test(normalized)
        || /[\u0D00-\u0D7F]/.test(currentInput) && /(മുകളിൽ|മുമ്പത്തെ|അതേ വിവരങ്ങൾ|വീണ്ടും)/.test(currentInput);

      const response = await chatbotAPI.sendMessage(currentInput, history, responseLanguage);
      if (response.action === 'confirm') setPendingAction(response.draft);
      updateMessages((current) => [...current, { id: `${Date.now()}-bot`, sender: 'bot', text: response.response }]);
    } catch (error) {
      addNotice(error.message || 'The AI assistant is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction || loading) return;
    setLoading(true);
    try {
      const response = await chatbotAPI.confirmAction(pendingAction);
      setPendingAction(null);
      updateMessages((current) => [...current, { id: `${Date.now()}-bot`, sender: 'bot', text: response.response || 'Action completed successfully.' }]);
    } catch (error) {
      addNotice(error.message || 'Unable to complete the action right now.');
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
    updateActiveChat((chat) => ({ ...chat, title: 'New chat', messages: [welcomeMessage], updatedAt: Date.now() }));
    setInput('');
    setRecordingError('');
    setPendingReport(null);
    setPendingAction(null);
  };

  const createNewChat = () => {
    if (isRecording) stopRecording();
    const nextChat = createChat();
    setChats((current) => [nextChat, ...current]);
    setActiveChatId(nextChat.id);
    setInput('');
    setRecordingError('');
    setPendingReport(null);
    setPendingAction(null);
  };

  const deleteChat = (chatId) => {
    setChats((current) => {
      const remaining = current.filter((chat) => chat.id !== chatId);
      const nextChats = remaining.length ? remaining : [createChat()];
      if (chatId === activeChatId) setActiveChatId(nextChats[0].id);
      if (chatId === activeChatId) setPendingReport(null);
      return nextChats;
    });
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

          <section className="chatbot-workspace" aria-label="PoshanAI chat">
            <aside className="chat-history" aria-label="Chat history">
              <div className="chat-history-heading">
                <strong>Chat history</strong>
                <button type="button" onClick={createNewChat} aria-label="Start a new chat">+ New chat</button>
              </div>
              <div className="chat-history-list">
                {chats.slice().sort((a, b) => b.updatedAt - a.updatedAt).map((chat) => (
                  <div key={chat.id} className={`chat-history-item ${chat.id === activeChatId ? 'active' : ''}`}>
                    <button type="button" className="chat-history-select" onClick={() => setActiveChatId(chat.id)}>{chat.title}</button>
                    <button type="button" className="chat-history-delete" onClick={() => deleteChat(chat.id)} aria-label={`Delete ${chat.title}`} title="Delete chat">×</button>
                  </div>
                ))}
              </div>
            </aside>
            <div className="chatbot-container">
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

            {pendingAction && (
              <div className="chat-action-confirmation" role="group" aria-label="Confirm assistant action">
                <button type="button" className="send-btn" onClick={confirmAction} disabled={loading}>Confirm</button>
                <button type="button" className="voice-btn" onClick={() => setPendingAction(null)} disabled={loading}>Cancel</button>
              </div>
            )}

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
            </div>
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
