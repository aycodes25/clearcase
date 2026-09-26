import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET } = loadEnv(mode, '.', '')

  if (mode === 'development' && !API_PROXY_TARGET) {
    throw new Error('Set API_PROXY_TARGET in frontend/.env before starting Vite.')
  }

  return {
    plugins: [react()],
    server: {
      proxy: API_PROXY_TARGET
        ? {
            '/api': {
              target: API_PROXY_TARGET,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  }
})
