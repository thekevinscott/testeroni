import path from 'path';
import { Bundler, } from '../../utils/Bundler.js';
import { writeFile, copyFile, } from '../../../common/fs.js';
import { info, } from '../../../common/logger.js';
import { getTemplate, } from '../../../common/get-template.js';
import { DIST_ROOT, } from '../../utils/get-root.js';
import type { BundleOptions, } from '../../types.js';
import { withWorkingDir } from '../../utils/with-working-dir.js';

/***
 * Constants
 */
const UMD_ROOT_FOLDER = path.join(DIST_ROOT, './bundlers/bundlers/umd/');

/***
 * Functions
 */

const writeIndexHTML = async (outDir: string, {
  title,
  dependencies,
}: {
  title: string;
  dependencies: string[];
}) => {
  const contents = await getTemplate(path.resolve(UMD_ROOT_FOLDER, '_templates/index.html.ejs'), {
    title,
    dependencies,
  });
  await writeFile(path.resolve(outDir, 'index.html'), contents);
};

export class UMDBundler extends Bundler {
  port = 0;
  usesRegistry = false;

  get name() { // skipcq: JS-0105
    return 'UMD Bundler';
  }

  async bundle({
    title = this.name,
    files: dependencies = [],
    // workingDir,
  }: Pick<BundleOptions, 'workingDir' | 'title' | 'files'>) {
    const workingDir = this.outDir;
    info('Bundling UMD...');
    await withWorkingDir(async (dist) => {
      await Promise.all([
        ...dependencies.map(async (pathToFile) => {
          return copyFile(pathToFile, path.join(dist, UMDBundler.getTargetFileName(pathToFile)));
        }),
        writeIndexHTML(dist, {
          title,
          dependencies: dependencies.map(UMDBundler.getTargetFileName),
        }),
      ]);

      info(`Bundled UMD successfully to ${dist}`);
    }, workingDir);
  }

  static getTargetFileName = (pathToFile: string) => {
    return pathToFile.split('/').join('_');
  };
}
