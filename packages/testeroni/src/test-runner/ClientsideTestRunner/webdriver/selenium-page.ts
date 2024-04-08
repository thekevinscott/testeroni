import type {
  SeleniumDriver,
} from "../types.js";

export class SeleniumPage {
  driver: SeleniumDriver;
  constructor(driver?: SeleniumDriver) {
    if (!driver) {
      throw new Error('No driver provided');
    }
    this.driver = driver;
  }

  async waitForTitle(pageTitleToAwait: string) {
    const page = this.driver;
    await page.wait(async () => {
      const title = await page.getTitle();
      return title.endsWith(pageTitleToAwait);
    });
  }

  public async goto(url: string) {
    await this.driver.get(url);
  }
}

