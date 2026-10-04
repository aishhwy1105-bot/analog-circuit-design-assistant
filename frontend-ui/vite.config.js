/* global process */
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const webhookUrl = env.VITE_SNS_WEBHOOK_URL || 'https://api.agents.snsihub.ai/webhook/429f6f98-b971-4f81-af4f-3ddf454088a9';
  
  let webhookOrigin = 'https://api.agents.snsihub.ai';
  let webhookPath = '/webhook/429f6f98-b971-4f81-af4f-3ddf454088a9';
  try {
    const parsed = new URL(webhookUrl);
    webhookOrigin = parsed.origin;
    webhookPath = parsed.pathname;
  } catch {
    // fallback
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/sns': {
          target: webhookOrigin,
          changeOrigin: true,
          secure: true,
          rewrite: () => webhookPath,
        },
        '/api/ask': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/api/plan': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/api/mouser': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/api/spice': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/api/engineer-circuit': {
          target: 'http://127.0.0.1:5001',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});