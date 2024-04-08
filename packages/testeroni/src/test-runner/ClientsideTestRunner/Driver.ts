import {
  SupportedDriver,
  type Browser,
  type Page,
} from './types.js';
import { isIgnoredMessage, } from '../utils/message.js';
import type {
  HttpServer,
} from '../../http-server/HttpServer.js';
import {
  mockCdn,
} from './mock-cdn.js';
import {
  SeleniumDriver,
} from './types.js';
import {
  SeleniumPage,
} from './webdriver/index.js';
import {
  isPlaywright,
  isPuppeteer,
  isSelenium,
} from './type-guards.js';

export class Driver<D extends SupportedDriver> {
  public name: D;
  private launch: () => Promise<Browser<D>>;
  private _browser: Browser<D> | undefined;
  private _page: Page<D> | undefined;

  constructor(name: D, launch: () => Promise<Browser<D>>) {
    this.name = name;
    this.launch = launch;
  }

  public attachLogger() {
    if (isPuppeteer(this.name)) {
      const page = this.page as Page<SupportedDriver.puppeteer>;
      page.on('console', message => {
        const type = message.type();
        const text = message.text();
        if (!isIgnoredMessage(text)) {
          console.log(`[PAGE][${type}] ${text}`);
        }
      })
        .on('pageerror', ({ message, }) => console.log(message))
        .on('response', response => {
          const status = response.status();
          if (`${status}` !== `${200}`) {
            console.log(`[PAGE][response][${status}] ${response.url()}`);
          }
        })
        .on('requestfailed', request => {
          console.log(`[PAGE][requestfailed][${request.failure()?.errorText}] ${request.url()}`);
        });
    } else {
      throw new Error('Logging not yet supported for playwright or selenium');
    }
  }

  public async bootstrapCDN(server: HttpServer) {
    if (isPuppeteer(this.name)) {
      // TODO: Replace this with generic cdn code
      const page = this.page as Page<SupportedDriver.puppeteer>;
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();

        // this is a request for a model
        if (url.includes('@upscalerjs')) {
          const modelPath = url.split('@upscalerjs/').pop()?.split('@');
          if (!modelPath?.length) {
            throw new Error(`URL ${url} is not a model`);
          }
          const [model, restOfModelPath,] = modelPath;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const [_, ...pathToModel] = restOfModelPath.split('/');
          const redirectedURL = mockCdn(server, model, pathToModel.join('/'));
          // console.log(`mock request ${url} to ${redirectedURL}`);
          void request.continue({
            url: redirectedURL,
          });
        } else {
          void request.continue();
        }
      });
    } else {
      throw new Error('CDN mocking not yet supported for playwright or selenium');
    }
  }

  public async createNewPage() {
    if (isPuppeteer(this.name)) {
      const browser = this.browser as Browser<SupportedDriver.puppeteer>;
      const context = await browser.createBrowserContext({
      });
      this.page = await context.newPage() as Page<D>;
    } else if (isPlaywright(this.name)) {
      const browser = this.browser as Browser<SupportedDriver.playwright>;
      this.page = await browser.newPage() as Page<D>;
    } else if (isSelenium(this.name)) {
      const browser = this.browser as SeleniumDriver;
      this.page = new SeleniumPage(browser) as Page<D>;
    }
  }

  public async waitForTitle(pageTitleToAwait: string) {
    if (isPuppeteer(this.name)) {
      const page = this.page as Page<SupportedDriver.puppeteer>;
      await page.waitForFunction(`document.title.endsWith("${pageTitleToAwait}")`);
    } else if (isPlaywright(this.name)) {
      const page = this.page as Page<SupportedDriver.playwright>;
      await page.waitForFunction(`document.title.endsWith("${pageTitleToAwait}")`);
    } else if (isSelenium(this.name)) {
      const page = this.page as SeleniumPage;
      await page.waitForTitle(`document.title.endsWith("${pageTitleToAwait}")`);
    }
  }

  public async startBrowser() {
    this.browser = await this.launch();
  }

  set browser(browser: Browser<D> | undefined) {
    this._browser = browser;
  }
  get browser() {
    return this._browser;
  }
  set page(page: Page<D> | undefined) {
    if (page && this._page) {
      throw new Error('Page is already active');
    }
    this._page = page;
  }
  get page() {
    return this._page;
  }
}
