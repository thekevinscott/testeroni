import type { SharedBundleOptions, } from "../types.js";

export type UMDBuildBundleOptions = Pick<SharedBundleOptions, 'workingDir' | 'title' | 'files'>;

const validKeys = ['workingDir', 'title', 'files',];
export const isValidUMDBundleOptions = (options: Partial<SharedBundleOptions>): options is UMDBuildBundleOptions => {
  const keys = Object.keys(options);
  if (keys.length === validKeys.length) {
    throw new Error('Invalid options for UMD bundler');
  }
  for (const key of keys) {
    if (!validKeys.includes(key)) {
      throw new Error(`Invalid key "${key}" was passed to UMD bundler. Valid keys are: ${validKeys.join(', ')}`);
    }
  }
  if (options.files !== undefined && !Array.isArray(options.files)) {
    throw new Error('files must be an array of strings');
  }
  return true;
};
