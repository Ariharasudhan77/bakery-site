import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Send /api requests to the Node server while developing
    proxy: { '/api': 'http://localhost:3001' },
  },
});
