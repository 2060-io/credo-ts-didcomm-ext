import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    testTimeout: 15000,
    pool: 'threads',
    projects: ['./packages/*/vitest.config.mts'],
    coverage: {
      include: ['**/*.{js,jsx,ts,tsx}'],
      exclude: ['/build/', '/node_modules/', '/__tests__/', 'tests', 'coverage', '*.d.ts'],
    },
  },
})
