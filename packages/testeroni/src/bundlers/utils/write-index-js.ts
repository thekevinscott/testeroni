import { getTemplate as _getTemplate, } from '../../common/get-template.js';
import { writeFile, } from '../../common/fs.js';

type GetTemplate = (templateName: string, args: Parameters<typeof _getTemplate>[1]) => Promise<string>;
export const writeIndexJS = async (getTemplate: GetTemplate, target: string, imports: [string, string][] = []) => {
  const contents = await getTemplate('index.js.ejs', {
    dependencies: imports.map(([name, hashedName,]) => ({
      name,
      hashedName,
    })),
  });
  await writeFile(target, contents.trim());
  return target;
};

