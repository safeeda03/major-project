import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API Methods
export const API = {
  // Auth
  auth: {
    login: async (credentials) => {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    },
    logout: async () => {
      const response = await api.post('/auth/logout');
      return response.data;
    },
  },

  // Beneficiaries
  beneficiaries: {
    getAll: async () => {
      const response = await api.get('/beneficiaries');
      return response.data;
    },
    getById: async (id) => {
      const response = await api.get(`/beneficiaries/${id}`);
      return response.data;
    },
    create: async (data) => {
      const response = await api.post('/beneficiaries', data);
      return response.data;
    },
    update: async (id, data) => {
      const response = await api.put(`/beneficiaries/${id}`, data);
      return response.data;
    },
    delete: async (id) => {
      const response = await api.delete(`/beneficiaries/${id}`);
      return response.data;
    },
  },

  // Health
  health: {
    getAll: async () => {
      const response = await api.get('/health');
      return response.data;
    },
    create: async (data) => {
      const response = await api.post('/health', {
        beneficiary_id: data.beneficiary_id || data.beneficiaryId,
        height: Number(data.height),
        weight: Number(data.weight),
        date: data.date,
      });
      return response.data;
    },
    getByBeneficiary: async (beneficiaryId) => {
      const response = await api.get(`/health/beneficiary/${beneficiaryId}`);
      return response.data;
    },
  },

  // Nutrition
  nutrition: {
    getAll: async () => {
      const response = await api.get('/nutrition');
      return response.data;
    },
    create: async (data) => {
      const response = await api.post('/nutrition', {
        beneficiary_id: data.beneficiary_id || data.beneficiaryId,
        nutrition_status: (data.nutrition_status || data.nutritionStatus || '').toLowerCase(),
        meals: data.meals,
        recommendations: data.recommendations,
      });
      return response.data;
    },
  },

  // Vaccination
  vaccination: {
    getAll: async () => {
      const response = await api.get('/vaccination');
      return response.data;
    },
    create: async (data) => {
      const response = await api.post('/vaccination', {
        beneficiary_id: data.beneficiary_id || data.beneficiaryId,
        vaccine: data.vaccine,
        date: data.date,
        next_due_date: data.next_due_date || data.nextDueDate || undefined,
      });
      return response.data;
    },
    getByBeneficiary: async (beneficiaryId) => {
      const response = await api.get(`/vaccination/beneficiary/${beneficiaryId}`);
      return response.data;
    },
  },

  // Attendance
  attendance: {
    getAll: async () => {
      const response = await api.get('/attendance');
      return response.data;
    },
    create: async (data) => {
      const response = await api.post('/attendance', {
        beneficiary_id: data.beneficiary_id || data.beneficiaryId,
        date: data.date,
        status: data.status,
      });
      return response.data;
    },
  },

  // Reports
  reports: {
    generate: async (reportType, dateRange) => {
      const response = await api.post('/reports/generate', { reportType, ...dateRange });
      return response.data;
    },
    getAlerts: async () => {
      const response = await api.get('/reports/alerts');
      return response.data;
    },
  },

  // OCR
  ocr: {
    processDocument: async (file) => {
      const formData = new FormData();
      formData.append('document', file);
      const response = await api.post('/ocr/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
  },

  // Chatbot
  chatbot: {
    sendMessage: async (message) => {
      const response = await api.post('/chatbot/message', { message });
      return response.data;
    },
  },

  // GIS
  gis: {
    getCentres: async () => {
      const response = await api.get('/gis/centres');
      return response.data;
    },
    getClustering: async () => {
      const response = await api.get('/gis/clustering');
      return response.data;
    },
  },
};

export default api;
