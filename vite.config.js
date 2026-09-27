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
  define: {
    __GT_COMPLETE_UPGRADE__: JSON.stringify(process.env.GT_COMPLETE_UPGRADE === '1' || (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'upgrade/gt-complete-release-20260927')),
    __GT_COMPACT_PILOT__: JSON.stringify(process.env.VERCEL_ENV !== 'production' && (process.env.GT_COMPLETE_UPGRADE === '1' || process.env.GT_COMPACT_PILOT === '1' || (process.env.VERCEL_ENV === 'preview' && ['feat/compact-two-column-pilot-20260927','upgrade/gt-complete-release-20260927'].includes(process.env.VERCEL_GIT_COMMIT_REF)))),
  },
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
