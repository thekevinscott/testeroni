import path from 'path';
import { build as esbuild, } from 'esbuild';
import { Bundler, } from '../utils/Bundler.js';
import { removeIfExists, } from '../utils/remove-if-exists.js';
import { getTemplate as _getTemplate, } from '../../common/get-template.js';
import { installPackages, } from '../../common/npm.js';
import { mkdirp, writeFile, } from '../../common/fs.js';
import { info, } from '../../common/logger.js';
import { writeIndexJS, } from '../utils/write-index-js.js';
import { writePackageJSON, } from '../utils/write-package-json.js';
import { DIST_ROOT, } from '../utils/get-root.js';
import { getHashedName, } from '../../common/get-hashed-name.js';
import { withWorkingDir, } from '../utils/with-working-dir.js';
import { ESBuildBundleOptions, } from './types.js';
import { withTmpDir, } from '../../common/tmp-dir.js';
export { ESBuildBundleOptions, } from './types.js';

/***
 * Constants
 */

const ESBUILD_ROOT_FOLDER = path.join(DIST_ROOT, './bundlers/esbuild/');
const ESBUILD_TEMPLATES_DIR = path.resolve(ESBUILD_ROOT_FOLDER, '_templates');

const getTemplate = (
  templateName: string,
  args: Parameters<typeof _getTemplate>[1] = {}
) => _getTemplate(path.resolve(ESBUILD_TEMPLATES_DIR, templateName), args);

export const DEFAULT_DEV_DEPENDENCIES = {
  "@babel/plugin-transform-modules-commonjs": "7.22.5",
  "@babel/preset-typescript": "7.22.5",
};
export const NAME = 'ESBuild Bundler';

/***
 * Functions
 */

export class ESBuildBundler extends Bundler {
  port = 0;

  get name() { // skipcq: JS-0105
    return NAME;
  }

  static getHashedName(name: string) {
    return `_${getHashedName(name)}`;
  }

  async bundle({
    skipPackageInstall,
    keepWorkingFiles,
    title = this.name,
    dependencies = {},
    devDependencies = {},
    type = 'module',
    workingDir,
    additionalConfiguration,
    silentPackageInstall,
    packageManager,
  }: ESBuildBundleOptions) {
    const outDir = this.outDir;

    let indexJSEntryFile: undefined | string;
    let packageJSONPath: undefined | string;
    // const dist = path.resolve(this.outDir, this.dist);
    let err: unknown;

    try {
      await withWorkingDir(async workingDir => {
        // this file produces the final js file
        indexJSEntryFile = path.join(workingDir, 'index.js');
        // this file is used to npm install dependencies
        packageJSONPath = path.join(workingDir, 'package.json');
        // this file is the final html file served to the user, I believe it is _not_ transformed
        const indexHTMLFile = path.join(outDir, 'index.html');

        // info('Bundling esbuild...');
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
              ...DEFAULT_DEV_DEPENDENCIES,
            },
          }),
          writeIndexJS(getTemplate, indexJSEntryFile, dependencyKeys.map(name => {
            return [name, ESBuildBundler.getHashedName(name),];
          })),
          writeFile(
            indexHTMLFile,
            await getTemplate('index.html.ejs', {
              title,
            }),
          ),
        ]);

        await Promise.all([
          mkdirp(outDir),
          mkdirp(workingDir),
        ]);
        if (skipPackageInstall !== true) {
          info(`[ESBuild] PNPM Install to ${workingDir}...`);
          await installPackages(workingDir, {
            isSilent: silentPackageInstall,
            packageManager,
          });
        }

        info(`[ESBuild] Bundle the code for entry file ${indexJSEntryFile}`);
        const entryPoints: string[] = [indexJSEntryFile,];
        await withTmpDir((absWorkingDir) => esbuild({
          entryPoints,
          absWorkingDir,
          bundle: true,
          ...additionalConfiguration,
          outdir: outDir,
        }));
        info(`[ESBuild] successfully bundled the code for entry file ${indexJSEntryFile}`);
      }, workingDir);
    } catch (_err) {
      err = _err;
    } finally {
      if (keepWorkingFiles !== true) {
        await Promise.all([
          packageJSONPath,
          indexJSEntryFile,
        ].map(removeIfExists));
      }
    }
    if (err) {
      throw err;
    }
  }
}
