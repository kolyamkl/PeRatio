import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    hmr: {
      protocol: 'wss',
      host: 'clinton-runtier-muriel.ngrok-free.dev',
      clientPort: 443
    },
    allowedHosts: ['.loca.lt', '.ngrok-free.dev', '.ngrok.io', '.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
