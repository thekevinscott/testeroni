import { afterEach, vi } from 'vitest';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  setLogLevel,
  bundle,
} from 'testeroni';

setLogLevel('error');

import { withWorkingDir, } from '../../utils/with-working-dir.js';
import * as _withWorkingDir from '../../utils/with-working-dir.js';
import { writeFile, } from '../../../common/fs.js';
import * as _fs from '../../../common/fs.js';
import { DEFAULT_DEV_DEPENDENCIES, ESBuildBundler, NAME } from './ESBuildBundler.js';
import * as _pnpmInstall from '../../../common/npm.js';
import { pnpmInstall, } from '../../../common/npm.js';
import { writePackageJSON, } from '../../utils/write-package-json.js';
import * as _writePackageJSON from '../../utils/write-package-json.js';
import { writeIndexJS, } from '../../utils/write-index-js.js';
import * as _writeIndexJS from '../../utils/write-index-js.js';
import { build as esbuild, } from 'esbuild';
import * as _esbuild from 'esbuild';
import { info, } from '../../../common/logger.js';
import * as _logger from '../../../common/logger.js';

vi.mock("../../../common/logger.js", async () => {
  const actual = await vi.importActual("../../../common/logger.js") as typeof _logger;
  return {
    ...actual,
    info: vi.fn(),
  };
});

vi.mock("esbuild", async () => {
  const actual = await vi.importActual("esbuild") as typeof _esbuild;
  return {
    ...actual,
    build: vi.fn(),
  };
});

vi.mock("../../utils/with-working-dir.js", async () => {
  const actual = await vi.importActual("../../utils/with-working-dir.js") as typeof _withWorkingDir;
  const withWorkingDirFn: typeof withWorkingDir = vi.fn().mockImplementation(async (cb, workingDir = '/tmp/folder/not/set') => {
    await cb(workingDir);
  });
  return {
    ...actual,
    withWorkingDir: withWorkingDirFn
  };
});

vi.mock("../../../common/fs.js", async () => {
  const actual = await vi.importActual("../../../common/fs.js") as typeof _fs;
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

vi.mock("../../../common/npm.js", async () => {
  const actual = await vi.importActual("../../../common/npm.js") as typeof _pnpmInstall;
  return {
    ...actual,
    pnpmInstall: vi.fn(),
  };
});

vi.mock("../../utils/write-package-json.js", async () => {
  const actual = await vi.importActual("../../utils/write-package-json.js") as typeof _writePackageJSON;
  return {
    ...actual,
    writePackageJSON: vi.fn(),
  };
});
vi.mock("../../utils/write-index-js.js", async () => {
  const actual = await vi.importActual("../../utils/write-index-js.js") as typeof _writeIndexJS;
  return {
    ...actual,
    writeIndexJS: vi.fn(),
  };
});

describe('ESBuildBundler', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('it instantiates', () => {
    const bundler = new ESBuildBundler('./dist');
    expect(bundler.name).toBe(NAME);
  });

  test('logs various stuff', async () => {
    const bundler = new ESBuildBundler('./dist');
    await bundler.bundle({
      workingDir: '/tmp2'
    });

    expect(info).toHaveBeenCalledTimes(5);
  });

  test('passes working dir if provided', async () => {
    const bundler = new ESBuildBundler('./dist');
    await bundler.bundle({
      workingDir: '/tmp2'
    });

    expect(withWorkingDir).toHaveBeenCalledWith(expect.any(Function), '/tmp2');
  });

  test('passes undefined working dir if not provided', async () => {
    const bundler = new ESBuildBundler('./dist');
    await bundler.bundle({
    });

    expect(withWorkingDir).toHaveBeenCalledWith(expect.any(Function), undefined);
  });

  test('calls writePackageJSON with correct working dir', async () => {
    const bundler = new ESBuildBundler('./dist');
    await bundler.bundle({
      workingDir: '/tmp2'
    });

    expect(writePackageJSON).toHaveBeenCalledWith(expect.any(Function), '/tmp2/package.json', {
      type: 'module',
      dependencies: {},
      devDependencies: {
        ...DEFAULT_DEV_DEPENDENCIES,
      },
    });
  });

  test('calls writePackageJSON with deps and dev deps', async () => {
    const bundler = new ESBuildBundler('./dist');
    const dependencies = {
      'foo': '1.2.3',
      'foo2': '2.3.4',
    };
    const devDependencies = {
      'bar': '1.2.3',
      'bar2': '2.3.4',
    };
    await bundler.bundle({
      workingDir: '/tmp2',
      dependencies,
      devDependencies: {
        ...Object.keys(DEFAULT_DEV_DEPENDENCIES).reduce((obj, dep) => {
          return {
            ...obj,
            [dep]: 'replace-me',
          };
        }, {}),
        ...devDependencies,
      },
    });

    expect(writePackageJSON).toHaveBeenCalledWith(expect.any(Function), '/tmp2/package.json', {
      type: 'module',
      dependencies,
      devDependencies: {
        ...devDependencies,
        ...DEFAULT_DEV_DEPENDENCIES,
      },
    });
  });

  test('calls writeIndexJS with correct working dir', async () => {
    const bundler = new ESBuildBundler('./dist');
    await bundler.bundle({
      workingDir: '/tmp2'
    });

    expect(writeIndexJS).toHaveBeenCalledWith(expect.any(Function), '/tmp2/index.js', []);
  });

  test('calls writeIndexJS with correct working dir and dependencies', async () => {
    const bundler = new ESBuildBundler('./dist');
    const dependencies = {
      'foo': '1.2.3',
      'foo2': '2.3.4',
    };
    const devDependencies = {
      'bar': '1.2.3',
      'bar2': '2.3.4',
    };
    await bundler.bundle({
      workingDir: '/tmp2',
      dependencies,
      devDependencies: {
        ...Object.keys(DEFAULT_DEV_DEPENDENCIES).reduce((obj, dep) => {
          return {
            ...obj,
            [dep]: 'replace-me',
          };
        }, {}),
        ...devDependencies,
      },
    });

    expect(writeIndexJS).toHaveBeenCalledWith(expect.any(Function), '/tmp2/index.js', [
      'foo',
      'foo2',
      ...Object.keys(DEFAULT_DEV_DEPENDENCIES),
      'bar',
      'bar2',
    ].map(key => [key, ESBuildBundler.getHashedName(key)]));
  });

  test('calls writeFile with correct working dir and title', async () => {
    const outDir = 'dist';
    const bundler = new ESBuildBundler(outDir);
    const title = 'FOO BAR';
    await bundler.bundle({
      workingDir: '/tmp2',
      title,
    });

    expect(writeFile).toHaveBeenCalledWith(`${outDir}/index.html`, expect.stringContaining(title));
  });

  test('skips pnpm install if specified', async () => {
    const outDir = 'dist';
    const bundler = new ESBuildBundler(outDir);
    const title = 'FOO BAR';
    await bundler.bundle({
      workingDir: '/tmp2',
      title,
      skipNpmInstall: true,
    });

    expect(pnpmInstall).not.toHaveBeenCalled();
  });

  test('does not skip pnpm install by default', async () => {
    const outDir = 'dist';
    const bundler = new ESBuildBundler(outDir);
    const title = 'FOO BAR';
    await bundler.bundle({
      workingDir: '/tmp2',
      title,
    });

    expect(pnpmInstall).toHaveBeenCalledTimes(1);
  });

  test('bundles', async () => {
    const outdir = '/dist';
    const bundler = new ESBuildBundler(outdir);
    const title = 'FOO BAR';
    const additionalConfiguration = {
      loader: {
        '.png': 'file',
      },
    };
    await bundler.bundle({
      workingDir: '/tmp2',
      title,
      additionalConfiguration,
    });

    expect(esbuild).toHaveBeenCalledWith(expect.objectContaining({
      entryPoints: ['/tmp2/index.js'],
      absWorkingDir: expect.any(String),
      bundle: true,
      outdir,
      ...additionalConfiguration,
    }));
  });
});
