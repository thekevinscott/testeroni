import type { BundleOptions, } from "../../types.js";

export type UMDBuildBundleOptions = Pick<BundleOptions, 'workingDir' | 'title' | 'files'>;

const validKeys = ['workingDir', 'title', 'files',];
export const isValidUMDBundleOptions = (options: Partial<BundleOptions>): options is UMDBuildBundleOptions => {
  const keys = Object.keys(options);
  if (keys.length === validKeys.length) {
    throw new Error('Invalid options for UMD bundler');
  }
  for (const key of keys) {
    if (!validKeys.includes(key)) {
      throw new Error(`Invalid key ${key} for UMD bundler`);
    }
  }
  if (options.files !== undefined && !Array.isArray(options.files)) {
    throw new Error('files must be an array of strings');
  }
  return true;
};
