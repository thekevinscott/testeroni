import { vi, describe, expect, test, afterEach } from 'vitest';

import { info, } from '../common/logger.js';
import * as _logger from '../common/logger.js';

vi.mock('../common/logger.js', async () => {
  const actual = await vi.importActual('../common/logger.js') as typeof _logger;
  return {
    ...actual,
    info: vi.fn(),
  };
});

import { isValidESBuildBundleOptions, } from './esbuild/types.js';
import * as _isValidESBuildBundleOptions from './esbuild/types.js';

vi.mock('./bundlers/esbuild/types.js', async () => {
  const actual = await vi.importActual('./bundlers/esbuild/types.js') as typeof _isValidESBuildBundleOptions;
  return {
    ...actual,
    isValidESBuildBundleOptions: vi.fn(),
  };
});

import { isValidNodeBundleOptions, } from './node/types.js';
import * as _isValidNodeBundleOptions from './node/types.js';

vi.mock('./bundlers/node/types.js', async () => {
  const actual = await vi.importActual('./bundlers/node/types.js') as typeof _isValidNodeBundleOptions;
  return {
    ...actual,
    isValidNodeBundleOptions: vi.fn(),
  };
});

import { isValidUMDBundleOptions, } from './umd/types.js';
import * as _isValidUMDBundleOptions from './umd/types.js';

vi.mock('./bundlers/umd/types.js', async () => {
  const actual = await vi.importActual('./bundlers/umd/types.js') as typeof _isValidUMDBundleOptions;
  return {
    ...actual,
    isValidUMDBundleOptions: vi.fn(),
  };
});

import { isValidWebpackBundleOptions, } from './webpack/types.js';
import * as _isValidWebpackBundleOptions from './webpack/types.js';

vi.mock('./bundlers/webpack/types.js', async () => {
  const actual = await vi.importActual('./bundlers/webpack/types.js') as typeof _isValidWebpackBundleOptions;
  return {
    ...actual,
    isValidWebpackBundleOptions: vi.fn(),
  };
});


import { BUNDLERS, BundlerName, } from './types.js';
import * as _types from './types.js';
import { bundle, checkBundleOptions, getBundler } from './bundle.js';

vi.mock('./types.js', async () => {
  const actual = await vi.importActual('./types.js') as typeof _types;
  return {
    ...actual,
    BUNDLERS: {},
  };
});

describe('getBundler', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('it gets bundler', () => {
    class MockESBuildBundler {
      constructor(public outDir: string) { }
    }
    (BUNDLERS as any)[BundlerName.esbuild] = MockESBuildBundler as any;
    expect(getBundler(BundlerName.esbuild, './dist')).toBeInstanceOf(MockESBuildBundler);
  });
});

describe('checkBundleOptions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test.each([
    [BundlerName.esbuild, isValidESBuildBundleOptions],
    [BundlerName.webpack, isValidWebpackBundleOptions],
    [BundlerName.umd, isValidUMDBundleOptions],
    [BundlerName.node, isValidNodeBundleOptions],
  ])('checks %s options', (name, fn) => {
    const options = {};
    checkBundleOptions(name, options)
    expect(fn).toHaveBeenCalledWith(options);
  });
});

describe('bundle', () => {
  test('it bundles', async () => {
    vi.mocked(isValidESBuildBundleOptions).mockReturnValue(true);
    const spy = vi.fn();
    class MockESBuildBundler {
      constructor(public outDir: string) { }
      bundle = spy;
    }
    (BUNDLERS as any)[BundlerName.esbuild] = MockESBuildBundler as any;
    const options = {};
    await bundle(BundlerName.esbuild, './dist', options);
    expect(spy).toHaveBeenCalledWith(options);
    expect(info).toHaveBeenCalledTimes(2);
  });
});
