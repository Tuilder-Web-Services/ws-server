import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  sourcemap: true,
  clean: true,
  format: ['esm'],
  target: 'es2022',
  outDir: 'lib',
  dts: {
    resolve: true,
    compilerOptions: {
      moduleResolution: 'node'
    }
  },
})
