# Testeroni

Tools for performing integration tests across a variety of environments for Javascript libraries.

This library assumes the use of `vitest`, although maybe `jest` works too, I don't know.

## Usage

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

## Usage

Maybe some day I'll write some proper documentation.

In the meantime, check out [this repo](https://github.com/thekevinscott/Contortionist/tree/main/test) for an example that leverages this library.
