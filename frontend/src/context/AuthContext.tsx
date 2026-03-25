import  { createContext, useState }from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/api';
import api from '../services/api';
import { getClientErrorMessage } from '../utils/error';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  signup: (name: string, phone: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clearStoredAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const isTokenValid = (token: string): boolean => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return false;

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(base64);
    const payload = JSON.parse(payloadJson) as { exp?: number };

    if (!payload.exp) return false;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp > nowInSeconds;
  } catch {
    return false;
  }
};

const getInitialAuthState = (): { token: string | null; user: User | null } => {
  try {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!savedToken || !savedUser || !isTokenValid(savedToken)) {
      clearStoredAuth();
      return { token: null, user: null };
    }

    return { token: savedToken, user: JSON.parse(savedUser) as User };
  } catch {
    clearStoredAuth();
    return { token: null, user: null };
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const initialAuth = getInitialAuthState();
  const [user, setUser] = useState<User | null>(initialAuth.user);
  const [token, setToken] = useState<string | null>(initialAuth.token);
  const [isLoading] = useState(false);

  const login = async (phone: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { phone, password });
      const { token: newToken, user: newUser } = response.data;
      
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error: any) {
      throw new Error(getClientErrorMessage(error, 'Unable to log in. Please try again.'));
    }
  };

  const signup = async (name: string, phone: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/signup', {
        name,
        phone,
        email,
        password,
      });
      const { token: newToken, user: newUser } = response.data;
      
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error: any) {
      throw new Error(getClientErrorMessage(error, 'Unable to create account. Please try again.'));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    clearStoredAuth();
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
