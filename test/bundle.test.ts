import { afterEach, vi } from 'vitest';
import { rimraf } from 'rimraf';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  setLogLevel,
  EsbuildBundler,
  UMDBundler,
  bundle,
  output,
  HttpServer,
  ServersideTestRunner,
} from 'testbuddy';
import { makeTmpDir } from '../packages/testbuddy/src/common/tmp-dir.js';
import path from 'path';
import { existsSync, mkdir, readFile, writeFile, } from 'fs-extra';
import { Browser, chromium } from 'playwright'

setLogLevel('error');

const TMP = path.resolve(__dirname, '../tmp');

describe('bundle', () => {
  const origLog = console.log;
  let tmpDir: string;
  let server: HttpServer;
  let browser: Browser;

  const makeFakeLocalPackage = async (
    name: string,
    version: string,
    type: 'commonjs' | 'module' = 'module',
  ) => {
    const root = path.resolve(tmpDir, 'node_modules', name);
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
    tmpDir = await makeTmpDir(TMP);
  });

  afterEach(async () => {
    console.log = origLog;
    await Promise.all([
      rimraf(tmpDir),
      server ? server.close() : undefined,
      browser ? browser.close() : undefined,
    ]);
  });

  const makeFakeLocalFileForUMD = (
    name: string,
    contents: string,
  ) => writeFile(path.resolve(tmpDir, name), contents);

  describe('UMD', () => {
    test('it bundles with correct title', async () => {
      const title = 'bar';
      await bundle('umd', tmpDir, {
        title,
      });
      expect(path.resolve(tmpDir, 'dist', 'index.html')).toMatchHTML({
        title,
      });
    });

    test('it bundles with correct title and includes', async () => {
      const title = 'bar';
      const files = ['bar', 'baz'];
      await Promise.all(files.map(file => {
        makeFakeLocalFileForUMD(file, file);
      }));

      const dependencies = files.map(file => path.resolve(tmpDir, file));
      await bundle('umd', tmpDir, {
        title,
        dependencies,
      });

      // files should be copied over correctly
      for (const file of files) {
        const fileName = path.resolve(tmpDir, 'dist', UMDBundler.getTargetFileName(path.resolve(tmpDir, file)));
        const contents = await readFile(fileName, 'utf-8');
        expect(contents).toBe(file);
      }

      expect(path.resolve(tmpDir, 'dist', 'index.html')).toMatchHTML({
        title,
        includes: dependencies.map(UMDBundler.getTargetFileName),
      });
    });
  });

  describe('ESBuild', () => {
    test('it bundles with correct title', async () => {
      const title = 'esbuildo';
      await bundle('esbuild', tmpDir, {
        title,
        skipNpmInstall: true,
      });
      expect(path.resolve(tmpDir, 'dist', 'index.html')).toMatchHTML({
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
      await bundle('esbuild', tmpDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
      });

      expect(path.resolve(tmpDir, 'package.json')).toMatchPackageJSON({
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
      await bundle('esbuild', tmpDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
      });
      expect(path.resolve(tmpDir, 'index.js')).toMatchJS({
        regExps: Object.keys({
          ...dependencies,
          ...devDependencies,
        }).reduce<RegExp[]>((acc, key) => {
          return acc.concat([
            new RegExp(`import ${EsbuildBundler.getHashedName(key)} from '${key}';`),
            new RegExp(`window\\['${key}'\\] = ${EsbuildBundler.getHashedName(key)};`),
          ]);
        }, [])
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
      await bundle('esbuild', tmpDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
      });

      expect(path.resolve(tmpDir, 'dist', 'index.js')).toMatchJS({
        regExps: Object.keys({
          ...dependencies,
          ...devDependencies,
        }).reduce<RegExp[]>((acc, key) => {
          return acc.concat([
            new RegExp(`window\\["${key}"\\] =`),
          ]);
        }, [])
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
      await bundle('esbuild', tmpDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
      });

      const dist = path.resolve(tmpDir, 'dist');
      const [url, browser] = await Promise.all([
        startServer(dist),
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
      await bundle('esbuild', tmpDir, {
        skipNpmInstall: true,
        title,
        dependencies,
        devDependencies,
      });

      expect(existsSync(path.resolve(tmpDir, 'package.json'))).toBe(false);
      expect(existsSync(path.resolve(tmpDir, 'index.js'))).toBe(false);
      expect(existsSync(path.resolve(tmpDir, 'index.html'))).toBe(false);
      expect(existsSync(path.resolve(tmpDir, 'dist/index.js'))).toBe(true);
      expect(existsSync(path.resolve(tmpDir, 'dist/index.html'))).toBe(true);
    });
  });

  describe('Webpack', () => {
    test('it bundles with correct title', async () => {
      const title = 'webpacky';
      await bundle('webpack', tmpDir, {
        title,
        skipNpmInstall: true,
      });
      expect(path.resolve(tmpDir, 'dist', 'index.html')).toMatchHTML({
        title,
      });
    });

    test('it sets package.json to include the correct dependencies', async () => {
      const title = 'webpackyoo';
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
      await bundle('webpack', tmpDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
      });

      expect(path.resolve(tmpDir, 'package.json')).toMatchPackageJSON({
        dependencies,
        devDependencies,
      });
    });

    test('it includes the correct dependencies in the index.js that will be built', async () => {
      const title = 'webpackerinoo';
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
      await bundle('webpack', tmpDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
      });
      expect(path.resolve(tmpDir, 'index.js')).toMatchJS({
        regExps: Object.keys({
          ...dependencies,
          ...devDependencies,
        }).reduce<RegExp[]>((acc, key) => {
          return acc.concat([
            new RegExp(`import ${EsbuildBundler.getHashedName(key)} from '${key}';`),
            new RegExp(`window\\['${key}'\\] = ${EsbuildBundler.getHashedName(key)};`),
          ]);
        }, [])
      });
    });

    test('it includes the correct dependencies in the index.js file built by webpack', async () => {
      const title = 'webpacked';
      const dependencies = {
        'foo-foo': '0.0.1',
        'bar-bar': '0.0.2',
      };
      const devDependencies = {
        'baz-baz': '0.0.3',
        'qux-qux': '0.0.4',
      };
      await Promise.all(Object.entries({
        ...dependencies,
        ...devDependencies,
      }).map(([name, version]) => {
        return makeFakeLocalPackage(name, version);
      }));
      await bundle('webpack', tmpDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
      });

      expect(path.resolve(tmpDir, 'dist', 'main.js')).toMatchJS({
        regExps: Object.keys({
          ...dependencies,
          ...devDependencies,
        }).reduce<RegExp[]>((acc, key) => {
          return acc.concat([
            new RegExp(`window\\["${key}"\\]=`),
          ]);
        }, [])
      });
    });

    test('it bundles the correct node modules', async () => {
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
      await bundle('webpack', tmpDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
      });

      const dist = path.resolve(tmpDir, 'dist');
      const [url, browser] = await Promise.all([
        startServer(dist),
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
      await bundle('webpack', tmpDir, {
        skipNpmInstall: true,
        title,
        dependencies,
        devDependencies,
      });

      expect(existsSync(path.resolve(tmpDir, 'package.json'))).toBe(false);
      expect(existsSync(path.resolve(tmpDir, 'index.js'))).toBe(false);
      expect(existsSync(path.resolve(tmpDir, 'index.html'))).toBe(false);
      expect(existsSync(path.resolve(tmpDir, 'dist/main.js'))).toBe(true);
      expect(existsSync(path.resolve(tmpDir, 'dist/index.html'))).toBe(true);
    });
  });

  describe('Node', () => {
    test('it sets package.json to include the correct dependencies', async () => {
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
      await bundle('node', tmpDir, {
        module: false,
        skipNpmInstall: true,
        keepWorkingFiles: true,
        dependencies,
        devDependencies,
      });

      expect(path.resolve(tmpDir, 'package.json')).toMatchPackageJSON({
        type: 'commonjs',
        dependencies,
        devDependencies,
      });
    });

    test('removes temp files by default', async () => {
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
      await bundle('node', tmpDir, {
        skipNpmInstall: true,
        dependencies,
        devDependencies,
      });

      expect(existsSync(path.resolve(tmpDir, 'package.json'))).toBe(false);
    });

    test('can run a script against the node app', async () => {
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
        return makeFakeLocalPackage(name, version, 'commonjs');
      }));
      await bundle('node', tmpDir, {
        module: true,
        skipNpmInstall: true,
        keepWorkingFiles: true,
        dependencies,
        devDependencies,
      });

      const runner = new ServersideTestRunner({
        cwd: tmpDir,
      });

      const keys = Object.keys({
        ...dependencies,
        ...devDependencies,
      });

      const contents = [
        ...keys.map(key => `const ${key} = require('${key}');`),
        `return JSON.stringify([${keys.join(', ')}]);`,
      ].join('\n');
      const buffer = await runner.run(contents);
      expect(buffer.toString()).toBe(JSON.stringify(keys.map(key => `c-${key}`)));
    });
  });
});
