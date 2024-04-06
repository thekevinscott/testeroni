import path from 'path';
import { Bundler, } from '../../utils/Bundler.js';
import webpack, { Configuration, WebpackPluginInstance, } from 'webpack';
import { removeIfExists, } from '../../utils/remove-if-exists.js';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { info, verbose, } from '../../../common/logger.js';
import { getTemplate as _getTemplate, } from '../../../common/get-template.js';
import { copyFile, } from '../../../common/fs.js';
import { pnpmInstall, } from '../../../common/npm.js';
import { writeIndexJS, } from '../../utils/write-index-js.js';
import { writePackageJSON, } from '../../utils/write-package-json.js';
import { DIST_ROOT, } from '../../utils/get-root.js';
import { getHashedName, } from '../../../common/get-hashed-name.js';
import { existsSync, readFileSync, } from 'fs-extra';

/***
 * Constants
 */

const WEBPACK_ROOT_FOLDER = path.join(DIST_ROOT, './bundlers/bundlers/webpack/');
const WEBPACK_TEMPLATES_DIR = path.resolve(WEBPACK_ROOT_FOLDER, '_templates');

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
    return 'Webpack Bundler';
  }

  static getHashedName(name: string) {
    return `_${getHashedName(name)}`;
  }

  async bundle({
    keepWorkingFiles,
    skipNpmInstall,
    title = this.name,
    dependencies = {},
    devDependencies = {},
    type = 'module',
  }: {
    type?: 'module' | 'commonjs';
    title?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    skipNpmInstall?: boolean;
    keepWorkingFiles?: boolean;
  }) {
    const dist = path.resolve(this.outDir, this.dist);
    const indexJSEntryFile = path.resolve(this.outDir, 'index.js');
    const packageJSONPath = path.resolve(this.outDir, 'package.json');
    const indexHTMLFile = path.resolve(this.outDir, 'index.html');

    try {
      info('Bundling Webpack...');

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

      if (skipNpmInstall !== true) {
        info(`PNPM Install to ${this.outDir}...`);
        await pnpmInstall(this.outDir);
      }

      info(`Bundle the code for entry file ${indexJSEntryFile}`);

      const htmlWebpackPlugin: WebpackPluginInstance = new HtmlWebpackPlugin({
        title,
        template: indexHTMLFile,
      });

      const config: Configuration = {
        mode: 'production',
        context: this.outDir,
        entry: indexJSEntryFile,
        stats: 'errors-only',
        plugins: [htmlWebpackPlugin,],
        output: {
          path: dist,
        },
        module: {
          rules: [
            {
              test: /\.(png|svg|jpg|jpeg|gif|json|bin)$/i,
              type: 'asset/resource',
            },
          ],
        },
      };

      const compiler = webpack(config);

      verbose('Running webpack compiler');
      await compileWebpack(compiler);

      info(`successfully bundled the code for entry file ${indexJSEntryFile}`);
    } finally {
      if (keepWorkingFiles !== true) {
        await Promise.all([
          packageJSONPath,
          indexHTMLFile,
          indexJSEntryFile,
        ].map(removeIfExists));
      }
    }
  }
}

