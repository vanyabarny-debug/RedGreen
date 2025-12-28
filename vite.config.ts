import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // CRITICAL: Ensures assets are loaded relatively (needed for Telegram WebApps/GitHub Pages)
  base: './',
  build: {
    outDir: 'dist',
    target: 'esnext',
    // Improve chunking for better loading performance
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
          'ui': ['@tonconnect/ui-react', 'lucide-react']
        }
      }
    }
  },
  server: {
    host: true
  }
});