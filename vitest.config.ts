import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ is Playwright's — its *.spec.ts files need a real browser and a
    // running app, and vitest's default include pattern would otherwise
    // try to run them.
    exclude: ['**/node_modules/**', 'e2e/**'],
    environmentMatchGlobs: [
      ['src/lib/**', 'node'],
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/font/local': path.resolve(__dirname, './src/test/mocks/next-font.ts'),
      'next/font/google': path.resolve(__dirname, './src/test/mocks/next-font-google.ts'),
      'next/headers': path.resolve(__dirname, './src/test/mocks/next-headers.ts'),
    },
  },
})
