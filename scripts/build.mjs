// Build wrapper: select which apps to build, run Turbo, then mirror selected dist outputs
// into the same-origin deployment repo.
//   node scripts/build.mjs                       -> interactive picker (TTY) / all apps (non-TTY)
//   node scripts/build.mjs --apps adaccounts     -> one app    (--filter=@mf2/adaccounts)
//   node scripts/build.mjs --apps adaccounts,shell
//
// Shared packages are source-only (bundled into each app via workspace symlink), so
// there is no shared build target to select — turbo `^typecheck` orders types only.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { remoteNames, toSegment } from './remote-segments.mjs';

const CLIENT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);

const getFlag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};

const appsArg = getFlag('--apps');
let selectedApps;

// Build target filters, resolved in priority order:
//   1. --apps a,b   -> exactly those apps (flag is an explicit intent; shell NOT forced)
//   2. interactive  -> TTY + no --apps: checkbox over remotes, shell optional like every app
//   3. fallback      -> non-TTY + no --apps (CI / piped): build everything, never block on a prompt.
if (appsArg) {
  selectedApps = appsArg.split(',').map((a) => a.trim()).filter(Boolean);
} else if (process.stdout.isTTY) {
  try {
    const { checkbox } = await import('@inquirer/prompts');
    selectedApps = await checkbox({
      message: 'Chọn app build:',
      choices: ['shell', ...remoteNames.map(toSegment)].map((name) => ({ name, value: name })),
      required: true,
    });
  } catch {
    // @inquirer throws ExitPromptError on Ctrl-C — exit cleanly without a stack trace.
    process.exit(0);
  }
} else {
  selectedApps = ['shell', ...remoteNames.map(toSegment)];
}

selectedApps = [...new Set(selectedApps)];
const filters = selectedApps.map((a) => `--filter=@mf2/${a}`);

const run = (cmd, args) => {
  const res = spawnSync(cmd, args, { cwd: CLIENT_ROOT, stdio: 'inherit' });
  if (res.status !== 0) process.exit(res.status ?? 1);
};

run('pnpm', ['exec', 'turbo', 'run', 'build', ...filters]);
run('node', [join(CLIENT_ROOT, 'scripts', 'assemble-dist.mjs'), '--apps', selectedApps.join(',')]);
