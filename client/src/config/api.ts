import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const CLOUD_SERVER_URL = 'https://product-project-wmc4.onrender.com/api/v1';

export const getBaseURL = () => {
  return localStorage.getItem('custom_server_url') || (import.meta as any).env?.VITE_API_URL || CLOUD_SERVER_URL;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 90000, // 90s timeout for Render free tier cold starts
  headers: {
    'Content-Type': 'application/json'
  }
});

// Update baseURL on every request in case user changed server URL in settings
api.interceptors.request.use(
  (config) => {
    config.baseURL = getBaseURL();
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle token refresh & auto-retry network errors
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry once if network error occurs (Render cold start handling)
    if ((error.message === 'Network Error' || error.code === 'ERR_NETWORK') && !originalRequest._networkRetry) {
      originalRequest._networkRetry = true;
      console.warn('Network error encountered. Server may be cold-starting. Retrying in 2 seconds...');
      await new Promise(res => setTimeout(res, 2000));
      return api(originalRequest);
    }

    // Avoid loops on login or retry failures
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const apiUrl = (import.meta as any).env?.VITE_API_URL || CLOUD_SERVER_URL;
        const refreshResponse = await axios.post(`${apiUrl}/auth/refresh-token`, {});
        const { accessToken } = refreshResponse.data.data;

        // Update state
        const user = useAuthStore.getState().user;
        if (user) {
          useAuthStore.getState().setAuth(user, accessToken);
        }

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Log out user
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const pingServer = async () => {
  try {
    const apiUrl = (import.meta as any).env?.VITE_API_URL || CLOUD_SERVER_URL;
    await axios.get(`${apiUrl}/health`, { timeout: 25000 });
    console.log('⚡ Server pre-warmup ping successful');
    return true;
  } catch (e) {
    console.warn('Server pre-warmup ping failed/delayed', e);
    return false;
  }
};

export default api;
