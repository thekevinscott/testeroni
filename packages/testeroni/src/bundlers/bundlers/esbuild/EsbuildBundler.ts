import path from 'path';
import { build as esbuild, } from 'esbuild';
import { Bundler, } from '../../utils/Bundler.js';
import { removeIfExists, } from '../../utils/remove-if-exists.js';
import { getTemplate as _getTemplate, } from '../../../common/get-template.js';
import { pnpmInstall, } from '../../../common/npm.js';
import { writeFile, } from '../../../common/fs.js';
import { info, } from '../../../common/logger.js';
import { writeIndexJS, } from '../../utils/write-index-js.js';
import { writePackageJSON, } from '../../utils/write-package-json.js';
import { DIST_ROOT, } from '../../utils/get-root.js';
import { getHashedName, } from '../../../common/get-hashed-name.js';
import type { BundleOptions, } from '../../types.js';
import { withWorkingDir, } from '../../utils/with-working-dir.js';
import { ESBuildBundleOptions } from './types.js';

/***
 * Constants
 */

const ESBUILD_ROOT_FOLDER = path.join(DIST_ROOT, './bundlers/bundlers/esbuild/');
const ESBUILD_TEMPLATES_DIR = path.resolve(ESBUILD_ROOT_FOLDER, '_templates');

const getTemplate = (
  templateName: string,
  args: Parameters<typeof _getTemplate>[1] = {}
) => _getTemplate(path.resolve(ESBUILD_TEMPLATES_DIR, templateName), args);

/***
 * Functions
 */

export class EsbuildBundler extends Bundler {
  port = 0;

  get name() { // skipcq: JS-0105
    return 'ESBuild Bundler';
  }

  static getHashedName(name: string) {
    return `_${getHashedName(name)}`;
  }

  async bundle({
    skipNpmInstall,
    keepWorkingFiles,
    title = this.name,
    dependencies = {},
    devDependencies = {},
    type = 'module',
    workingDir,
  }: ESBuildBundleOptions) {
    const dist = this.outDir;

    let indexJSEntryFile;
    let packageJSONPath;
    // const dist = path.resolve(this.outDir, this.dist);

    try {
      await withWorkingDir(async workingDir => {
        // this file produces the final js file
        indexJSEntryFile = path.resolve(workingDir, 'index.js');
        // this file is used to npm install dependencies
        packageJSONPath = path.resolve(workingDir, 'package.json');

        // this file is the final html file served to the user
        const indexHTMLFile = path.join(dist, 'index.html');
        info('Bundling esbuild...');
        const dependencyKeys = Array.from(new Set(Object.keys({
          ...dependencies,
          ...devDependencies,
        })));
        await Promise.all([
          writePackageJSON(getTemplate, packageJSONPath, {
            type,
            dependencies,
            devDependencies: {
              ...devDependencies,
              "@babel/plugin-transform-modules-commonjs": "7.22.5",
              "@babel/preset-typescript": "7.22.5",
            },
          }),
          writeIndexJS(getTemplate, indexJSEntryFile, dependencyKeys.map(name => {
            return [name, EsbuildBundler.getHashedName(name),];
          })),
          await writeFile(
            indexHTMLFile,
            await getTemplate('index.html.ejs', {
              title,
            }),
          ),
        ]);

        if (skipNpmInstall !== true) {
          info(`PNPM Install to ${this.outDir}...`);
          await pnpmInstall(this.outDir);
        }

        info(`Bundle the code for entry file ${indexJSEntryFile}`);
        await esbuild({
          entryPoints: [indexJSEntryFile,],
          absWorkingDir: path.resolve(this.outDir),
          bundle: true,
          loader: {
            '.png': 'file',
          },
          outdir: dist,
        });
        info(`successfully bundled the code for entry file ${indexJSEntryFile}`);

        info(`Bundled esbuild successfully to ${dist}`);
      }, workingDir);
    } finally {
      if (keepWorkingFiles !== true) {
        await Promise.all([
          packageJSONPath,
          indexJSEntryFile,
        ].map(removeIfExists));
      }
    }
  }
}
