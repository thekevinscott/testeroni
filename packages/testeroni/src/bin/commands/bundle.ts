import { Command, } from "commander";
import { BUNDLERS, BundleOptions, BundlerName, bundle, } from "../../bundlers/bundle.js";

function parseArgs<N extends BundlerName>(args: string): BundleOptions<N> {
  try {
    return JSON.parse(args) as BundleOptions<N>;
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
