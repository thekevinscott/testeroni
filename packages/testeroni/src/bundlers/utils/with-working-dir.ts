import { withTmpDir, } from "../../common/tmp-dir.js";

export const withWorkingDir = async (
  callback: (workingDir: string) => Promise<void>,
  workingDir?: string,
) => workingDir ? callback(workingDir) : withTmpDir(callback);
