import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    // Ensure proper MIME types are set
    middlewareMode: false,
  },
  build: {
    // Ensure proper module handling
    modulePreload: true,
    target: 'esnext',
    sourcemap: true
  }
})