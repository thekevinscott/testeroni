import { timeit, } from '../utils/timeit.js';
// import { catchFailures, } from '../utils/catchFailures.js';
import { HttpServer, } from '../../http-server/HttpServer.js';
import {
  Mock,
  SupportedDriver,
  type Browser,
  type Page,
} from './types.js';
import { Driver, } from './Driver.js';
import {
  isPlaywright,
  isPuppeteer,
  isSelenium,
} from './type-guards.js';
import type { SeleniumPage, } from './webdriver/selenium-page.js';
import { info, } from '../../common/logger.js';
// import { mockCdn, } from './mock-cdn.js';

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type Bundle = () => Promise<void | unknown>;

const DEFAULT_PORT = 0;

const USE_TUNNEL = process.env.useTunnel === '1';

export type AfterEachCallback = () => Promise<unknown>;

const getURL = (server?: HttpServer) => {
  if (!server) {
    throw new Error('No server defined');
  }
  const url = server.url;
  if (!url) {
    throw new Error('Server URL is not defined');
  }
  return url;
};


export class ClientsideTestRunner<D extends SupportedDriver> {
  trackTime: boolean;
  showWarnings: boolean;
  log: boolean;
  port: number;
  dist?: string;
  useTunnel: boolean;
  private mock?: Mock<D>;
  private _server: HttpServer | undefined;
  private _fixtures: HttpServer | undefined;
  private _name?: string;
  private driver: Driver<D>;

  constructor({
    name,
    driver,
    launch,
    mock,
    dist,
    port = DEFAULT_PORT,
    trackTime = false,
    log = true,
    showWarnings = false,
    useTunnel = USE_TUNNEL,
  }: {
    name?: string;
    driver: D,
    launch: () => Promise<Browser<D>>;
    mock?: Mock<D>;
    dist?: string;
    port?: number;
    trackTime?: boolean;
    log?: boolean;
    showWarnings?: boolean;
    useTunnel?: boolean;
  }) {
    this.driver = new Driver<D>(driver, launch);
    this._name = name;
    this.mock = mock;
    this.dist = dist;
    this.showWarnings = showWarnings;
    this.trackTime = trackTime;
    this.port = port;
    this.log = log;
    this.useTunnel = useTunnel;
  }

  /****
   * Getters and setters
   */

  getServerURL = () => getURL(this.server);
  getFixturesServerURL = () => getURL(this.fixturesServer);

  get server(): HttpServer {
    if (!this._server) {
      throw new Error('Server is undefined');
    }
    return this._server;
  }

  set server(server: HttpServer | undefined) {
    if (server && this._server) {
      throw new Error(this._getLogMessage('Server is already active'));
    }
    this._server = server;
  }

  get fixturesServer(): HttpServer {
    if (!this._fixtures) {
      throw new Error('Fixtures server is undefined');
    }
    return this._fixtures;
  }

  set fixturesServer(fixtures: HttpServer | undefined) {
    if (fixtures && this._fixtures) {
      throw new Error(this._getLogMessage('Fixtures Server is already active'));
    }
    this._fixtures = fixtures;
  }

  get browser(): Browser<D> {
    if (!this.driver.browser) {
      throw new Error('Browser is undefined');
    }
    return this.driver.browser;
  }
  set browser(browser: Browser<D> | undefined) {
    if (browser && this.browser) {
      throw new Error('Browser is already active');
    }
    this.driver.browser = browser;
  }

  get page(): Page<D> {
    if (!this.driver.page) {
      throw new Error('Page is undefined');
    }
    if ((isPlaywright(this.driver.name) || isPuppeteer(this.driver.name))) {
      const page = this.driver.page as Page<SupportedDriver.puppeteer | SupportedDriver.playwright>;
      if (page.isClosed() === true) {
        throw new Error('Page is already closed; did you forget to close and restart the browser?');
      }
    }
    return this.driver.page;
  }
  set page(page: Page<D> | undefined) {
    this.driver.page = page;
  }

  /****
   * Utility methods
   */

  private _getLogMessage(msg: string) {
    return [msg, this._name,].filter(Boolean).join(' | ');
  }

  private _warn(msg: string) {
    if (this.showWarnings) {
      console.warn(this._getLogMessage(msg));// skipcq: JS-0002
    }
  }

  public async waitForTitle(pageTitleToAwait: string) {
    return this.driver.waitForTitle(pageTitleToAwait);
  }

  public async goto(url: string) {
    const page = isPuppeteer(this.driver.name) ? this.page as Page<SupportedDriver.puppeteer> : isPlaywright(this.driver.name) ? this.page as Page<SupportedDriver.playwright> : isSelenium(this.driver.name) ? this.page as SeleniumPage : undefined;
    if (page === undefined) {
      throw new Error(`Page is undefined, invalid driver: ${this.driver.name}`);
    }
    if (url.startsWith('http')) {
      await page.goto(url);
    } else {
      const serverURL = this.getServerURL();
      // TODO: Join this more effectively
      await page.goto(`${serverURL}${url}`);
    }
  }

  public async navigateToServer(pageTitleToAwait: string | null) {
    const url = this.getServerURL();
    await this.goto(url);
    if (pageTitleToAwait !== null) {
      const timer = setTimeout(() => {
        info(`Waiting for title ${pageTitleToAwait}...`);
      }, 1000);
      try {
        await this.waitForTitle(pageTitleToAwait);
      } finally {
        clearTimeout(timer);
      }
    }
  }

  /****
   * Start and stop methods
   */

  async startServers({ dist: _dist, name, }: { dist?: string; name?: string } = {}): Promise<void> {
    const dist = _dist || this.dist;
    if (!dist) {
      throw new Error('No dist was supplied, either in the constructor to ClientsideTestRunner or as an argument to startServers. Please explicitly provide a dist argument');
    }
    this.server = new HttpServer({
      name: name || this._name,
      port: this.port,
      dist,
      useTunnel: this.useTunnel,
    });

    this.fixturesServer = new HttpServer({
      name: `${this._name}-fixtures`,
      dist: './',
      useTunnel: this.useTunnel,
    });

    // Note: these must be done sequentially; there's a race condition bug in tunnelmole
    const timer = setTimeout(() => {
      throw new Error('Could not start servers within 3 seconds');
    }, 3000);

    await this.fixturesServer.start();
    await this.server.start();

    clearTimeout(timer);
  }

  async stopServers(): Promise<void> {
    const stopServer = async (server?: HttpServer) => {
      if (!server) {
        this._warn('No server found');
      } else {
        await server.close();
      }
    };
    await Promise.all([
      stopServer(this.server),
      stopServer(this.fixturesServer),
    ]);
    this.server = undefined;
    this.fixturesServer = undefined;
  }

  public async startBrowser() {
    await this.driver.startBrowser();
  }

  private attachLogger() {
    if (this.log) {
      this.driver.attachLogger();
    }
  }

  private async bootstrapCDN() {
    // const server = this.fixturesServer;
    if (this.mock) {
      await this.mock(this.page);
      // if (isPuppeteer(this.driver)) {
      //   // TODO: Replace this with generic cdn code
      //   const page = this.page as Page<SupportedDriver.puppeteer>;
      //   await page.setRequestInterception(true);
      //   page.on('request', (request) => {
      //     const url = request.url();

      //     // this is a request for a model
      //     if (url.includes('@upscalerjs')) {
      //       const modelPath = url.split('@upscalerjs/').pop()?.split('@');
      //       if (!modelPath?.length) {
      //         throw new Error(`URL ${url} is not a model`);
      //       }
      //       const [model, restOfModelPath,] = modelPath;
      //       // eslint-disable-next-line @typescript-eslint/no-unused-vars
      //       const [_, ...pathToModel] = restOfModelPath.split('/');
      //       const redirectedURL = mockCdn(server, model, pathToModel.join('/'));
      //       // console.log(`mock request ${url} to ${redirectedURL}`);
      //       void request.continue({
      //         url: redirectedURL,
      //       });
      //     } else {
      //       void request.continue();
      //     }
      //   });
      // } else {
      //   throw new Error('CDN mocking not yet supported for playwright or selenium');
      // }
    }
  }

  public async createNewPage(log: boolean) {
    await this.driver.createNewPage();
    if (log) {
      this.attachLogger();
    }
    await this.bootstrapCDN();
  }

  public async closeBrowser() {
    try {
      await this.browser.close();
      this.browser = undefined;
    } catch (err) {
      this._warn('No browser found');
    }
  }

  private closeContext() {
    try {
      this.page = undefined;
    } catch (err) {
      this._warn('No context found');
    }
  }

  // private _makeOpts(): Opts {
  //   return {
  //     verbose: this._verbose,
  //     usePNPM: this._usePNPM,
  //   }
  // }

  /****
   * Test lifecycle methods
   */

  // @catchFailures()
  @timeit<[Bundle], ClientsideTestRunner<D>>('beforeAll scaffolding')
  async beforeAll(bundle?: Bundle) {
    // const opts = this._makeOpts();
    const _bundle = async () => {
      if (bundle) {
        await bundle();
        // await bundle(opts);
      }
      return this.startServers();
    };
    await Promise.all([
      _bundle(),
      this.startBrowser(),
    ]);
  }

  // @catchFailures()
  @timeit('afterAll clean up')
  async afterAll() {
    await Promise.all([
      this.stopServers(),
      this.closeBrowser(),
    ]);
  }

  // @catchFailures()
  @timeit<[string], ClientsideTestRunner<D>>('beforeEach scaffolding')
  async beforeEach(pageTitleToAwait: string | null = '| Loaded', log?: boolean) {
    await this.createNewPage(log || !isSelenium(this.driver.name));
    await this.navigateToServer(pageTitleToAwait);
  }

  // @catchFailures()
  @timeit<[AfterEachCallback], ClientsideTestRunner<D>>('afterEach clean up')
  async afterEach(callback?: AfterEachCallback) {
    await Promise.all([
      this.closeContext(),
      callback ? callback() : undefined,
    ]);
  }
}

