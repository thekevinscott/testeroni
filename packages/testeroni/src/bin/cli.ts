#!/usr/bin/env node

import { Command, } from 'commander';
import {
  registerScript as registerScriptForBundle,
} from './commands/cli-bundle.js';
import { readFileSync, } from 'fs';

const packageJSONPath = import.meta.url.replace(/\/[^/]+$/, '/../../package.json');
const { name, version, description, } = JSON.parse(readFileSync(new URL(packageJSONPath), 'utf-8')) as { name: string, version: string, description: string, };

const main = async () => {
  const program = new Command();

  program
    .name(name)
    .description(description)
    .version(version);

  await Promise.all([
    registerScriptForBundle,
  ].map(fn => fn(program)));

  await program.parseAsync(process.argv);
};

await main();
