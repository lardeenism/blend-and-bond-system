import axios from 'axios';

// Create axios instance with base URL pointing to Vercel (which rewrites to Render backend)
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true,
});

// Interceptor to add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('bb-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle unauthorized responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bb-token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
