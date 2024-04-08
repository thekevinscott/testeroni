import type {
  Browser as PuppeteerBrowser,
  Page as PuppeteerPage,
} from 'puppeteer';
import type {
  Browser as PlaywrightBrowser,
  Page as PlaywrightPage,
} from 'playwright';
import type {
  Builder,
  ThenableWebDriver,
  WebDriver,
} from 'selenium-webdriver';
import type {
  SeleniumPage,
} from './webdriver/selenium-page';
export enum SupportedDriver {
  'puppeteer' = 'puppeteer',
  'playwright' = 'playwright',
  'selenium' = 'selenium',
}
export type Browser<D extends SupportedDriver> =
  D extends SupportedDriver.puppeteer
  ? PuppeteerBrowser
  : D extends SupportedDriver.playwright
  ? PlaywrightBrowser
  : D extends SupportedDriver.selenium
  ? SeleniumDriver
  : never;

export type Page<D extends SupportedDriver> =
  D extends SupportedDriver.puppeteer
  ? PuppeteerPage
  : D extends SupportedDriver.playwright
  ? PlaywrightPage
  : D extends SupportedDriver.selenium
  ? SeleniumPage
  : never;

export type Launch<D extends SupportedDriver> = () => Promise<Browser<D>>;

export type Capabilities = Parameters<Builder['withCapabilities']>[0];

export type SeleniumDriver = WebDriver | ThenableWebDriver;
export type Mock<D extends SupportedDriver> = (page: Page<D>) => (Promise<void> | void);
