import { defineProject, mergeConfig } from 'vitest/config'

import baseConfig from '../../vitest.config.base'

export default mergeConfig(
  baseConfig,
  defineProject({
    test: {
      name: 'shorten-url',
      root: __dirname,
      include: ['tests/**/*.test.ts'],
    },
  }),
)
