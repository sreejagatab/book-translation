import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Translation service API methods
 */
const translationService = {
  /**
   * Start a new translation
   * @param {FormData} formData - Form data with file and translation options
   * @returns {Promise<Object>} - Translation job details
   */
  startTranslation: async (formData) => {
    const response = await api.post('/translations', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Get translation status
   * @param {string} id - Translation ID
   * @returns {Promise<Object>} - Translation status
   */
  getTranslationStatus: async (id) => {
    const response = await api.get(`/translations/${id}`);
    return response.data;
  },

  /**
   * Get all translations for current user
   * @returns {Promise<Array>} - List of translations
   */
  getUserTranslations: async () => {
    const response = await api.get('/translations');
    return response.data;
  },

  /**
   * Cancel a translation
   * @param {string} id - Translation ID
   * @returns {Promise<Object>} - Response data
   */
  cancelTranslation: async (id) => {
    const response = await api.delete(`/translations/${id}/cancel`);
    return response.data;
  },

  /**
   * Delete a translation
   * @param {string} id - Translation ID
   * @returns {Promise<Object>} - Response data
   */
  deleteTranslation: async (id) => {
    const response = await api.delete(`/translations/${id}`);
    return response.data;
  },

  /**
   * Get download URL for a translation
   * @param {string} id - Translation ID
   * @returns {string} - Download URL
   */
  getDownloadUrl: (id) => {
    return `${api.defaults.baseURL}/translations/${id}/download`;
  }
};

/**
 * Authentication service API methods
 */
const authService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - User and token data
   */
  register: async (userData) => {
    const response = await api.post('/users/register', userData);
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  /**
   * Login a user
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} - User and token data
   */
  login: async (credentials) => {
    const response = await api.post('/users/login', credentials);
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  /**
   * Logout current user
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Get current user from localStorage
   * @returns {Object|null} - Current user or null
   */
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} - True if authenticated
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

export { translationService, authService };