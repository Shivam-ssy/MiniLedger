import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api, setOnUnauthorizedCallback, getApiErrorMessage } from '../services/api.service';
import { saveToken, getToken, removeToken } from '../services/storage.service';

export interface User {
  id: string;
  phone: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  requestOtp: (phone: string) => Promise<{ success: boolean; error?: string; retryAfter?: number }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    await removeToken();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorizedCallback(logout);
  }, [logout]);

  // Check stored token and restore session on app launch
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await getToken();
        if (storedToken) {
          setToken(storedToken);
          // Verify with /auth/me
          const res = await api.get<{ user: User }>('/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          setUser(res.data.user);
        }
      } catch {
        await removeToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const requestOtp = async (phone: string): Promise<{ success: boolean; error?: string; retryAfter?: number }> => {
    try {
      await api.post('/auth/request-otp', { phone });
      return { success: true };
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      let retryAfter: number | undefined;

      // Extract retryAfter from details if 429
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { error?: { details?: { retryAfter?: number } } } } }).response;
        retryAfter = response?.data?.error?.details?.retryAfter;
      }

      return { success: false, error: message, retryAfter };
    }
  };

  const verifyOtp = async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.post<{ accessToken: string; user: User }>('/auth/verify-otp', {
        phone,
        otp,
      });
      const receivedToken = res.data.accessToken;
      const receivedUser = res.data.user;

      await saveToken(receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getApiErrorMessage(err) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        requestOtp,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
