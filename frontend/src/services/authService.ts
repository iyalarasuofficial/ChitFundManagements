import api from './api';

export const authService = {
  login: (phone: string, password: string) => api.post('/auth/login', { phone, password }),
  signup: (name: string, phone: string, email: string, password: string) =>
    api.post('/auth/signup', { name, phone, email, password }),
};
