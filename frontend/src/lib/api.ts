const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? '';

if (import.meta.env.PROD && !rawApiUrl) {
  console.warn('[CONSVIVISA] VITE_API_URL no está configurada en producción. Se usarán rutas relativas /api, que NO funcionan en Railway. Configura VITE_API_URL en el servicio FRONTEND con la URL pública HTTPS del backend.');
}

export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

export const apiUrl = (path: string): string => {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};
