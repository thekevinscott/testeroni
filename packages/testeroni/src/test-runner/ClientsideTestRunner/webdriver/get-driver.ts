import type {
  ThenableWebDriver,
} from 'selenium-webdriver';
import { getServerURL, } from './constants.js';
import {
  getDefaultCapabilities,
} from './constants.js';
import type {
  Capabilities,
} from '../types.js';

export const getDriver = async (capabilities: Capabilities, {
  username,
  accessKey,
  build,
  project,
}: {
  username: string;
  accessKey: string;
  build: string;
  project: string;
}, {
  verbose,
}: {
  verbose?: boolean,
} = {}): Promise<ThenableWebDriver> => {
  const { default: webdriver, logging, } = await import('selenium-webdriver');
  const prefs = new logging.Preferences();
  prefs.setLevel(logging.Type.BROWSER, logging.Level.INFO);

  return new webdriver.Builder()
    .usingServer(getServerURL(username, accessKey))
    .setLoggingPrefs(prefs)
    .withCapabilities({
      ...getDefaultCapabilities({
        build,
        project,
      }),
      ...capabilities,
      verbose,
    })
    .build();
};
