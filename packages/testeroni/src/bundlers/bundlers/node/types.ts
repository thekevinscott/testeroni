import type { BundleOptions, } from "../../types.js";

export type NodeBundleOptions = Pick<BundleOptions, 'workingDir' | 'dependencies' | 'devDependencies' | 'module' | 'skipNpmInstall' | 'keepWorkingFiles'>;
const validKeys = ['workingDir', 'dependencies', 'devDependencies', 'module', 'skipNpmInstall', 'keepWorkingFiles',];
export const isValidNodeBundleOptions = (options: Partial<BundleOptions>): options is NodeBundleOptions => {
  const keys = Object.keys(options);
  if (keys.length === validKeys.length) {
    throw new Error('Invalid options for Node bundler');
  }
  for (const key of keys) {
    if (!validKeys.includes(key)) {
      throw new Error(`Invalid key ${key} for Node bundler`);
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

