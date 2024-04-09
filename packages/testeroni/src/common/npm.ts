import { spawn, } from 'child_process';
import { getLogLevel, verbose, } from './logger.js';

const parseCommand = (_command: string | string[]) => {
  const command = Array.isArray(_command) ? _command : _command.split(' ');
  if (command[0] === 'npm' || command[0] === 'pnpm') {
    return command.slice(1);
  }
  return command;
};

export const runPackageCommand = (
  command: string | string[],
  cwd: string,
  runner: 'npm' | 'pnpm',
) => new Promise<void>((resolve, reject) => {
  const child = spawn(runner, parseCommand(command), {
    shell: true,
    cwd,
    stdio: "inherit",
  });

  child.on('error', reject);

  child.on('close', (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(code);
    }
  });
});


export const npmInstall = async (cwd: string, {
  isSilent = false,
  registryURL,
}: InstallPackagesOptsNPM = {}) => {
  const logLevel = getLogLevel();
  const command = [
    'npm',
    'install',
    isSilent ? '--silent' : '',
    '--no-fund',
    '--no-audit',
    '--no-package-lock',
    '--loglevel',
    logLevel,
    registryURL ? `--registry ${registryURL}` : '',
  ].filter(Boolean);
  verbose(`${command.join(' ')} in ${cwd}`);
  await runPackageCommand(command, cwd, 'npm');
};

export const pnpmInstall = async (cwd: string, {
  isSilent = false,
}: InstallPackagesOptsPNPM = {}) => {
  // const logLevel = getLogLevel();
  const command = [
    'pnpm',
    'install',
    '--ignore-scripts',
    '--fix-lockfile',
    isSilent ? '--silent' : '',
    // '--no-fund',
    // '--no-audit',
    // '--no-package-lock',
    // '--loglevel',
    // logLevel,
    // registryURL ? `--registry ${registryURL}` : '',
  ].filter(Boolean);
  verbose(`${command.join(' ')} in ${cwd}`);
  await runPackageCommand(command, cwd, 'pnpm');

};

export type PackageManager = 'pnpm' | 'npm';
interface InstallPackagesOptsPNPM {
  isSilent?: boolean;
}
interface InstallPackagesOptsNPM {
  isSilent?: boolean;
  registryURL?: string;
}
type InstallPackagesOpts = InstallPackagesOptsPNPM | InstallPackagesOptsNPM;

export async function installPackages(cwd: string, {
  packageManager,
  ...opts
}: InstallPackagesOpts & { packageManager?: PackageManager } = {}) {
  if (packageManager === 'npm') {
    await pnpmInstall(cwd, opts);
  } else {
    await pnpmInstall(cwd, opts);
  }
};

export const runPNPMCommand = (
  command: Parameters<typeof runPackageCommand>[0],
  cwd: Parameters<typeof runPackageCommand>[1]
) => runPackageCommand(command, cwd, 'pnpm');
