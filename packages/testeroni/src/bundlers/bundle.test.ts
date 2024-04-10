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

vi.mock('./esbuild/types.js', async () => {
  const actual = await vi.importActual('./esbuild/types.js') as typeof _isValidESBuildBundleOptions;
  return {
    ...actual,
    isValidESBuildBundleOptions: vi.fn(),
  };
});

import { isValidNodeBundleOptions, } from './node/types.js';
import * as _isValidNodeBundleOptions from './node/types.js';

vi.mock('./node/types.js', async () => {
  const actual = await vi.importActual('./node/types.js') as typeof _isValidNodeBundleOptions;
  return {
    ...actual,
    isValidNodeBundleOptions: vi.fn(),
  };
});

import { isValidUMDBundleOptions, } from './umd/types.js';
import * as _isValidUMDBundleOptions from './umd/types.js';

vi.mock('./umd/types.js', async () => {
  const actual = await vi.importActual('./umd/types.js') as typeof _isValidUMDBundleOptions;
  return {
    ...actual,
    isValidUMDBundleOptions: vi.fn(),
  };
});

import { isValidWebpackBundleOptions, } from './webpack/types.js';
import * as _isValidWebpackBundleOptions from './webpack/types.js';

vi.mock('./webpack/types.js', async () => {
  const actual = await vi.importActual('./webpack/types.js') as typeof _isValidWebpackBundleOptions;
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
    (BUNDLERS as any)['esbuild'] = MockESBuildBundler as any;
    expect(getBundler('esbuild', './dist')).toBeInstanceOf(MockESBuildBundler);
  });
});

describe('checkBundleOptions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test.each([
    ['esbuild', isValidESBuildBundleOptions],
    ['webpack', isValidWebpackBundleOptions],
    ['umd', isValidUMDBundleOptions],
    ['node', isValidNodeBundleOptions],
  ])('checks %s options', (name, fn) => {
    const options = {};
    checkBundleOptions(name as any, options)
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
    (BUNDLERS as any)['esbuild'] = MockESBuildBundler as any;
    const options = {};
    await bundle('esbuild', './dist', options);
    expect(spy).toHaveBeenCalledWith(options);
    expect(info).toHaveBeenCalledTimes(2);
  });
});
