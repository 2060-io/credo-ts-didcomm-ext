import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    watch: false,
    testTimeout: 15000,
    coverage: {
      include: ['**/*.{js,jsx,ts,tsx}'],
      exclude: ['/build/', '/node_modules/', '/__tests__/', 'tests', 'coverage', '*.d.ts'],
    },
  },
})
