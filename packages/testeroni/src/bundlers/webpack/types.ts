import type { SharedBundleOptions, } from "../types.js";

export type WebpackBundleOptions = Pick<SharedBundleOptions, 'packageManager' | 'silentPackageInstall' | 'additionalConfiguration' | 'workingDir' | 'type' | 'title' | 'dependencies' | 'devDependencies' | 'module' | 'skipPackageInstall' | 'keepWorkingFiles'>;

const validKeys = ['packageManager', 'silentPackageInstall', 'additionalConfiguration', 'workingDir', 'type', 'title', 'dependencies', 'devDependencies', 'module', 'skipPackageInstall', 'keepWorkingFiles',];
export const isValidWebpackBundleOptions = (options: Partial<SharedBundleOptions>): options is WebpackBundleOptions => {
  const keys = Object.keys(options);
  if (keys.length === validKeys.length) {
    throw new Error('Invalid options for Webpack bundler');
  }
  for (const key of keys) {
    if (!validKeys.includes(key)) {
      throw new Error(`Invalid key "${key}" was passed to Webpack bundler. Valid keys are: ${validKeys.join(', ')}`);
    }
  }
  if (options.dependencies !== undefined && typeof options.dependencies !== 'object') {
    throw new Error('dependencies must be an object');
  }
  if (options.devDependencies !== undefined && typeof options.devDependencies !== 'object') {
    throw new Error('devDependencies must be an object');
  }
  if (options.additionalConfiguration !== undefined && typeof options.additionalConfiguration !== 'object') {
    throw new Error('additionalConfiguration must be an object');
  }
  return true;
};
