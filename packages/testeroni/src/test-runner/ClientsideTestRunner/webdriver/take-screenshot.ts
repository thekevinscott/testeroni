import { ThenableWebDriver, } from "selenium-webdriver";
import { writeFile, } from '../../../common/fs.js';

export const takeScreenshot = async (driver: ThenableWebDriver, target: string) => {
  const data = await driver.takeScreenshot();
  const base64Data = data.replace(/^data:image\/png;base64,/, "");
  return writeFile(target, base64Data, 'base64');
};
