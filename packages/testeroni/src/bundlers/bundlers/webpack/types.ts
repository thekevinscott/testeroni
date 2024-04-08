import type { BundleOptions, } from "../../types.js";

export type WebpackBuildBundleOptions = Pick<BundleOptions, 'workingDir' | 'type' | 'title' | 'dependencies' | 'devDependencies' | 'module' | 'skipNpmInstall' | 'keepWorkingFiles'>;

const validKeys = ['workingDir', 'type', 'title', 'dependencies', 'devDependencies', 'module', 'skipNpmInstall', 'keepWorkingFiles',];
export const isValidWebpackBundleOptions = (options: Partial<BundleOptions>): options is WebpackBuildBundleOptions => {
  const keys = Object.keys(options);
  if (keys.length === validKeys.length) {
    throw new Error('Invalid options for Webpack bundler');
  }
  for (const key of keys) {
    if (!validKeys.includes(key)) {
      throw new Error(`Invalid key ${key} for Webpack bundler`);
    }
  }
  if (options.dependencies !== undefined && typeof options.dependencies !== 'object') {
    throw new Error('dependencies must be an object');
  }
  if (options.devDependencies !== undefined && typeof options.devDependencies !== 'object') {
    throw new Error('devDependencies must be an object');
  }
  return true;
};
