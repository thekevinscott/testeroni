import { existsSync, readFileSync } from 'fs-extra';
import { expect } from 'vitest';

export interface JSExpectations {
  regExps: RegExp[];
}

expect.extend({
  toMatchJS(filePath, {
    regExps,
  }) {
    const { isNot } = this;
    if (isNot) {
      throw new Error('isNot is not supported in matchJS expectations');
    }
    if (!existsSync(filePath)) {
      return {
        message: () => `File ${filePath} does not exist`,
        pass: false,
      };
    }
    const contents = readFileSync(filePath, 'utf-8');

    for (const regExp of regExps) {
      if (!regExp.test(contents)) {
        return {
          message: () => [
            `Expected ${filePath} to match ${regExp}`,
            '',
            contents,
          ].join('\n'),
          pass: false,
        };
      }
    }

    return {
      message: () => `Everything looks good`,
      pass: true
    };
  }
});
