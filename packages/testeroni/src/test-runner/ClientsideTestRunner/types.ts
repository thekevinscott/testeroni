import type {
  Browser as PuppeteerBrowser,
  Page as PuppeteerPage,
} from 'puppeteer';
import type {
  Browser as PlaywrightBrowser,
  Page as PlaywrightPage,
} from 'playwright';
export enum SupportedDriver {
  'puppeteer',
  'playwright',
}
export type Browser<D extends SupportedDriver> = D extends SupportedDriver.puppeteer ? PuppeteerBrowser : PlaywrightBrowser;
export type Page<D extends SupportedDriver> = D extends SupportedDriver.puppeteer ? PuppeteerPage : PlaywrightPage;
