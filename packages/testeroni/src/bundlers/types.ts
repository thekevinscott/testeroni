import { EsbuildBundler, } from './bundlers/esbuild/EsbuildBundler.js';
import { NodeBundler, } from './bundlers/node/NodeBundler.js';
import { UMDBundler, } from './bundlers/umd/UMDBundler.js';
import { WebpackBundler, } from './bundlers/webpack/WebpackBundler.js';

export const BUNDLERS = {
  esbuild: EsbuildBundler,
  webpack: WebpackBundler,
  node: NodeBundler,
  umd: UMDBundler,
} as const;
export type BundlerName = keyof typeof BUNDLERS;
export type NameToBundlerMap = {
  [K in BundlerName]: InstanceType<typeof BUNDLERS[K]>;
};
export interface BundleOptions {
  workingDir?: string;
  title?: string;
  module?: boolean;
  skipNpmInstall?: boolean;
  keepWorkingFiles?: boolean;
  files: string[];
  type?: 'module' | 'commonjs';
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}
// export type BundleOptions<N extends BundlerName> = Parameters<NameToBundlerMap[N]['bundle']>[0];
