import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  mustChangePassword?: boolean;
  institutionId?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('token').then(async (t) => {
      if (t) {
        setToken(t);
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch {
          await AsyncStorage.removeItem('token');
        }
      }
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/mobile/login', { email, password });
    const { token: t, user: u } = res.data;
    await AsyncStorage.setItem('token', t);
    await AsyncStorage.setItem('hasLoggedIn', 'true');
    setToken(t);
    setUser(u);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
