import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
  external: [
    '@angular/core',
    '@angular/common',
    '@angular/common/http',
    '@angular/router',
    '@angular-architects/native-federation',
    'rxjs',
    'rxjs/operators',
  ],
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.mjs' };
  },
});
