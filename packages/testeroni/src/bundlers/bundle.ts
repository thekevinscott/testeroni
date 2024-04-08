import { info, } from '../common/logger.js';
import { isValidESBuildBundleOptions, } from './bundlers/esbuild/types.js';
import { isValidNodeBundleOptions, } from './bundlers/node/types.js';
import { isValidUMDBundleOptions, } from './bundlers/umd/types.js';
import { isValidWebpackBundleOptions, } from './bundlers/webpack/types.js';
import { BUNDLERS, BundleOptions, BundlerName, NameToBundlerMap, } from './types.js';
import type { Bundler, } from './utils/Bundler.js';

export function getBundler<N extends BundlerName>(name: N, outDir: string): NameToBundlerMap[N] {
  return new BUNDLERS[name](outDir) as NameToBundlerMap[N];
};

export async function bundle<N extends BundlerName>(name: N, outDir: string, bundleOptions: BundleOptions): Promise<Bundler> {
  info(`Bundling ${name} to ${outDir}`);
  const bundler = getBundler(name, outDir);
  const start = performance.now();
  checkBundleOptions(name, bundleOptions);
  await bundler.bundle(bundleOptions);
  const duration = ((performance.now() - start) / 1000).toFixed(2);
  info(`Bundled ${name} in ${duration}s`);
  return bundler;
};

function checkBundleOptions<N extends BundlerName>(name: N, bundleOptions: BundleOptions): void {
  if (name === 'esbuild') {
    isValidESBuildBundleOptions(bundleOptions);
  } else if (name === 'webpack') {
    isValidWebpackBundleOptions(bundleOptions);
  } else if (name === 'node') {
    isValidNodeBundleOptions(bundleOptions);
  } else if (name === 'umd') {
    isValidUMDBundleOptions(bundleOptions);
  }
};
