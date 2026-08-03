import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function splitVendorChunk(moduleId) {
  if (!moduleId.includes('node_modules')) return undefined
  if (moduleId.includes('/react/') || moduleId.includes('/react-dom/')) return 'react-runtime'
  if (moduleId.includes('@capacitor')) return 'native-runtime'
  return 'vendor'
}

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: true,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: splitVendorChunk,
      },
    },
  },
})
