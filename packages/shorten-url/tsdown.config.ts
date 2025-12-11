import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'build',
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node22',
  tsconfig: './tsconfig.build.json',
})
