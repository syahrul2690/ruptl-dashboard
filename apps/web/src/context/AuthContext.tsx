import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../lib/types';
import { authApi } from '../lib/api';

interface AuthContextType {
  user:    User | null;
  loading: boolean;
  login:   (email: string, password: string) => Promise<void>;
  logout:  () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me()
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setUser(res.data.user);
  };

  const logout = async () => {
    await authApi.logout().catch(() => null);
    setUser(null);
    window.location.href = '/login';
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
