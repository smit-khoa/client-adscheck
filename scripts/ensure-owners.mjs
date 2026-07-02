// Ensures owners.json exists at this worktree's root after `pnpm install`.
// owners.json is gitignored (per-machine dev host/port), so `git worktree add`
// does NOT bring it into a new worktree. Each worktree runs `pnpm install`
// anyway, so wiring this into postinstall makes the file appear automatically.
//
// Resolution order (first hit wins):
//   1. Already present here -> nothing to do (idempotent, safe on main repo + CI).
//   2. Copy from the MAIN worktree's owners.json (the shared real config).
//   3. Fall back to owners.example.json so a fresh worktree still builds.
//   4. Neither source -> warn only (never block install).
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const CLIENT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(CLIENT_ROOT, 'owners.json');

if (existsSync(target)) process.exit(0);

// Main worktree root = parent of the shared git common dir (linked worktrees
// point their --git-common-dir at the main repo's .git).
let mainRoot = null;
try {
  const commonDir = execFileSync(
    'git',
    ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    { cwd: CLIENT_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  ).trim();
  mainRoot = dirname(commonDir);
} catch {
  // not a git repo / git missing — fall through to example fallback
}

const fromMain = mainRoot && mainRoot !== CLIENT_ROOT ? join(mainRoot, 'owners.json') : null;
const fromExample = join(CLIENT_ROOT, 'owners.example.json');

if (fromMain && existsSync(fromMain)) {
  copyFileSync(fromMain, target);
  console.log(`✓ owners.json copied from main worktree (${fromMain})`);
} else if (existsSync(fromExample)) {
  copyFileSync(fromExample, target);
  console.log('✓ owners.json created from owners.example.json (default ports — edit if needed)');
} else {
  console.warn('⚠️  owners.json missing and no source found (main worktree / owners.example.json). Create it manually before `pnpm dev`.');
}
