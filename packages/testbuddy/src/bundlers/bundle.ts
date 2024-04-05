import { info } from '../common/logger.js';
import { EsbuildBundler, } from './bundlers/esbuild/EsbuildBundler.js';
import { NodeBundler, } from './bundlers/node/NodeBundler.js';
import { UMDBundler, } from './bundlers/umd/UMDBundler.js';
import { WebpackBundler, } from './bundlers/webpack/WebpackBundler.js';
import type { Bundler, } from './utils/Bundler.js';

const BUNDLERS = {
  esbuild: EsbuildBundler,
  webpack: WebpackBundler,
  node: NodeBundler,
  umd: UMDBundler,
} as const;
type BundlerName = keyof typeof BUNDLERS;
type NameToBundlerMap = {
  [K in BundlerName]: InstanceType<typeof BUNDLERS[K]>;
};

export function getBundler<N extends BundlerName>(name: N, outDir: string): NameToBundlerMap[N] {
  return new BUNDLERS[name](outDir) as NameToBundlerMap[N];
};


type BundleOptions<N extends BundlerName> = Parameters<NameToBundlerMap[N]['bundle']>[0];

export async function bundle<N extends BundlerName>(name: N, outDir: string, bundleOptions: BundleOptions<N>): Promise<Bundler> {
  info(`Bundling ${name}`);
  const bundler = getBundler(name, outDir) as NameToBundlerMap[N];
  const start = performance.now();
  await bundler.bundle(bundleOptions as any);
  const duration = ((performance.now() - start) / 1000).toFixed(2);
  info(`Bundled ${name} in ${duration}s`);
  return bundler;
};
