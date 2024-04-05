import { existsSync, readFileSync } from 'fs-extra';
import { expect } from 'vitest';

export interface PackageJSONExpectations {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  type?: string;
}

expect.extend({
  toMatchPackageJSON(filePath, {
    dependencies,
    devDependencies,
    type = 'module',
  }) {
    const { isNot } = this;
    if (isNot) {
      throw new Error('isNot is not supported in matchPackageJSON expectations');
    }
    if (!existsSync(filePath)) {
      return {
        message: () => `File ${filePath} does not exist`,
        pass: false,
      };
    }
    let packageJSON: any;
    try {
      packageJSON = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (err) {
      return {
        message: () => [
          `File ${filePath} is not a valid JSON file`,
          '',
          readFileSync(filePath, 'utf-8'),
        ].join('\n'),
        pass: true
      };
    }

    for (const [name, deps] of [['dependencies', dependencies], ['devDependencies', devDependencies]]) {
      if (deps) {
        for (const [key, value] of Object.entries(deps)) {
          if (packageJSON[name][key] !== value) {
            return {
              message: () => [
                `Expected ${filePath} ${name} to include  ${key} with the version ${value}.`,
                '',
                packageJSON,
              ].join('\n'),
              pass: false,
            };
          }
        }
      }
    }

    if (packageJSON.type !== type) {
      return {
        message: () => [
          `Expected ${filePath} to have type ${type}.`,
          '',
          packageJSON,
        ].join('\n'),
        pass: false,
      };
    }

    return {
      message: () => `Everything looks good`,
      pass: true
    };
  }
});
