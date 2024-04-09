import { afterEach, vi } from 'vitest';
import { rimraf } from 'rimraf';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  setLogLevel,
  ESBuildBundler,
  UMDBundler,
  bundle,
  output,
  HttpServer,
  ServersideTestRunner,
} from 'testeroni';
import { makeTmpDir } from '../../packages/testeroni/src/common/tmp-dir.js';
import path from 'path';
import { existsSync, mkdir, readFile, } from 'fs-extra';
import { Browser, chromium } from 'playwright'

setLogLevel('error');

import { withWorkingDir, } from '../../packages/testeroni/src/bundlers/utils/with-working-dir.js';
import * as _withWorkingDir from '../../packages/testeroni/src/bundlers/utils/with-working-dir.js';
import { writeFile, } from '../../packages/testeroni/src/common/fs.js';
import * as _fs from '../../packages/testeroni/src/common/fs.js';

vi.mock("../../packages/testeroni/src/bundlers/utils/with-working-dir.js", async () => {
  const actual = await vi.importActual("../../packages/testeroni/src/bundlers/utils/with-working-dir.js") as typeof _withWorkingDir;
  return {
    ...actual,
  };
});

vi.mock("../../packages/testeroni/src/common/fs.js", async () => {
  const actual = await vi.importActual("../../packages/testeroni/src/common/fs.js") as typeof _fs;
  return {
    ...actual,
  };
});

const TMP = path.resolve(__dirname, '../tmp');

describe.only('ESBuildBundler', () => {
  const origLog = console.log;
  let workingDir: string;
  let outDir: string;
  let server: HttpServer;
  let browser: Browser;

  const makeFakeLocalPackage = async (
    name: string,
    version: string,
    type: 'commonjs' | 'module' = 'module',
  ) => {
    const root = path.resolve(workingDir, 'node_modules', name);
    await mkdir(root, { recursive: true });
    return Promise.all([
      writeFile(path.resolve(root, 'package.json'), JSON.stringify({
        name,
        version,
        main: './index.js',
      }), 'utf-8'),
      writeFile(path.resolve(root, 'index.js'), [
        `const main = "c-${name}";`,
        type === 'module' ? `export default main;` : `module.exports = main;`,
      ].join('\n'), 'utf-8'),
    ]);
  };

  const startServer = async (dist: string, log = false) => {
    const server = new HttpServer({ dist });
    await server.start();
    process.on('exit', () => server.close());
    const url = await server.url;
    if (!url) {
      throw new Error('Some bug, no URL found');
    }
    if (log) {
      output([
        url,
        `- serving folder: ${dist}`,
      ].join('\n'));
    }
    return url;
  };

  const getBrowser = async () => {
    browser = await chromium.launch();
    return browser;
  }

  beforeEach(async () => {
    console.log = vi.fn().mockImplementation((...msg) => {
      origLog(...msg);
    });
    workingDir = await makeTmpDir(TMP);
    outDir = await makeTmpDir(TMP);
  });

  afterEach(async () => {
    console.log = origLog;
    await Promise.all([
      rimraf(workingDir),
      rimraf(outDir),
      server ? server.close() : undefined,
      browser ? browser.close() : undefined,
    ]);
  });

  test('it bundles with correct title', async () => {
    const title = 'esbuilderoo';
    const bundler = new ESBuildBundler(outDir);
    await bundler.bundle({
      skipNpmInstall: true,
      title,
    });
    expect(path.join(outDir, 'index.html')).toMatchHTML({
      title,
    });
  });

  test('it sets package.json to include the correct dependencies', async () => {
    const title = 'esbuildoo';
    const dependencies = {
      'foo': '0.0.1',
      'bar': '0.0.2',
    };
    const devDependencies = {
      'baz': '0.0.3',
      'qux': '0.0.4',
    };
    await Promise.all(Object.entries({
      ...dependencies,
      ...devDependencies,
    }).map(([name, version]) => {
      return makeFakeLocalPackage(name, version);
    }));
    const bundler = new ESBuildBundler(outDir);
    await bundler.bundle({
      skipNpmInstall: true,
      keepWorkingFiles: true,
      title,
      dependencies,
      devDependencies,
      workingDir: workingDir,
    });

    expect(path.resolve(workingDir, 'package.json')).toMatchPackageJSON({
      dependencies,
      devDependencies,
    });
  });

  test('it includes the correct dependencies in the index.js that will be built', async () => {
    const title = 'esbuildoo';
    const dependencies = {
      'foo': '0.0.1',
      'bar': '0.0.2',
    };
    const devDependencies = {
      'baz': '0.0.3',
      'qux': '0.0.4',
    };
    await Promise.all(Object.entries({
      ...dependencies,
      ...devDependencies,
    }).map(([name, version]) => {
      return makeFakeLocalPackage(name, version);
    }));
    const bundler = new ESBuildBundler(outDir);
    await bundler.bundle({
      skipNpmInstall: true,
      keepWorkingFiles: true,
      title,
      dependencies,
      devDependencies,
      workingDir: workingDir,
    });
    expect(path.resolve(workingDir, 'index.js')).toMatchJS({
      regExps: Object.keys({
        ...dependencies,
        ...devDependencies,
      }).reduce<RegExp[]>((acc, key) => {
        return acc.concat([
          new RegExp(`import ${ESBuildBundler.getHashedName(key)} from '${key}';`),
          new RegExp(`window\\['${key}'\\] = ${ESBuildBundler.getHashedName(key)};`),
        ]);
      }, []),
    });
  });

  test('it includes the correct dependencies in the index.js file built by esbuild', async () => {
    const title = 'esbuildoo';
    const dependencies = {
      'foo': '0.0.1',
      'bar': '0.0.2',
    };
    const devDependencies = {
      'baz': '0.0.3',
      'qux': '0.0.4',
    };
    await Promise.all(Object.entries({
      ...dependencies,
      ...devDependencies,
    }).map(([name, version]) => {
      return makeFakeLocalPackage(name, version);
    }));
    const bundler = new ESBuildBundler(outDir);
    await bundler.bundle({
      skipNpmInstall: true,
      keepWorkingFiles: true,
      title,
      dependencies,
      devDependencies,
      workingDir: workingDir,
    });

    expect(path.join(workingDir, 'index.js')).toMatchJS({
      regExps: Object.keys({
        ...dependencies,
        ...devDependencies,
      }).reduce<RegExp[]>((acc, key) => {
        return acc.concat([
          new RegExp(`window\\['${key}'\\] =`),
        ]);
      }, []),
    });
  });


  test('it bundles the correct node modules', async () => {
    const title = 'esbuildoo';
    const dependencies = {
      'foo': '0.0.1',
      'bar': '0.0.2',
    };
    const devDependencies = {
      'baz': '0.0.3',
      'qux': '0.0.4',
    };
    await Promise.all(Object.entries({
      ...dependencies,
      ...devDependencies,
    }).map(([name, version]) => {
      return makeFakeLocalPackage(name, version);
    }));
    const bundler = new ESBuildBundler(outDir);
    await bundler.bundle({
      skipNpmInstall: true,
      keepWorkingFiles: true,
      title,
      dependencies,
      devDependencies,
      workingDir: workingDir
    });

    const [url, browser] = await Promise.all([
      startServer(outDir),
      getBrowser(),
    ]);
    const page = await browser.newPage();
    await page.goto(url);
    const keys = Object.keys({
      ...dependencies,
      ...devDependencies,
    });
    for (const key of keys) {
      const value = await page.evaluate((key) => {
        return window[key];
      }, key);
      expect(value).toBe(`c-${key}`);
    }
  });

  test('removes temp files by default', async () => {
    const title = 'webpackery';
    const dependencies = {
      'foo': '0.0.1',
      'bar': '0.0.2',
    };
    const devDependencies = {
      'baz': '0.0.3',
      'qux': '0.0.4',
    };
    await Promise.all(Object.entries({
      ...dependencies,
      ...devDependencies,
    }).map(([name, version]) => {
      return makeFakeLocalPackage(name, version);
    }));
    const bundler = new ESBuildBundler(outDir);
    await bundler.bundle({
      skipNpmInstall: true,
      title,
      dependencies,
      devDependencies,
      workingDir: workingDir,
    });

    expect(existsSync(path.resolve(workingDir, 'package.json'))).toBe(false);
    expect(existsSync(path.resolve(workingDir, 'index.js'))).toBe(false);
    expect(existsSync(path.resolve(workingDir, 'index.html'))).toBe(false);
    expect(existsSync(path.resolve(outDir, 'index.js'))).toBe(true);
    expect(existsSync(path.resolve(outDir, 'index.html'))).toBe(true);
  });
});
