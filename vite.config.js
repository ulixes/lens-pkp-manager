import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Buffer } from 'buffer'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.ngrok-free.app', '.ngrok.io']
  },
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
      '@sinclair/typebox/compiler': '@sinclair/typebox',
      '@sinclair/typebox/value': '@sinclair/typebox',
      '@sinclair/typebox/system': '@sinclair/typebox'
    }
  },
  optimizeDeps: {
    include: ['@sinclair/typebox'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
})
