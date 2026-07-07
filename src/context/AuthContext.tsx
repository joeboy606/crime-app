import { createContext, useContext, useState, useEffect, ReactNode, Platform } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '@/services/api';
import { User } from '@/types';

const storage = Platform.OS === 'web' ? {
  getItem: (k: string) => Promise.resolve(localStorage.getItem(k)),
  setItem: (k: string, v: string) => Promise.resolve(localStorage.setItem(k, v)),
  deleteItem: (k: string) => Promise.resolve(localStorage.removeItem(k)),
} : SecureStore;

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStoredAuth(); }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await storage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        const res = await authAPI.me();
        setUser(res.data);
      }
    } catch { await storage.deleteItem('token'); }
    finally { setLoading(false); }
  };

  const login = async (email: string, password: string) => {
    const res = await authAPI.login(email, password);
    await storage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const signup = async (data: any) => {
    const res = await authAPI.signup(data);
    await storage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await storage.deleteItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
