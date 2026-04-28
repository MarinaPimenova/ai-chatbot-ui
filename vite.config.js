import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/ai-chatbot-ui',
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8091', // Your Spring Boot backend
        changeOrigin: true,
      }
    }
  }


})
