import {
  WebDriver,
  logging,
} from 'selenium-webdriver';
import type {
  BrowserOption,
} from './types.js';

export const printLogs = async (driver: WebDriver, capabilities: BrowserOption, verbose = false) => {
  if (capabilities?.browserName === 'firefox') {
    if (capabilities?.os === 'windows') {
      if (verbose) {
        console.log('Not printing logs, because it is Windows Firefox');
      }
      // There is a bug with Firefox not supporting the get logs method on Windows
      // https://stackoverflow.com/questions/59192232/selenium-trying-to-get-firefox-console-logs-results-in-webdrivererror-http-me
      // console.log('** Firefox on Windows does not support logging')
      return;
    }
    if (capabilities?.os === 'OS X') {
      if (verbose) {
        console.log('Not printing logs, because it is OS X Firefox');
      }
      // Firefox does not seem to support logging on OS X either
      // https://github.com/mozilla/geckodriver/issues/1698
      // console.log('** Firefox on OS X does not support logging')
      return;
    }
  }

  if (capabilities?.browserName === 'safari') {
    if (verbose) {
      console.log('Not printing logs, because it is Safari');
    }
    // It looks like Safari also does not support logging
    // console.log('** Safari does not support logging')
    return;
  }

  const logs = await driver.manage().logs().get(logging.Type.BROWSER);

  if (verbose) {
    console.log(`Got ${logs.length} logs`);
  }

  for (const entry of logs) {
    if (shouldPrintLogs(entry, capabilities)) {
      console.log('LOG [%s] %s', entry.level.name, entry.message, capabilities);
    } else if (verbose) {
      console.log('Skipping log');
    }
  }
};


function shouldPrintLogs(entry: logging.Entry, capabilities: BrowserOption) {
  if (entry.message.includes('favicon')) {
    return false;
  }

  // if running in IE, it appears TFJS is already available? Ignore warnings
  // about the TFJS backend already being registered
  return entry.level.name !== 'WARNING' && capabilities?.browserName !== 'edge';
}
