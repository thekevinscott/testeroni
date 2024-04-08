import webdriver, {
  ThenableWebDriver,
  logging,
} from 'selenium-webdriver';
import { getServerURL, } from './constants.js';
import {
  getDefaultCapabilities,
} from './constants.js';
import type {
  Capabilities,
} from '../types.js';

const prefs = new logging.Preferences();
prefs.setLevel(logging.Type.BROWSER, logging.Level.INFO);


export const getDriver = (capabilities: Capabilities, {
  verbose,
  env: {
    username,
    accessKey,
    build,
    project,
  },
}: {
  verbose?: boolean,
  env: {
    username: string;
    accessKey: string;
    build: string;
    project: string;
  }
}): ThenableWebDriver => new webdriver.Builder()
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
