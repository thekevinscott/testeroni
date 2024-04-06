import path from 'path';
import { Bundler, } from '../../utils/Bundler.js';
import { writeFile, copyFile, } from '../../../common/fs.js';
import { info, } from '../../../common/logger.js';
import { getTemplate, } from '../../../common/get-template.js';
import { DIST_ROOT, } from '../../utils/get-root.js';

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
    dependencies = [],
  }: {
    title?: string;
    dependencies?: string[];
  }) {
    info('Bundling UMD...');
    const dist = path.resolve(this.outDir, this.dist);

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
  }

  static getTargetFileName(pathToFile: string) {
    return pathToFile.split('/').join('_');
  }
}
