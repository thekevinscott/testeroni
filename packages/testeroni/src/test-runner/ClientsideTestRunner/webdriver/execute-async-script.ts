import type {
  WebDriver,
} from "selenium-webdriver";

export async function executeAsyncScript<T, A extends Record<string, unknown>>(driver: WebDriver, fn: (args: A) => T, args: A, {
  pollTime = 100,
  timeout = 60 * 1000 * 5,
}: {
  pollTime?: number;
  timeout?: number;
} = {}): Promise<T> {
  const wait = (d: number) => new Promise(r => setTimeout(r, d));
  const localKey = `___result_${Math.random()}___`;
  const errorKey = `___result_${Math.random()}___`;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const mainFn = new Function(`
    const main = ${fn.toString()}
    main(...arguments).then((result) => {
      window['${localKey}'] = result;
    }).catch(err => {
      window['${errorKey}'] = err.message;
    });
  `);
  try {
    await driver.executeScript(mainFn, args);
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Error executing main script: ${err.message}`);
    } else {
      throw err;
    }
  }
  let response: T | undefined;
  let err: string | undefined;
  const start = performance.now();
  while (!response && !err) {
    if (performance.now() - start > timeout) {
      throw new Error(`Failed to execute script after ${timeout} ms`);
    }
    try {
      response = await driver.executeScript<T | undefined>((localKey: string) => window[localKey], localKey);
    } catch (err) {
      console.error(`Error executing script (duration: ${performance.now() - start})`, err);
    }
    if (!response) {
      err = await driver.executeScript<string | undefined>((errorKey: string) => window[errorKey], errorKey);
      if (err) {
        console.log('An error was returned', err);
        throw new Error(err);
      }
    }
    await wait(pollTime);
  }
  if (!response) {
    throw new Error('Bug with code');
  }
  return response;
}


// When checking for the errorKey or localKey variables on the window object above,
// we need to declare that window can adopt any kind of variable
declare global {
  interface Window {
    [index: string]: unknown;
  }
}
