import type { Page } from 'puppeteer';
import type { Assertion, AsymmetricMatchersContaining } from 'vitest'
import type { HTMLExpectations } from './matchers/toMatchHTML.js';
import type { PackageJSONExpectations } from './matchers/toMatchPackageJSON.js';
import type { JSExpectations } from './matchers/toMatchJS.js';

interface CustomMatchers<R = unknown, A = unknown> {
  toMatchHTML(args: HTMLExpectations): R;
  toMatchPackageJSON(args: PackageJSONExpectations): R;
  toMatchJS(args: JSExpectations): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> { }
  interface AsymmetricMatchersContaining extends CustomMatchers { }
}
