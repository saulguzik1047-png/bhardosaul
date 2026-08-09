import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: false, // 👈 ISSO AQUI MATA O ERRO "SOCKET HANG UP"
        rewrite: (path) => path.replace(/^\/openai/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Remove rastros do navegador para a OpenAI não derrubar
            proxyReq.removeHeader('Origin');
            proxyReq.removeHeader('Referer');
          });
        }
      }
    }
  }
});