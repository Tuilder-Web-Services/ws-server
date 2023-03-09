import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  sourcemap: true,
  clean: true,
  format: ['cjs', 'esm'],
  outDir: 'lib',
  dts: {
    resolve: true,
    compilerOptions: {
      moduleResolution: 'node'
    }
  },
})
