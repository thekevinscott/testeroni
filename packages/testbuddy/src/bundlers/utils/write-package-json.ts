import { getTemplate as _getTemplate, } from '../../common/get-template.js';
import { writeFile, } from '../../common/fs.js';

type GetTemplate = (templateName: string, args: Parameters<typeof _getTemplate>[1]) => Promise<string>;
export const writePackageJSON = async (getTemplate: GetTemplate, packageJSONPath: string, {
  dependencies = {},
  devDependencies = {},
  type = 'commonjs',
}) => {
  const contents = JSON.stringify(JSON.parse(await getTemplate('package.json.ejs', {
    type,
    dependencies: JSON.stringify(dependencies, null, 2),
    devDependencies: JSON.stringify(devDependencies, null, 2),
  })), null, 2);
  await writeFile(packageJSONPath, contents);
  return packageJSONPath;
};
