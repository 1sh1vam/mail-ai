import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  const email = useAuthStore.getState().user?.email;
  if (!email) return null;

  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, { email });
    const { accessToken, expiresAt } = response.data;

    useAuthStore.getState().setToken(accessToken);
    return accessToken;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        try {
          const newToken = await refreshPromise;
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch {
          // refresh failed, fall through to logout
        }
      } else {
        isRefreshing = true;
        refreshPromise = refreshToken();

        try {
          const newToken = await refreshPromise;
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch {
          // refresh failed
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      }

      // If refresh failed, logout
      useAuthStore.getState().logout();
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

export default api;
