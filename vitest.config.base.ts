import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    testTimeout: 15000,
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['**/*.{js,jsx,ts,tsx}'],
      exclude: ['**/build/**', '**/node_modules/**', '**/__tests__/**', '**/tests/**', '**/__mocks__/**', '**/*.d.ts'],
    },
  },
})
