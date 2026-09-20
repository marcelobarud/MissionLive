import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const envDir = resolve(__dirname, '../..');
  const env = loadEnv(mode, envDir, '');
  const apiProxyTarget = env.API_PROXY_TARGET || 'http://127.0.0.1:3000';
  const devPort = Number(env.VITE_DEV_PORT || 5173);
  return {
    envDir,
    plugins: [react()],
    server: {
      host: env.VITE_DEV_HOST || '127.0.0.1',
      port: Number.isInteger(devPort) && devPort > 0 ? devPort : 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
