import path from 'path';
import { Bundler, } from '../utils/Bundler.js';
import webpack, { Configuration, WebpackPluginInstance, } from 'webpack';
import { removeIfExists, } from '../utils/remove-if-exists.js';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { info, verbose, } from '../../common/logger.js';
import { getTemplate as _getTemplate, } from '../../common/get-template.js';
import { copyFile, mkdirp, } from '../../common/fs.js';
import { installPackages, } from '../../common/npm.js';
import { writeIndexJS, } from '../utils/write-index-js.js';
import { writePackageJSON, } from '../utils/write-package-json.js';
import { DIST_ROOT, } from '../utils/get-root.js';
import { getHashedName, } from '../../common/get-hashed-name.js';
import { withWorkingDir, } from '../utils/with-working-dir.js';
import { WebpackBundleOptions, } from './types.js';
export { WebpackBundleOptions, } from './types.js';

/***
 * Constants
 */

const WEBPACK_ROOT_FOLDER = path.join(DIST_ROOT, './bundlers/webpack/');
const WEBPACK_TEMPLATES_DIR = path.resolve(WEBPACK_ROOT_FOLDER, '_templates');
export const NAME = 'Webpack Bundler';

/***
 * Functions
 */

const getTemplate = (
  templateName: string,
  args: Parameters<typeof _getTemplate>[1] = {}
) => _getTemplate(path.resolve(WEBPACK_TEMPLATES_DIR, templateName), args);

const compileWebpack = (compiler: webpack.Compiler) => new Promise<void>((resolve, reject) => compiler.run((err, stats) => {
  if (err) {
    return reject(err);
  }
  if (stats?.hasErrors()) {
    return reject(new Error(stats?.toJson('errors-only').errors?.map(e => e.message).join('\n')));
  }
  return resolve();
}));

export class WebpackBundler extends Bundler {
  port = 0;

  get name() { // skipcq: JS-0105
    return NAME;
  }

  static getHashedName(name: string) {
    return `_${getHashedName(name)}`;
  }

  async bundle({
    keepWorkingFiles,
    skipPackageInstall,
    title = this.name,
    dependencies = {},
    devDependencies = {},
    type = 'module',
    workingDir,
    additionalConfiguration,
    silentPackageInstall,
    packageManager,
  }: WebpackBundleOptions) {
    // const dist = path.resolve(this.outDir, this.dist);
    // const dist = path.resolve(this.outDir);

    let indexJSEntryFile;
    let packageJSONPath;
    let indexHTMLFile;
    let err: unknown;
    try {
      // info('Bundling Webpack...');
      await withWorkingDir(async (workingDir) => {
        indexJSEntryFile = path.resolve(workingDir, 'index.js');
        packageJSONPath = path.resolve(workingDir, 'package.json');
        indexHTMLFile = path.resolve(workingDir, 'index.html');

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
              "html-webpack-plugin": "5.5.3",
              "webpack": "5.88.2",
              "@babel/plugin-transform-modules-commonjs": "latest",
              "@babel/preset-env": "latest",
              "@babel/preset-typescript": "latest",
            },
          }),
          writeIndexJS(getTemplate, indexJSEntryFile, dependencyKeys.map(name => {
            return [name, WebpackBundler.getHashedName(name),];
          })),
          copyFile(
            path.resolve(WEBPACK_TEMPLATES_DIR, 'index.html.ejs'),
            indexHTMLFile,
          ),
        ]);

        await Promise.all([
          mkdirp(this.outDir),
          mkdirp(workingDir),
        ]);
        if (skipPackageInstall !== true) {
          info(`[Webpack] PNPM Install to ${workingDir}...`);
          await installPackages(workingDir, {
            isSilent: silentPackageInstall,
            packageManager,
          });
        }

        info(`[Webpack] Bundle the code for entry file ${indexJSEntryFile}`);

        const htmlWebpackPlugin: WebpackPluginInstance = new HtmlWebpackPlugin({
          title,
          template: indexHTMLFile,
        });

        // TODO: Support deep merge here for webpack
        const config: Configuration = {
          mode: 'production',
          context: workingDir,
          entry: indexJSEntryFile,
          stats: 'errors-only',
          plugins: [
            htmlWebpackPlugin,
          ],
          output: {
            path: this.outDir,
          },
          module: {
            rules: [
              {
                test: /\.(png|svg|jpg|jpeg|gif|json|bin)$/i,
                type: 'asset/resource',
              },
            ],
          },
          ...additionalConfiguration,
        };

        const compiler = webpack(config);

        verbose('Running webpack compiler');
        await compileWebpack(compiler);

        // info(`successfully bundled the code for entry file ${indexJSEntryFile}`);
      }, workingDir);
    } catch (_err) {
      err = _err;
    } finally {
      if (keepWorkingFiles !== true) {
        await Promise.all([
          packageJSONPath,
          indexHTMLFile,
          indexJSEntryFile,
        ].map(removeIfExists));
      }
    }
    if (err) {
      throw err;
    }
  }
}

