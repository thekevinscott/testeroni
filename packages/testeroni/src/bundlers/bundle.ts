import { info, } from '../common/logger.js';
import { isValidESBuildBundleOptions, } from './esbuild/types.js';
import { isValidNodeBundleOptions, } from './node/types.js';
import { isValidUMDBundleOptions, } from './umd/types.js';
import { isValidWebpackBundleOptions, } from './webpack/types.js';
import {
  BUNDLERS,
  BundlerName,
  NameToBundlerMap,
  SharedBundleOptions,
  VALID_BUNDLER_NAMES,
  isValidBundlerName,
} from './types.js';
import { Bundler, } from './utils/Bundler.js';

export function getBundler<N extends BundlerName>(name: N, outDir: string): NameToBundlerMap[N] {
  return new BUNDLERS[name](outDir) as NameToBundlerMap[N];
};

export async function bundle(name: string, outDir: string, bundleOptions: Partial<SharedBundleOptions> = {}): Promise<Bundler> {
  if (!isValidBundlerName(name)) {
    throw new Error(`Invalid bundler name: ${JSON.stringify(name)}, expected one of ${VALID_BUNDLER_NAMES.join(', ')}`);
  }

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
    case 'esbuild':
      return isValidESBuildBundleOptions(bundleOptions);
    case 'webpack':
      return isValidWebpackBundleOptions(bundleOptions);
    case 'node':
      return isValidNodeBundleOptions(bundleOptions);
    case 'umd':
      return isValidUMDBundleOptions(bundleOptions);
    default:
      return false; // Unknown bundler
  }
}
