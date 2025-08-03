import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  // Build optimizations
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          charts: ['recharts', 'react-chartjs-2'],
          utils: ['axios', 'dayjs', 'date-fns'],
          pdf: ['jspdf', 'html2canvas', 'html2pdf.js'],
          excel: ['xlsx', 'file-saver'],
          icons: ['lucide-react', 'react-icons'],
          notifications: ['react-hot-toast']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
    // Reduce bundle size
    assetsInlineLimit: 4096
  },
  // Development optimizations
  server: {
    port: 3000,
    host: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      'axios',
      'dayjs',
      'date-fns',
      'lucide-react'
    ],
    exclude: ['jspdf', 'html2canvas', 'xlsx']
  },
  // Performance optimizations
  esbuild: {
    drop: ['console', 'debugger']
  }
})
