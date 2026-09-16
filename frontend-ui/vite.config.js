import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/engineer-circuit': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
      // Retain SNS workbench proxy if defined
      '/api/sns': {
        target: 'https://api.agents.snsihub.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sns/, '/webhook/3a1ce790-aea3-4eb8-be2f-5e33feda711b')
      }
    }
  }
})