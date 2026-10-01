import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 8443,
    proxy: {
      '/webhook': {
        target: process.env.VITE_N8N_HOST || 'https://your-n8n-instance.app.n8n.cloud',
        changeOrigin: true,
        secure: true,
      },
      '/webhook-waiting': {
        target: process.env.VITE_N8N_HOST || 'https://your-n8n-instance.app.n8n.cloud',
        changeOrigin: true,
        secure: true,
        timeout: 300000,
      },
    },
  },
})