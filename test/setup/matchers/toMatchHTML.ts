import { existsSync, readFileSync } from 'fs-extra';
import { expect } from 'vitest';

export interface HTMLExpectations {
  title: string;
  includes?: string[];
}

expect.extend({
  toMatchHTML(filePath, {
    title,
    includes = [],
  }) {
    const { isNot } = this;
    if (isNot) {
      throw new Error('isNot is not supported in match HTML expectations');
    }
    if (!existsSync(filePath)) {
      return {
        message: () => `File ${filePath} does not exist`,
        pass: false,
      };
    }
    const contents = readFileSync(filePath, 'utf-8');

    if (!contents.includes(`<title>${title}</title>`)) {
      return {
        message: () => [
          `Expected ${filePath} to include the title ${title} in the HTML contents.`,
          '',
          contents,
        ].join('\n'),
        pass: false,
      };
    }

    for (const include of includes) {
      if (!contents.includes(include)) {
        return {
          message: () => [
            `Expected ${filePath} to include ${include} in the HTML contents.`,
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
