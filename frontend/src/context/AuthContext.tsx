import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface Permission {
  action: string;
  module: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: Permission[];
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  hasPermission: (action: string, module: string) => boolean;
  error: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'consvivisa_auth_token';
const AUTH_USER_KEY = 'consvivisa_auth_user';

const isValidUser = (value: unknown): value is User => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<User>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.firstName === 'string' &&
    typeof candidate.lastName === 'string' &&
    typeof candidate.role === 'string' &&
    Array.isArray(candidate.permissions)
  );
};

const getStoredSession = (): { token: string | null; user: User | null } => {
  const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
  const storedUser = localStorage.getItem(AUTH_USER_KEY);

  if (!storedToken || !storedUser) {
    return { token: null, user: null };
  }

  try {
    const parsedUser = JSON.parse(storedUser);
    if (isValidUser(parsedUser)) {
      return { token: storedToken, user: parsedUser };
    }
  } catch {
    // Sesión corrupta: se limpia abajo para evitar un estado autenticado parcial.
  }

  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  return { token: null, user: null };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [storedSession] = useState(getStoredSession);
  const [token, setToken] = useState<string | null>(storedSession.token);
  const [user, setUser] = useState<User | null>(storedSession.user);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: pass }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al iniciar sesión');
      }

      const data = await response.json();
      if (typeof data.token !== 'string' || !isValidUser(data.user)) {
        throw new Error('Respuesta de autenticación inválida.');
      }

      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  };

  const hasPermission = (action: string, module: string): boolean => {
    if (!user || !Array.isArray(user.permissions)) return false;

    // Buscar si posee el permiso requerido o el comodín ALL en el módulo respectivo
    return user.permissions.some(
      (p) => p.module === module && (p.action === action || p.action === 'ALL')
    );
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: Boolean(token && user),
        login,
        logout,
        hasPermission,
        error,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
