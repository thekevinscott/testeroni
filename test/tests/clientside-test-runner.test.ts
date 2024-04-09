import {
  ClientsideTestRunner,
  SupportedDriver,
  Launch,
  getDriver,
} from "testeroni";
import webdriver from 'selenium-webdriver';
import { describe, test, expect, } from "vitest";
import puppeteer from "puppeteer";
import { chromium, webkit, firefox, } from "playwright";
import { getBrowserOptions } from "testeroni";

// getDriver(getBrowserOptions()[0], {
//   username: 'username',
//   accessKey: 'accessKey',
//   build: 'build',
//   project: 'project',
// })],
class MockSeleniumBuilder {
  async get(url: string) {
  }
}
describe('ClientsideTestRunner', () => {
  const drivers = [
    ['puppeteer', SupportedDriver.puppeteer, puppeteer.launch],
    ['playwright: chromium', SupportedDriver.playwright, chromium.launch.bind(chromium)],
    // TODO: Re-enable webkit
    // ['playwright: webkit', SupportedDriver.playwright, webkit.launch.bind(webkit)],
    ['playwright: firefox', SupportedDriver.playwright, firefox.launch.bind(firefox)],
    ['selenium', SupportedDriver.selenium, () => new MockSeleniumBuilder(),],
    // ['selenium', SupportedDriver.selenium, () => new webdriver.Builder().build(),],
  ] as [string, SupportedDriver, Launch<SupportedDriver>][];

  test.each(drivers)('it instantiates for %s', (_, driver, launch) => {
    new ClientsideTestRunner({
      dist: './',
      driver,
      launch,
    });
  });

  test.each(drivers)('it creates browser for %s', async (_, driver, launch) => {
    const runner = new ClientsideTestRunner({
      dist: './',
      driver,
      launch,
    });
    await runner.beforeAll();
    expect(runner.browser).toBeDefined();
  });

  test.each(drivers)('it creates page for %s', async (_, driver, launch) => {
    const runner = new ClientsideTestRunner({
      dist: './',
      driver,
      launch,
    });
    await runner.beforeAll();
    await runner.beforeEach(null);
    expect(runner.page).toBeDefined();
  });
});
