import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom')
            ) {
              return 'react-vendor';
            }

            if (
              id.includes('axios') ||
              id.includes('lucide-react') ||
              id.includes('react-hot-toast') ||
              id.includes('framer-motion') ||
              id.includes('zustand')
            ) {
              return 'ui-vendor';
            }

            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
