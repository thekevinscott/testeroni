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
  BundlerName,
  WebpackBundler,
  writeFile,
} from 'testeroni';
import { makeTmpDir } from '../../packages/testeroni/src/common/tmp-dir.js';
import path from 'path';
import { existsSync, mkdir, readFile, } from 'fs-extra';
import { Browser, chromium } from 'playwright'

setLogLevel('error');

const TMP = path.resolve(__dirname, '../tmp');

describe('bundle', () => {
  const origLog = console.log;
  let workingDir: string;
  let outDir: string;
  let server: HttpServer;
  let browser: Browser;

  const makeFakeLocalPackage = async (
    name: string,
    version: string,
    type: 'commonjs' | 'module' = 'module',
    targetDir: string = workingDir,
  ) => {
    const root = path.resolve(targetDir, 'node_modules', name);
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
  const makeFakeLocalPackages = (...packagesList: Record<string, string>[]) => Promise.all(Object.entries({
    ...packagesList.reduce((acc, packages) => ({ ...acc, ...packages }), {}),
  }).map(([name, version]) => makeFakeLocalPackage(name, version)));

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

  const makeFakeLocalFileForUMD = async (
    name: string,
    contents: string,
  ) => {
    const target = path.resolve(workingDir, name);
    await writeFile(target, contents);
    return target;
  };

  describe('UMD', () => {
    test('it bundles with correct title', async () => {
      const title = 'bar';
      await bundle(BundlerName.umd, outDir, {
        title,
      });
      expect(path.resolve(outDir, 'index.html')).toMatchHTML({
        title,
      });
    });

    test('it bundles with correct title and includes', async () => {
      const title = 'bar';
      const fileNames = ['bar', 'baz'];
      const files = await Promise.all(fileNames.map(file => makeFakeLocalFileForUMD(file, file)));
      await bundle(BundlerName.umd, outDir, {
        title,
        files,
      });

      // files should be copied over correctly
      for (let i = 0; i < files.length; i++) {
        const fileName = fileNames[i];
        const filePath = files[i];
        const contents = await readFile(filePath, 'utf-8');
        expect(contents).toBe(fileName);
      }

      expect(path.resolve(outDir, 'index.html')).toMatchHTML({
        title,
        includes: files.map(UMDBundler.getTargetFileName),
      });
    });
  });

  describe('ESBuild', () => {
    test('it bundles with correct title', async () => {
      const title = 'esbuildo';
      const options = {
        title,
        skipNpmInstall: true,
        workingDir,
      };
      await bundle(BundlerName.esbuild, outDir, options);
      expect(path.resolve(outDir, 'index.html')).toMatchHTML({
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
      await makeFakeLocalPackages(dependencies, devDependencies)
      await bundle(BundlerName.esbuild, outDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
        workingDir,
      });

      expect(path.resolve(workingDir, 'package.json')).toMatchPackageJSON({
        dependencies,
        devDependencies,
      });
    });

    test('it includes the correct dependencies in the workingDir/index.js that will be the input to the bundler', async () => {
      const title = 'esbuildoo';
      const dependencies = {
        'foo': '0.0.1',
        'bar': '0.0.2',
      };
      const devDependencies = {
        'baz': '0.0.3',
        'qux': '0.0.4',
      };
      await makeFakeLocalPackages(dependencies, devDependencies)
      await bundle(BundlerName.esbuild, outDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
        workingDir,
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
        }, [])
      });
    });

    test('it includes the correct dependencies in the outDir/index.js file output by the bundler', async () => {
      const title = 'esbuildoo';
      const dependencies = {
        'foo': '0.0.1',
        'bar': '0.0.2',
      };
      const devDependencies = {
        'baz': '0.0.3',
        'qux': '0.0.4',
      };
      await makeFakeLocalPackages(dependencies, devDependencies)
      await bundle(BundlerName.esbuild, outDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
        workingDir,
      });

      expect(path.resolve(outDir, 'index.js')).toMatchJS({
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
      await makeFakeLocalPackages(dependencies, devDependencies)
      await bundle(BundlerName.esbuild, outDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
        workingDir,
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
        const value = await page.evaluate((key) => window[key], key);
        expect(value).toBe(`c-${key}`);
      }
    });

    test('removes temp files by default', async () => {
      const title = 'esbuilderoo';
      const dependencies = {
        'foo': '0.0.1',
        'bar': '0.0.2',
      };
      const devDependencies = {
        'baz': '0.0.3',
        'qux': '0.0.4',
      };
      await makeFakeLocalPackages(dependencies, devDependencies)
      await bundle('esbuild', outDir, {
        skipNpmInstall: true,
        title,
        dependencies,
        devDependencies,
        workingDir,
      });

      expect(existsSync(path.resolve(workingDir, 'package.json'))).toBe(false);
      expect(existsSync(path.resolve(workingDir, 'index.js'))).toBe(false);
      expect(existsSync(path.resolve(workingDir, 'index.html'))).toBe(false);
      expect(existsSync(path.resolve(outDir, 'index.js'))).toBe(true);
      expect(existsSync(path.resolve(outDir, 'index.html'))).toBe(true);
    });
  });

  describe('Webpack', () => {
    test('it bundles with correct title', async () => {
      const title = 'webpacky';
      await bundle('webpack', workingDir, {
        title,
        skipNpmInstall: true,
      });
      expect(path.resolve(workingDir, 'index.html')).toMatchHTML({
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
      await makeFakeLocalPackages(dependencies, devDependencies)
      await bundle('webpack', outDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
        workingDir,
      });

      expect(path.resolve(workingDir, 'package.json')).toMatchPackageJSON({
        dependencies,
        devDependencies,
      });
    });

    test('it includes the correct dependencies in the workingDir/index.js that will be provided to webpack', async () => {
      const title = 'webpackerinoo';
      const dependencies = {
        'foo': '0.0.1',
        'bar': '0.0.2',
      };
      const devDependencies = {
        'baz': '0.0.3',
        'qux': '0.0.4',
      };
      await makeFakeLocalPackages(dependencies, devDependencies)
      await bundle('webpack', workingDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
        workingDir,
      });
      expect(path.resolve(workingDir, 'index.js')).toMatchJS({
        regExps: Object.keys({
          ...dependencies,
          ...devDependencies,
        }).reduce<RegExp[]>((acc, key) => {
          return acc.concat([
            new RegExp(`import ${WebpackBundler.getHashedName(key)} from '${key}';`),
            new RegExp(`window\\['${key}'\\] = ${WebpackBundler.getHashedName(key)};`),
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
      await makeFakeLocalPackages(dependencies, devDependencies)
      await bundle('webpack', outDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
        workingDir,
      });

      expect(path.resolve(outDir, 'main.js')).toMatchJS({
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
      await makeFakeLocalPackages(dependencies, devDependencies)
      await bundle('webpack', outDir, {
        skipNpmInstall: true,
        keepWorkingFiles: true,
        title,
        dependencies,
        devDependencies,
        workingDir,
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
        const value = await page.evaluate((key) => window[key], key);
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
      await makeFakeLocalPackages(dependencies, devDependencies)
      await bundle('webpack', outDir, {
        skipNpmInstall: true,
        title,
        dependencies,
        devDependencies,
        workingDir,
      });

      expect(existsSync(path.resolve(workingDir, 'package.json'))).toBe(false);
      expect(existsSync(path.resolve(workingDir, 'index.js'))).toBe(false);
      expect(existsSync(path.resolve(workingDir, 'index.html'))).toBe(false);
      expect(existsSync(path.resolve(outDir, 'main.js'))).toBe(true);
      expect(existsSync(path.resolve(outDir, 'index.html'))).toBe(true);
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
      await makeFakeLocalPackages(dependencies, devDependencies)
      await bundle('node', outDir, {
        module: false,
        skipNpmInstall: true,
        keepWorkingFiles: true,
        dependencies,
        devDependencies,
      });

      expect(path.resolve(outDir, 'package.json')).toMatchPackageJSON({
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
      await makeFakeLocalPackages(dependencies, devDependencies)
      await bundle('node', outDir, {
        skipNpmInstall: true,
        dependencies,
        devDependencies,
      });

      expect(existsSync(path.resolve(outDir, 'package.json'))).toBe(false);
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
        return makeFakeLocalPackage(name, version, 'commonjs', outDir);
      }));
      await bundle('node', outDir, {
        module: true,
        skipNpmInstall: true,
        keepWorkingFiles: true,
        dependencies,
        devDependencies,
      });

      const runner = new ServersideTestRunner({
        cwd: outDir,
      });

      const keys = Object.keys({
        ...dependencies,
        ...devDependencies,
      });

      const contents = [
        ...keys.map(key => `const ${key} = require('${key}');`),
        `return JSON.stringify([${keys.join(', ')}]);`,
      ].join('\n');
      const result = await runner.run(contents);
      expect(result).toBe(JSON.stringify(keys.map(key => `c-${key}`)));
    });

    test('can run a script against the node app and get back a buffer', async () => {
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
        return makeFakeLocalPackage(name, version, 'commonjs', outDir);
      }));
      await bundle('node', outDir, {
        module: true,
        skipNpmInstall: true,
        keepWorkingFiles: true,
        dependencies,
        devDependencies,
      });

      const runner = new ServersideTestRunner({
        cwd: outDir,
      });

      const keys = Object.keys({
        ...dependencies,
        ...devDependencies,
      });

      const contents = [
        ...keys.map(key => `const ${key} = require('${key}');`),
        `return JSON.stringify([${keys.join(', ')}]);`,
      ].join('\n');
      const buffer = await runner.run(contents, {
        returnType: 'buffer',
      });
      expect(buffer.toString()).toBe(JSON.stringify(keys.map(key => `c-${key}`)));
    });
  });
});
