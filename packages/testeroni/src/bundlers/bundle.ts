import { info, } from '../common/logger.js';
import { BUNDLERS, BundleOptions, BundlerName, NameToBundlerMap, } from './types.js';
import type { Bundler, } from './utils/Bundler.js';

export function getBundler<N extends BundlerName>(name: N, outDir: string): NameToBundlerMap[N] {
  return new BUNDLERS[name](outDir) as NameToBundlerMap[N];
};

export async function bundle<N extends BundlerName>(name: N, outDir: string, bundleOptions: BundleOptions): Promise<Bundler> {
  info(`Bundling ${name} to ${outDir}`);
  const bundler = getBundler(name, outDir);
  const start = performance.now();
  await bundler.bundle(bundleOptions);
  const duration = ((performance.now() - start) / 1000).toFixed(2);
  info(`Bundled ${name} in ${duration}s`);
  return bundler;
};
