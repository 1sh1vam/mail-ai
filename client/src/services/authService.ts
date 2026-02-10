import api from './api';
import type { User } from '@/store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const authService = {
  getLoginUrl(): string {
    return `${API_URL}/auth/google`;
  },
  
  async getProfile(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  logout(): void {
    window.location.href = `${API_URL}/auth/logout`;
  },
};

export default authService;
