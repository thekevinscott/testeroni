import { ESBuildBundleOptions, ESBuildBundler, } from './esbuild/ESBuildBundler.js';
import { NodeBundleOptions, NodeBundler, } from './node/NodeBundler.js';
import { UMDBuildBundleOptions, UMDBundler, } from './umd/UMDBundler.js';
import { WebpackBundleOptions, WebpackBundler, } from './webpack/WebpackBundler.js';

export type BundlerNameString = 'esbuild' | 'webpack' | 'node' | 'umd';
export const VALID_BUNDLER_NAMES = ['esbuild', 'webpack', 'node', 'umd',] as const;
export const isValidBundlerNameString = (name: string): name is BundlerNameString => VALID_BUNDLER_NAMES.includes(name as BundlerNameString);
export const getBundlerNameStringAsBundlerName = (name: BundlerNameString): BundlerName => ({
  esbuild: BundlerName.esbuild,
  webpack: BundlerName.webpack,
  node: BundlerName.node,
  umd: BundlerName.umd,
})[name];
export enum BundlerName {
  esbuild = 'esbuild',
  webpack = 'webpack',
  node = 'node',
  umd = 'umd',
};
export const BUNDLERS = {
  [BundlerName.esbuild]: ESBuildBundler,
  [BundlerName.webpack]: WebpackBundler,
  [BundlerName.node]: NodeBundler,
  [BundlerName.umd]: UMDBundler,
} as const;
export type NameToBundlerMap = {
  [K in BundlerName]: InstanceType<typeof BUNDLERS[K]>;
};
export interface SharedBundleOptions {
  workingDir?: string;
  title?: string;
  module?: boolean;
  skipNpmInstall?: boolean;
  keepWorkingFiles?: boolean;
  files?: string[];
  type?: 'module' | 'commonjs';
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  additionalConfiguration?: Record<string, unknown>;
}

export type BundleOptions<N extends BundlerName> =
  N extends BundlerName.esbuild ? ESBuildBundleOptions :
  N extends BundlerName.webpack ? WebpackBundleOptions :
  N extends BundlerName.umd ? UMDBuildBundleOptions :
  N extends BundlerName.node ? NodeBundleOptions :
  never;
