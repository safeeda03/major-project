// Vite forwards /api requests to the local backend during development.
const API_BASE_URL = '/api';

const request = async (path, options = {}) => {
  let response;
  try {
    const token = localStorage.getItem('token');
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the backend server. Start it with “npm run dev” inside the backend folder.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `The backend request failed (HTTP ${response.status}). Start the backend server and try again.`);
  return data;
};

// Auth API
export const authAPI = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  
  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST'
    });
    return response.json();
  }
};

// Beneficiary API
export const beneficiaryAPI = {
  getAll: () => request('/beneficiaries'),
  getByParent: (parentId) => request(`/beneficiaries/parent/${parentId}`),
  getById: (id) => request(`/beneficiaries/${id}`),
  create: (data) => request('/beneficiaries', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/beneficiaries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/beneficiaries/${id}`, { method: 'DELETE' })
};

// Health API
export const healthAPI = {
  getAll: () => request('/health'),
  create: (data) => request('/health', { method: 'POST', body: JSON.stringify(data) }),
  getByBeneficiary: (id) => request(`/health/beneficiary/${id}`),
  update: (id, data) => request(`/health/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/health/${id}`, { method: 'DELETE' })
};

// Attendance API
export const attendanceAPI = {
  getDaily: (date) => request(`/attendance/daily/${date}`),
  saveDaily: (date, attendance) => request('/attendance/daily', { method: 'PUT', body: JSON.stringify({ date, attendance }) }),
  getAll: () => request('/attendance'),
  create: (data) => request('/attendance', { method: 'POST', body: JSON.stringify(data) }),
  getByBeneficiary: (id) => request(`/attendance/beneficiary/${id}`),
  getByDate: (date) => request(`/attendance/date/${date}`),
  update: (id, data) => request(`/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/attendance/${id}`, { method: 'DELETE' })
};

// Nutrition API
export const nutritionAPI = {
  getAll: () => request('/nutrition'),
  create: (data) => request('/nutrition', { method: 'POST', body: JSON.stringify(data) }),
  getByBeneficiary: (id) => request(`/nutrition/beneficiary/${id}`),
  update: (id, data) => request(`/nutrition/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/nutrition/${id}`, { method: 'DELETE' })
};

// Vaccination API
export const vaccinationAPI = {
  getAll: () => request('/vaccination'),
  create: (data) => request('/vaccination', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/vaccination/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getByBeneficiary: (id) => request(`/vaccination/beneficiary/${id}`),
  getDue: () => request('/vaccination/due/all'),
  getPending: () => request('/vaccination/pending/all'),
  markCompleted: (id) => request(`/vaccination/${id}/complete`, { method: 'PATCH' }),
  markIncomplete: (id) => request(`/vaccination/${id}/undo-complete`, { method: 'PATCH' }),
  delete: (id) => request(`/vaccination/${id}`, { method: 'DELETE' })
};

// Report API
export const reportAPI = {
  generate: (reportType, dateRange, beneficiaryCategory, centreId) => request('/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ reportType, ...dateRange, beneficiaryCategory, centreId })
  }),
  getCentreStatistics: () => request('/reports/statistics/centres'),
  getAlerts: () => request('/reports/alerts'),
  getAlertDetails: (type) => request(`/reports/alerts/${type}`)
};

// OCR uses this API to turn extracted text into a worker-reviewed report.
// The server validates the worker session before either previewing or saving.
export const reportAssistantAPI = {
  preview: (message, language = 'en-IN', draft = null, reportType = null) => request('/reports/assistant/preview', {
    method: 'POST',
    body: JSON.stringify({ message, language, draft, reportType })
  }),
  confirm: (draft) => request('/reports/assistant/confirm', {
    method: 'POST',
    body: JSON.stringify({ draft })
  })
};

// OCR API
export const ocrAPI = {
  processDocument: (file, onProgress = () => {}) => new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('document', file);
    const token = localStorage.getItem('token');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/ocr/process`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Cannot reach the backend server. Start it and try again.'));
    xhr.onload = () => {
      const data = (() => { try { return JSON.parse(xhr.responseText || '{}'); } catch { return {}; } })();
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(data.message || 'OCR processing failed'));
      resolve(data);
    };
    xhr.send(formData);
  }),
  getLatest: (limit = 10, filters = {}) => {
    const query = new URLSearchParams({ limit: String(limit), ...Object.entries(filters).reduce((result, [key, value]) => (value ? { ...result, [key]: value } : result), {}) });
    return request(`/ocr/latest?${query.toString()}`);
  },
  getById: (id) => request(`/ocr/${id}`),
  delete: (id) => request(`/ocr/${id}`, { method: 'DELETE' }),
  retry: (id) => request(`/ocr/${id}/retry`, { method: 'POST' }),
  confirm: (id, review, options) => request(`/ocr/${id}/confirm`, { method: 'POST', body: JSON.stringify({ review, options }) }),
  openOriginal: async (id) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/ocr/${id}/original`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Could not open the original document.');
    }
    return URL.createObjectURL(await response.blob());
  },
};

// Chatbot API
/* Retired local chatbot mock retained only for historical context.
const retiredChatbotMock = {
  sendMessage: async (message) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lowerMessage = message.toLowerCase();
    let response = 'I understand your question. Let me help you with that information.';
    
    if (lowerMessage.includes('nutrition') || lowerMessage.includes('food')) {
      response = 'For children under 2 years, breast milk is the best source of nutrition. A balanced diet should include proteins, carbohydrates, vegetables, and fruits.';
    } else if (lowerMessage.includes('vaccine') || lowerMessage.includes('vaccination')) {
      response = 'BCG vaccine should be given at birth. Polio vaccine is given at birth, 6 weeks, 10 weeks, and 14 weeks. DPT vaccine is given at 6, 10, and 14 weeks.';
    } else if (lowerMessage.includes('health') || lowerMessage.includes('sick')) {
      response = 'If your child has a fever above 100.4°F, consult a healthcare provider. Regular health check-ups are recommended at 1, 2, 3, 4, 5, 6, 9, 12, 15, 18, and 24 months.';
    } else if (lowerMessage.includes('growth') || lowerMessage.includes('weight')) {
      response = 'Normal weight gain for infants is about 150-200g per week in the first 3 months. Children typically double their birth weight by 5 months.';
    }
    
    return {
      response,
      timestamp: new Date(),
      category: 'general'
    };
  }
};
*/

export const chatbotAPI = {
  sendMessage: (message, history = [], language = 'en-IN') => request('/chatbot/message', {
      method: 'POST',
      body: JSON.stringify({ message, history, language }),
    }),

  confirmAction: (draft) => request('/chatbot/confirm', {
    method: 'POST',
    body: JSON.stringify({ draft }),
  }),

  transcribeVoice: async (audioBlob, language = 'en-IN') => {
    const formData = new FormData();
    const extension = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
    formData.append('audio', audioBlob, `poshanai-voice.${extension}`);
    formData.append('language', language);
    const response = await fetch('/api/chatbot/voice', { method: 'POST', body: formData });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Voice recognition is currently unavailable. Please type your question instead.');
    return data;
  }
};

// GIS API
export const gisAPI = {
  getCentres: () => request('/gis/centres'),
  createCentre: (data) => request('/gis/centres', { method: 'POST', body: JSON.stringify(data) }),
  updateCentre: (id, data) => request(`/gis/centres/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  getClustering: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      clusters: [
        {
          id: 1,
          centers: ['Centre A', 'Centre B'],
          riskLevel: 'low',
          coordinates: { lat: 28.6139, lng: 77.2090 }
        },
        {
          id: 2,
          centers: ['Centre C'],
          riskLevel: 'high',
          coordinates: { lat: 28.6170, lng: 77.2080 }
        }
      ]
    };
  }
};
