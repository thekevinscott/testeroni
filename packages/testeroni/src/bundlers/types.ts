import { PackageManager, } from '../common/npm.js';
import { ESBuildBundleOptions, ESBuildBundler, } from './esbuild/ESBuildBundler.js';
import { NodeBundleOptions, NodeBundler, } from './node/NodeBundler.js';
import { UMDBuildBundleOptions, UMDBundler, } from './umd/UMDBundler.js';
import { WebpackBundleOptions, WebpackBundler, } from './webpack/WebpackBundler.js';

export type BundlerName = 'esbuild' | 'webpack' | 'node' | 'umd';
export const VALID_BUNDLER_NAMES = ['esbuild', 'webpack', 'node', 'umd',] as const;
export const isValidBundlerName = (name: string): name is BundlerName => VALID_BUNDLER_NAMES.includes(name as BundlerName);
export const BUNDLERS = {
  ['esbuild']: ESBuildBundler,
  ['webpack']: WebpackBundler,
  ['node']: NodeBundler,
  ['umd']: UMDBundler,
} as const;
export type NameToBundlerMap = {
  [K in BundlerName]: InstanceType<typeof BUNDLERS[K]>;
};
export interface SharedBundleOptions {
  workingDir?: string;
  title?: string;
  module?: boolean;
  skipPackageInstall?: boolean;
  keepWorkingFiles?: boolean;
  files?: string[];
  type?: 'module' | 'commonjs';
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  additionalConfiguration?: Record<string, unknown>;
  silentPackageInstall?: boolean;
  packageManager?: PackageManager;
}

export type BundleOptions<N extends BundlerName = BundlerName> =
  N extends 'esbuild' ? ESBuildBundleOptions :
  N extends 'webpack' ? WebpackBundleOptions :
  N extends 'umd' ? UMDBuildBundleOptions :
  N extends 'node' ? NodeBundleOptions :
  never;
