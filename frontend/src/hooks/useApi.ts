import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../lib/api';

export const useApi = () => {
  const { token, logout } = useAuth();

  const request = async (path: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(apiUrl(path), { ...options, headers });

    if (response.status === 401) {
      logout();
      throw new Error('Sesión expirada.');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const error: any = new Error(errData.message || 'Error en la petición');
      error.status = response.status;
      throw error;
    }

    // Manejo de descargas de reportes en texto (CSV, HTML)
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('csv') || contentType.includes('html') || contentType.includes('octet-stream'))) {
      return response.text();
    }

    return response.json();
  };

  return { request };
};
