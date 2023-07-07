# Testeroni

Test your stuff!

## Intended Audience

This is a library for library authors to test their libraries across a variety of environments (including browsers and server-side).

## Quickstart

You'll need to first set up a testing library of your choice. I like `vitest`.

In your library, set up a dedicated testing folder:

```bash
cd /path/to/your/library
mkdir -p test
```

And add a test (assumes you're using `vitest`):

```javascript
// test/my-library-test.js

import path from 'path';
import * as url from 'url';
import lib from '../src/my-library.js'
import { ServersideTestRunner, ClientsideTestRunner, bundle, SupportedDriver } from 'testeroni'
import { chromium, } from 'playwright'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TMP = path.resolve(ROOT, '.tmp') // a temporary folder to hold the files we write out

describe('My Library', () => {
  test('it should run in Node', async () => {
    const outDir = path.resolve(TMP, 'node')
    const nodeRunner = new ServersideTestRunner({
      cwd: outDir,
      module: true,
    });
    await nodeRunner.beforeAll(async () => {
      await bundle('node', outDir)
    })
    expect(await nodeRunner.run(`
      import lib from 'my-library'
      return lib('foo')
    `)).toEqual('foo')
  })

  test('it should run in the browser, UMD style', async () => {
    const outDir = path.resolve(TMP, 'browser')
    const bundler = 'esbuild'
    const browserRunner = new ClientsideTestRunner({
      dist: outDir,
      driver: SupportedDriver.playwright,
      launch: chromium.launch.bind(chromium),
    })
    await browserRunner.beforeAll(() => bundle(bundler, outDir, {

    }))
    const result = await browserRunner.page.evaluate(() => {
      return window['my-library']('foo')
    }, {});

    expect(result).toEqual('foo');
  });

  test('it should run in the browser, ESM style', async () => {
    const outDir = path.resolve(TMP, 'browser')
    const bundler = 'esbuild'
    const browserRunner = new ClientsideTestRunner({
      dist: outDir,
      driver: SupportedDriver.playwright,
      launch: chromium.launch.bind(chromium),
    })
    await browserRunner.beforeAll(() => bundle(bundler, outDir, {
      script: `
      import lib from 'my-library'
      export default lib
      `,
    }))
    const result = await browserRunner.page.evaluate(() => {
      return window['script']('foo')
    }, {});

    expect(result).toEqual('foo');
  });
})
```

## Bundlers

Testeroni offers bundlers for the following strategies:

- `esbuild`
- `webpack`
- `UMD`
- `Node`

Testeroni also offers the ability to test in the following environments:

- Clientside
  - via a browser, with Puppeteer
  - via a real browser, with Browserstack
- Serverside (Node.js)
