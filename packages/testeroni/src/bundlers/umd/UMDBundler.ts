import path from 'path';
import { Bundler, } from '../utils/Bundler.js';
import { writeFile, copyFile, exists, } from '../../common/fs.js';
import { getTemplate, } from '../../common/get-template.js';
import { DIST_ROOT, } from '../utils/get-root.js';
import { withWorkingDir, } from '../utils/with-working-dir.js';
import { UMDBuildBundleOptions, } from './types.js';
export { UMDBuildBundleOptions, } from './types.js';

/***
 * Constants
 */
const UMD_ROOT_FOLDER = path.join(DIST_ROOT, './bundlers/umd/');
export const NAME = 'UMD Bundler';

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

const writeDependency = (dist: string) => async (file: string) => {
  const target = path.join(dist, UMDBundler.getTargetFileName(file));
  if (!await exists(file)) {
    throw new Error(`File "${file}" does not exist`);
  }
  return copyFile(file, target);
};

export class UMDBundler extends Bundler {
  port = 0;
  usesRegistry = false;

  get name() { // skipcq: JS-0105
    return NAME;
  }

  async bundle({
    title = this.name,
    files = [],
  }: UMDBuildBundleOptions) {
    const workingDir = this.outDir;
    // info('Bundling UMD...');
    await withWorkingDir(async (dist) => {
      await Promise.all([
        ...files.map(writeDependency(dist)),
        writeIndexHTML(dist, {
          title,
          dependencies: files.map(UMDBundler.getTargetFileName),
        }),
      ]);

      // info(`Bundled UMD successfully to ${dist}`);
    }, workingDir);
  }

  static getTargetFileName = (pathToFile: string) => {
    return pathToFile.split('/').join('_');
  };
}
