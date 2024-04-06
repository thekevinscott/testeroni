import path from 'path';
import { Bundler, } from '../../utils/Bundler.js';
import { removeIfExists, } from '../../utils/remove-if-exists.js';
import { getTemplate as _getTemplate, } from '../../../common/get-template.js';
import { pnpmInstall, } from '../../../common/npm.js';
import { info, } from '../../../common/logger.js';
import { writePackageJSON, } from '../../utils/write-package-json.js';
import { DIST_ROOT, } from '../../utils/get-root.js';

/***
 * Constants
 */

const NODE_ROOT_FOLDER = path.join(DIST_ROOT, './bundlers/bundlers/node/');
const NODE_TEMPLATES_DIR = path.resolve(NODE_ROOT_FOLDER, '_templates');

const getTemplate = (
  templateName: string,
  args: Parameters<typeof _getTemplate>[1] = {}
) => _getTemplate(path.resolve(NODE_TEMPLATES_DIR, templateName), args);

/***
 * Functions
 */

export class NodeBundler extends Bundler {
  port = 0;

  get name() { // skipcq: JS-0105
    return 'node bundler';
  }

  async bundle({
    keepWorkingFiles,
    skipNpmInstall,
    dependencies = {},
    devDependencies = {},
    module = true,
  }: {
    module?: boolean;
    skipNpmInstall?: boolean;
    keepWorkingFiles?: boolean;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }) {
    info('Bundling Node...');
    const packageJSONPath = path.resolve(this.outDir, 'package.json');
    try {
      await writePackageJSON(getTemplate, packageJSONPath, {
        type: module ? 'module' : 'commonjs',
        dependencies,
        devDependencies: {
          ...devDependencies,
          "tslib": "2.6.1",
        },
      });

      if (skipNpmInstall !== true) {
        info(`PNPM Install to ${this.outDir}...`);
        await pnpmInstall(this.outDir, {
          // isSilent,
          // registryURL,
        });
      }

      info('Bundled Node successfully');
    } finally {
      if (keepWorkingFiles !== true) {
        await Promise.all([
          packageJSONPath,
        ].map(removeIfExists));
      }
    }
  }
}

