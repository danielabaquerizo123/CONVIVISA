import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // El proxy solo aplica al servidor de desarrollo local (vite dev).
  // En producción (vite build / vite preview) NO debe existir: el frontend
  // se comunica directamente con la URL pública HTTPS del backend via VITE_API_URL.
  // vite preview hereda server.proxy por defecto, por eso se desactiva fuera de dev.
  const isDev = mode === 'development';

  return {
    plugins: [react()],
    server: {
      proxy: isDev
        ? {
            '/api': {
              target: 'http://localhost:3000',
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
})
