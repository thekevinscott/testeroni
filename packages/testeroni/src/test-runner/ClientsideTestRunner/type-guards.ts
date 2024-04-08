import { SupportedDriver, } from "./types.js";

export const isPuppeteer = (driver: SupportedDriver): driver is SupportedDriver.puppeteer => driver === SupportedDriver.puppeteer;
export const isPlaywright = (driver: SupportedDriver): driver is SupportedDriver.playwright => driver === SupportedDriver.playwright;
export const isSelenium = (driver: SupportedDriver): driver is SupportedDriver.selenium => driver === SupportedDriver.selenium;
