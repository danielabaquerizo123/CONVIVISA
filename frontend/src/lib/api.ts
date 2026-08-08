const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? '';

export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

export const apiUrl = (path: string): string => {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};
