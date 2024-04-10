import type { SharedBundleOptions, } from "../types.js";

export type NodeBundleOptions = Pick<SharedBundleOptions, 'packageManager' | 'silentPackageInstall' | 'workingDir' | 'dependencies' | 'devDependencies' | 'module' | 'skipPackageInstall' | 'keepWorkingFiles'>;
const validKeys = ['packageManager', 'silentPackageInstall', 'workingDir', 'dependencies', 'devDependencies', 'module', 'skipPackageInstall', 'keepWorkingFiles',];
export const isValidNodeBundleOptions = (options: Partial<SharedBundleOptions>): options is NodeBundleOptions => {
  const keys = Object.keys(options);
  if (keys.length === validKeys.length) {
    throw new Error('Invalid options for Node bundler');
  }
  for (const key of keys) {
    if (!validKeys.includes(key)) {
      throw new Error(`Invalid key "${key}" was passed to Node bundler. Valid keys are: ${validKeys.join(', ')}`);
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

