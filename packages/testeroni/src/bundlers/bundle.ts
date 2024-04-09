import { info, } from '../common/logger.js';
import { isValidESBuildBundleOptions, } from './bundlers/esbuild/types.js';
import { isValidNodeBundleOptions, } from './bundlers/node/types.js';
import { isValidUMDBundleOptions, } from './bundlers/umd/types.js';
import { isValidWebpackBundleOptions, } from './bundlers/webpack/types.js';
import { BUNDLERS, BundlerName, NameToBundlerMap, SharedBundleOptions, } from './types.js';
import { Bundler, } from './utils/Bundler.js';

export function getBundler<N extends BundlerName>(name: N, outDir: string): NameToBundlerMap[N] {
  return new BUNDLERS[name](outDir) as NameToBundlerMap[N];
};

export async function bundle<N extends BundlerName>(name: N, outDir: string, bundleOptions: Partial<SharedBundleOptions>): Promise<Bundler> {
  info(`Bundling ${name} to ${outDir}`);
  const bundler = getBundler(name, outDir);
  const start = performance.now();
  if (!checkBundleOptions(name, bundleOptions)) {
    throw new Error('Invalid bundle options');
  }
  await bundler.bundle(bundleOptions);
  const duration = ((performance.now() - start) / 1000).toFixed(2);
  info(`Bundled ${name} in ${duration}s`);
  return bundler;
};

export function checkBundleOptions<N extends BundlerName>(name: N, bundleOptions: Partial<SharedBundleOptions>): boolean {
  switch (name) {
    case BundlerName.esbuild:
      return isValidESBuildBundleOptions(bundleOptions);
    case BundlerName.webpack:
      return isValidWebpackBundleOptions(bundleOptions);
    case BundlerName.node:
      return isValidNodeBundleOptions(bundleOptions);
    case BundlerName.umd:
      return isValidUMDBundleOptions(bundleOptions);
    default:
      return false; // Unknown bundler
  }
}
