// Vite forwards /api requests to the local backend during development.
const API_BASE_URL = '/api';

const request = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the backend server. Start it with “npm run dev” inside the backend folder.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `The backend request failed (HTTP ${response.status}). Start the backend server and try again.`);
  return data;
};

// Mock login for testing without database
const mockUsers = {
  '9876543210': { id: 'USR001', name: 'Rajesh Kumar', phone: '9876543210', role: 'worker' },
  '9876543211': { id: 'USR002', name: 'Sunita Devi', phone: '9876543211', role: 'supervisor' },
  '9876543212': { id: 'USR003', name: 'Amit Sharma', phone: '9876543212', role: 'parent' },
  '9876543213': { id: 'USR004', name: 'Admin User', phone: '9876543213', role: 'admin' }
};

// Auth API
export const authAPI = {
  login: async (credentials) => {
    // Mock login for testing without database
    const { phone, password, role } = credentials;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (mockUsers[phone] && password === 'password123' && mockUsers[phone].role === role) {
      return {
        token: 'mock-jwt-token-' + Date.now(),
        user: mockUsers[phone]
      };
    }
    
    throw new Error('Invalid credentials');
  },
  
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
  generate: (reportType, dateRange, beneficiaryCategory) => request('/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ reportType, ...dateRange, beneficiaryCategory })
  }),
  getCentreStatistics: () => request('/reports/statistics/centres'),
  getAlerts: () => request('/reports/alerts'),
  getAlertDetails: (type) => request(`/reports/alerts/${type}`)
};

// OCR API
export const ocrAPI = {
  processDocument: async (file) => {
    const formData = new FormData();
    formData.append('document', file);
    const response = await fetch('/api/ocr/process', { method: 'POST', body: formData });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'OCR processing failed');
    return data;
  }
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
  sendMessage: async (message, history = []) => {
    const response = await fetch('/api/chatbot/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Could not reach the AI assistant');
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
