import resolve from '@rollup/plugin-node-resolve';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import pluginJSON from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import packageJson from './package.json' assert { type: 'json' };

const external = Object.keys(packageJson.dependencies);
export default {
  input: './src/index.ts',
  output: [{
    file: packageJson.main,
    sourcemap: true,
    format: 'esm',
  }],
  // output: [
  //   // {
  //   //   file: packageJson.main,
  //   //   format: 'cjs', // commonJS
  //   //   sourcemap: true,
  //   // },
  //   {
  //     // dir: './dist',
  //     file: './dist/index.js',
  //     // inlineDynamicImports: true,
  //     format: 'esm', // ES Modules
  //     // sourcemap: true,
  //   },
  // ],
  external,
  plugins: [
    peerDepsExternal(),
    pluginJSON(),
    resolve({
      preferBuiltins: true,
    }),
    // commonjs(),
    typescript({
      clean: true,
      // useTsconfigDeclarationDir: true,
      // tsconfigOverride: {
      // },
    }),
    commonjs({
      exclude: 'node_modules',
      ignoreGlobal: true,
    }),
  ],
  // external: Object.keys(globals),
};
