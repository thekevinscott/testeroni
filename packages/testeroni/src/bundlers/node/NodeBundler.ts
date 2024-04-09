import path from 'path';
import { Bundler, } from '../utils/Bundler.js';
import { removeIfExists, } from '../utils/remove-if-exists.js';
import { getTemplate as _getTemplate, } from '../../common/get-template.js';
import { pnpmInstall, } from '../../common/npm.js';
import { info, } from '../../common/logger.js';
import { writePackageJSON, } from '../utils/write-package-json.js';
import { DIST_ROOT, } from '../utils/get-root.js';
import { withWorkingDir, } from '../utils/with-working-dir.js';
import { NodeBundleOptions, } from './types.js';
export { NodeBundleOptions, } from './types.js';

/***
 * Constants
 */

const NODE_ROOT_FOLDER = path.join(DIST_ROOT, './bundlers/bundlers/node/');
const NODE_TEMPLATES_DIR = path.resolve(NODE_ROOT_FOLDER, '_templates');
export const NAME = 'Node Bundler';

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
    return NAME;
  }

  async bundle({
    keepWorkingFiles,
    skipNpmInstall,
    dependencies = {},
    devDependencies = {},
    module = true,
    // workingDir,
  }: NodeBundleOptions) {
    info('Bundling Node...');
    const workingDir = this.outDir;
    await withWorkingDir(async (workingDir) => {
      const packageJSONPath = path.resolve(workingDir, 'package.json');
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
          info(`PNPM Install to ${workingDir}...`);
          await pnpmInstall(workingDir, {
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
    }, workingDir);
  }
}

