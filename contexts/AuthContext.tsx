'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import api from '@/lib/api';
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
}
interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: 'student' | 'instructor';
  student_id?: string;
  course?: string;
  year?: string;      
  block?: string;     
}
interface LoginResponse {
  user: User;
  token: string;
}
// Define a proper error interface
interface ApiError {
  response?: {
    data?: {
      error?: string;
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
  message?: string;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('access_token');
      const userData = localStorage.getItem('user_data');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
    } finally {
      setLoading(false);
    }
  };
  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password
      });
      const { user: userData, token } = response;
      
      setUser(userData);
      localStorage.setItem('access_token', token);
      localStorage.setItem('user_data', JSON.stringify(userData));
    } catch (error) {
      // Proper TypeScript error handling
      const apiError = error as ApiError;
      let errorMessage = 'Login failed';
      
      if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      } else if (apiError.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      throw new Error(errorMessage);
    }
  };
  const register = async (userData: RegisterData): Promise<void> => {
    try {
      const response = await api.post<LoginResponse>('/api/auth/register', userData);
      
      const { user: newUser, token } = response;
      
      setUser(newUser);
      localStorage.setItem('access_token', token);
      localStorage.setItem('user_data', JSON.stringify(newUser));
    } catch (error) {
      // Proper TypeScript error handling
      const apiError = error as ApiError;
      let errorMessage = 'Registration failed';
      
      if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      } else if (apiError.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      throw new Error(errorMessage);
    }
  };
  const logout = (): void => {
    try {
      // Optional: Call logout endpoint if needed
      api.post('/api/auth/logout', {}).catch(error => {
        console.error('Logout API error:', error);
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
    }
  };
  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
