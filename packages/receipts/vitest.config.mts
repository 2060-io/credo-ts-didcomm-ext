import { defineProject, mergeConfig } from 'vitest/config'

import baseConfig from '../../vitest.config.base'

export default mergeConfig(
  baseConfig,
  defineProject({
    test: {
      name: 'receipts',
      root: __dirname,
      include: ['test/**/*.test.ts'],
    },
  }),
)
