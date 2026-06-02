import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    environmentMatchGlobs: [
      ['src/lib/**', 'node'],
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/font/local': path.resolve(__dirname, './src/test/mocks/next-font.ts'),
      'next/headers': path.resolve(__dirname, './src/test/mocks/next-headers.ts'),
    },
  },
})
