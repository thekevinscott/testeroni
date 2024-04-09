import { Command, } from "commander";
import { bundle, } from "../../bundlers/bundle.js";
import { BUNDLERS, SharedBundleOptions, BundlerName, } from "../../bundlers/types.js";

function parseArgs(args: string): SharedBundleOptions {
  try {
    return JSON.parse(args) as SharedBundleOptions;
  } catch (err) {
    throw new Error(`Invalid args, expected a stringified json: ${args}`);
  }
}

async function main<B extends BundlerName>(outDir: string, {
  bundlerName: name,
  args,
}: {
  bundlerName: B;
  args: string;
}) {
  if (!name) {
    throw new Error('No bundler specified');
  }
  if (name in BUNDLERS === false) {
    throw new Error(`Unknown bundler: ${name}`);
  }
  await bundle(name, outDir, parseArgs(args));
};

export const registerScript = (program: Command) => program.command('bundle')
  .description('Bundles')
  .argument('<outDir>', 'outDir')
  .option('-n, --bundler-name <string>', 'Bundler to use')
  .option('-a, --args <string>', 'Args to pass to bundler')
  .action(main);
