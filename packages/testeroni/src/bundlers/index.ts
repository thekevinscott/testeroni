export type BundlerName = 'esbuild' | 'webpack' | 'umd' | 'node';
export const isValidBundlerName = (bundlerName: string): bundlerName is BundlerName => {
  return ['esbuild', 'webpack', 'umd', 'node',].includes(bundlerName);
};
export type { Bundler, } from './utils/Bundler.js';
export { EsbuildBundler, } from './bundlers/esbuild/EsbuildBundler.js';
export { NodeBundler, } from './bundlers/node/NodeBundler.js';
export { UMDBundler, } from './bundlers/umd/UMDBundler.js';
export { WebpackBundler, } from './bundlers/webpack/WebpackBundler.js';
export { bundle, } from './bundle.js';
