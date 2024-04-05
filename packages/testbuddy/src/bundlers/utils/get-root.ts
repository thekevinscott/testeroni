// Get the root of testbuddy
// This will be used to resolve template directories

import * as url from 'url';
import { packageUp } from 'package-up';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const packageJSONPath = (await packageUp({ cwd: __dirname }));
const rootPath = packageJSONPath?.split('/').slice(0, -1).join('/');
export const DIST_ROOT = `${rootPath}/dist`;
