import { Command, } from "commander";
import { bundle, } from "../../bundlers/bundle.js";
import { BUNDLERS, SharedBundleOptions, BundlerName, BundlerNameString, VALID_BUNDLER_NAMES, } from "../../bundlers/types.js";

function parseArgs(args: string): SharedBundleOptions {
  try {
    return JSON.parse(args) as SharedBundleOptions;
  } catch (err) {
    throw new Error(`Invalid args, expected a stringified json: ${args}`);
  }
}

async function main(outDir: string, {
  bundlerName: name,
  args,
}: {
  bundlerName: string;
  args: string;
}) {
  if (!name) {
    throw new Error('No bundler specified');
  }
  await bundle(name, outDir, parseArgs(args));
};

export const registerScript = (program: Command) => program.command('bundle')
  .description('Bundles')
  .argument('<outDir>', 'outDir')
  .option('-n, --bundler-name <string>', 'Bundler to use')
  .option('-a, --args <string>', 'Args to pass to bundler')
  .action(main);
