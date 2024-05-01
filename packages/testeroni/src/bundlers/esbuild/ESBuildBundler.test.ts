import { afterEach, vi } from 'vitest';
import { beforeEach, describe, expect, test } from 'vitest';
import { withWorkingDir, } from '../utils/with-working-dir.js';
import * as _withWorkingDir from '../utils/with-working-dir.js';
import { writeFile, } from '../../common/fs.js';
import * as _fs from '../../common/fs.js';
import { DEFAULT_DEV_DEPENDENCIES, ESBuildBundler, NAME } from './ESBuildBundler.js';
import * as _installPackages from '../../common/npm.js';
import { installPackages, } from '../../common/npm.js';
import { writePackageJSON, } from '../utils/write-package-json.js';
import * as _writePackageJSON from '../utils/write-package-json.js';
import { writeIndexJS, } from '../utils/write-index-js.js';
import * as _writeIndexJS from '../utils/write-index-js.js';
import { build as esbuild, } from 'esbuild';
import * as _esbuild from 'esbuild';
import { info, } from '../../common/logger.js';
import * as _logger from '../../common/logger.js';
import { makeTmpDir } from '../../common/tmp-dir.js';
import path from 'path';
import { rimraf } from 'rimraf';
// import { getTemplate, } from '../../common/get-template.js';
import * as _getTemplate from '../../common/get-template.js';

vi.mock('../../common/get-template.js', async () => {
  const actual = await vi.importActual('../../common/get-template.js') as typeof _getTemplate;
  return {
    ...actual,
    getTemplate: vi.fn().mockImplementation((templateName, args) => actual.getTemplate(templateName.replace('dist', 'src'), args)),
  };
});

const TMP = path.resolve(__dirname, '../../../../../', 'tmp');

vi.mock("../../common/logger.js", async () => {
  const actual = await vi.importActual("../../common/logger.js") as typeof _logger;
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

vi.mock("../utils/with-working-dir.js", async () => {
  const actual = await vi.importActual("../utils/with-working-dir.js") as typeof _withWorkingDir;
  const withWorkingDirFn: typeof withWorkingDir = vi.fn().mockImplementation(async (cb, workingDir = '/tmp/folder/not/set') => {
    await cb(workingDir);
  });
  return {
    ...actual,
    withWorkingDir: withWorkingDirFn
  };
});

vi.mock("../../common/fs.js", async () => {
  const actual = await vi.importActual("../../common/fs.js") as typeof _fs;
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

vi.mock("../../common/npm.js", async () => {
  const actual = await vi.importActual("../../common/npm.js") as typeof _installPackages;
  return {
    ...actual,
    installPackages: vi.fn(),
  };
});

vi.mock("../utils/write-package-json.js", async () => {
  const actual = await vi.importActual("../utils/write-package-json.js") as typeof _writePackageJSON;
  return {
    ...actual,
    writePackageJSON: vi.fn(),
  };
});
vi.mock("../utils/write-index-js.js", async () => {
  const actual = await vi.importActual("../utils/write-index-js.js") as typeof _writeIndexJS;
  return {
    ...actual,
    writeIndexJS: vi.fn(),
  };
});

describe('ESBuildBundler', () => {
  let workingDir: string;
  let outDir: string;

  beforeEach(async () => {
    workingDir = await makeTmpDir(TMP);
    outDir = await makeTmpDir(TMP);
  });

  afterEach(async () => {
    vi.clearAllMocks();

    await Promise.all([
      rimraf(workingDir),
      rimraf(outDir),
    ]);
  });

  test('it instantiates', () => {
    const bundler = new ESBuildBundler(outDir);
    expect(bundler.name).toBe(NAME);
  });

  test('logs various stuff', async () => {
    const bundler = new ESBuildBundler(outDir);
    await bundler.bundle({
      workingDir,
    });

    expect(info).toHaveBeenCalledTimes(3);
  });

  test('passes working dir if provided', async () => {
    const bundler = new ESBuildBundler(outDir);
    await bundler.bundle({
      workingDir,
    });

    expect(withWorkingDir).toHaveBeenCalledWith(expect.any(Function), workingDir);
  });

  test('passes undefined working dir if not provided', async () => {
    const bundler = new ESBuildBundler(outDir);
    await bundler.bundle({
    });

    expect(withWorkingDir).toHaveBeenCalledWith(expect.any(Function), undefined);
  });

  test('calls writePackageJSON with correct working dir', async () => {
    const bundler = new ESBuildBundler(outDir);
    await bundler.bundle({
      workingDir,
    });

    expect(writePackageJSON).toHaveBeenCalledWith(expect.any(Function), `${workingDir}/package.json`, {
      type: 'module',
      dependencies: {},
      devDependencies: {
        ...DEFAULT_DEV_DEPENDENCIES,
      },
    });
  });

  test('calls writePackageJSON with deps and dev deps', async () => {
    const bundler = new ESBuildBundler(outDir);
    const dependencies = {
      'foo': '1.2.3',
      'foo2': '2.3.4',
    };
    const devDependencies = {
      'bar': '1.2.3',
      'bar2': '2.3.4',
    };
    await bundler.bundle({
      workingDir,
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

    expect(writePackageJSON).toHaveBeenCalledWith(expect.any(Function), `${workingDir}/package.json`, {
      type: 'module',
      dependencies,
      devDependencies: {
        ...devDependencies,
        ...DEFAULT_DEV_DEPENDENCIES,
      },
    });
  });

  test('calls writeIndexJS with correct working dir', async () => {
    const bundler = new ESBuildBundler(outDir);
    await bundler.bundle({
      workingDir,
    });

    expect(writeIndexJS).toHaveBeenCalledWith(expect.any(Function), `${workingDir}/index.js`, []);
  });

  test('calls writeIndexJS with correct working dir and dependencies', async () => {
    const bundler = new ESBuildBundler(outDir);
    const dependencies = {
      'foo': '1.2.3',
      'foo2': '2.3.4',
    };
    const devDependencies = {
      'bar': '1.2.3',
      'bar2': '2.3.4',
    };
    await bundler.bundle({
      workingDir,
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

    expect(writeIndexJS).toHaveBeenCalledWith(expect.any(Function), `${workingDir}/index.js`, [
      'foo',
      'foo2',
      ...Object.keys(DEFAULT_DEV_DEPENDENCIES),
      'bar',
      'bar2',
    ].map(key => [key, ESBuildBundler.getHashedName(key)]));
  });

  test('calls writeFile with correct working dir and title', async () => {
    const bundler = new ESBuildBundler(outDir);
    const title = 'FOO BAR';
    await bundler.bundle({
      workingDir,
      title,
    });

    expect(writeFile).toHaveBeenCalledWith(`${outDir}/index.html`, expect.stringContaining(title));
  });

  test('skips pnpm install if specified', async () => {
    const bundler = new ESBuildBundler(outDir);
    const title = 'FOO BAR';
    await bundler.bundle({
      workingDir,
      title,
      skipPackageInstall: true,
    });

    expect(installPackages).not.toHaveBeenCalled();
  });

  test('does not skip pnpm install by default', async () => {
    const bundler = new ESBuildBundler(outDir);
    const title = 'FOO BAR';
    await bundler.bundle({
      workingDir,
      title,
    });

    expect(installPackages).toHaveBeenCalledTimes(1);
  });

  test('bundles', async () => {
    const bundler = new ESBuildBundler(outDir);
    const title = 'FOO BAR';
    const additionalConfiguration = {
      loader: {
        '.png': 'file',
      },
    };
    await bundler.bundle({
      workingDir,
      title,
      additionalConfiguration,
    });

    expect(esbuild).toHaveBeenCalledWith(expect.objectContaining({
      entryPoints: [`${workingDir}/index.js`],
      absWorkingDir: expect.any(String),
      bundle: true,
      outdir: outDir,
      ...additionalConfiguration,
    }));
  });
});
