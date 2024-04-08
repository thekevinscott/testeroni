import type {
  BrowserOption,
  FilterBrowserOption,
} from "./types";
import {
  browserStackOptions as browserOptions,
} from './browserStackOptions.js';

export const getBrowserOptions = (filter?: FilterBrowserOption): Array<BrowserOption> => browserOptions.filter(filter || Boolean);
