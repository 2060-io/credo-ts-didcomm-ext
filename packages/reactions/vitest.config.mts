import { defineProject, mergeConfig } from 'vitest/config'

import baseConfig from '../../vitest.config.base'

export default mergeConfig(
  baseConfig,
  defineProject({
    test: {
      name: 'reactions',
      root: __dirname,
      include: ['test/**/*.test.ts'],
    },
  }),
)
