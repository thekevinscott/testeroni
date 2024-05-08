import { timeit, } from "../utils/timeit.js";
import { exec, ExecOptions, } from 'child_process';
import path from 'path';
import fsExtra from "fs-extra";
import * as url from 'url';
import { withTmpDir, } from "../../common/tmp-dir.js";
import { getHashedName, } from "../../common/get-hashed-name.js";
import { info, } from "../../common/logger.js";
import { exists, } from "../../common/fs.js";
import { getTemplate, } from "../../common/get-template.js";
import { hoistImports, } from "./hoist-imports.js";

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, './_templates');

type Bundle = () => Promise<void>;

const { readFile, } = fsExtra;

type StdOut = (chunk: string) => void;

export const callExec = (cmd: string, options: ExecOptions, stdout: StdOut, stderr?: typeof process.stderr): Promise<void> => new Promise((resolve, reject) => {
  const spawnedProcess = exec(cmd, options, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });

  if (stderr) {
    spawnedProcess.stderr?.pipe(stderr);
  }
  spawnedProcess.stdout?.on('data', stdout);
});

const getPertinentLine = (error: Error) => {
  const message = error.message;
  const pertinentPart = message.split(/Error( \[.*?\])?:/).pop();
  if (!pertinentPart) {
    return 'error message does not contain "Error: " string';
  }
  return pertinentPart.split('\n')[0].trim();
};

export class RunNodeScriptError extends Error {
  name = 'RunNodeScriptError';
  pertinentLine: string;
  script?: string;

  constructor(error: unknown, _script?: string) {
    if (error instanceof Error) {
      const pertinentLine = getPertinentLine(error);
      const message = pertinentLine;
      // const message = `${script}\n${pertinentLine}`;
      super(message);
      this.pertinentLine = pertinentLine;
      Error.captureStackTrace(this, this.constructor);
      // this.message = `${script}\n${this.message}`;
    } else {
      throw new Error('error not an instance of Error within RunNodeScriptError');
    }
    this.script = _script;
  }
}

const isBuffer = (data: unknown): data is Buffer => {
  return data instanceof Buffer;
};

type ContentFn = (outputDir: string) => Promise<string>;
const runNodeScript = async (contentFn: ContentFn, {
  cwd,
  stderr,
  module,
}: {
  module?: boolean;
  cwd: string;
  stderr?: typeof process.stderr;
}): Promise<Buffer> => {
  const result = await withTmpDir(async (tmpDir) => {
    const dataFile = path.join(tmpDir, getHashedName());
    const contents = await contentFn(dataFile);

    await callExec(`node ${module ? '--input-type=module' : ''} -e "${hoistImports(contents.replace(/"/g, '\\"'))}"`, {
      cwd,
      env: {
      },
    }, chunk => {
      info('[PAGE]', chunk);
    }, stderr);
    if (!await exists(dataFile)) {
      throw new Error(`Data file ${dataFile} was not created. Double check that your Node script writes its output to the given data file.`);
    }
    return readFile(dataFile);
  });

  if (!isBuffer(result)) {
    throw new Error(`result is not a Buffer: ${result}`);
  }

  return result;
};

export class ServersideTestRunner {
  trackTime: boolean;
  verbose?: boolean;
  cwd: string;
  module?: boolean;

  constructor({
    trackTime = false,
    cwd,
    module,
  }: {
    cwd: string;
    trackTime?: boolean;
    module?: boolean;
  }) {
    this.module = module;
    this.cwd = cwd;
    this.trackTime = trackTime;
  }

  /****
   * Utility methods
   */

  async run<R extends 'buffer' | 'string'>(script: string, {
    logErrors = true,
    returnType = 'string' as R,
  }: {
    logErrors?: boolean;
    returnType?: R;
  } = {}): Promise<R extends 'buffer' ? Buffer : string> {
    const contentFn = (outputFile: string) => {
      return getTemplate(path.resolve(TEMPLATES_DIR, 'node-script.js.ejs'), {
        outputFile,
        script,
      });
    };
    const result = await runNodeScript(contentFn, {
      cwd: this.cwd,
      stderr: logErrors ? process.stderr : undefined,
      module: this.module,
    }).catch((err: unknown) => {
      throw new RunNodeScriptError(err, script);
    });
    if (returnType === 'buffer') {
      return result as R extends 'buffer' ? Buffer : string;
    }
    return result.toString() as R extends 'buffer' ? Buffer : string;
  }

  /****
   * Test lifecycle methods
   */

  @timeit<[Bundle], ServersideTestRunner>('beforeAll scaffolding') // skipcq: JS-0105
  async beforeAll(bundle: Bundle) { // skipcq: JS-0105 // don't think this one was picked up
    if (bundle) {
      await bundle();
    }
  }
}
