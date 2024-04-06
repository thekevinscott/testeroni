import { describe, expect, test } from 'vitest';
import { exec as _exec } from 'child_process';
import { readFileSync, } from 'fs';
import util from 'util';
const exec = util.promisify(_exec);

const packageJSONPath = import.meta.url.replace(/\/[^/]+$/, '/../../packages/testeroni/package.json');
const { name, version, description, } = JSON.parse(readFileSync(new URL(packageJSONPath), 'utf-8')) as { name: string, version: string, description: string, };

describe.only('cli', () => {
  test('the cli works', async () => {
    const { stdout: result } = await exec('pnpm testeroni --version');
    expect(result.trim()).toBe(version.trim());
  });

  test('bundle works', async () => {
    const { stdout: result } = await exec('pnpm testeroni bundle --version');
    expect(result.trim()).toBe(version.trim());
  });

  test('bundle --help works', async () => {
    const { stdout: result } = await exec('pnpm testeroni bundle --help');
    expect(result.trim()).toEqual(expect.stringContaining('Usage: testeroni bundle [options]'));
  });
});
