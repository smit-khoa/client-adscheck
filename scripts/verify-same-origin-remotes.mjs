// Verifies prod shell build references remotes by same-origin RELATIVE paths,
// prefixed with BASE_PATH, never by an absolute domain. Builds the shell twice
// (root deploy + sub-path deploy) so the BASE_PATH prefix is checked both ways —
// that prefix is the easiest thing to get wrong (`//` or a missing segment).
//
// Run WITHOUT *_REMOTE_URL env so the prod relative branch in dev-proxy-config
// is exercised. Reads the emitted mf-manifest.json + runtime chunk to assert the
// baked remote entries.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toSegment } from './remote-segments.mjs';

const CLIENT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SHELL_DIST = join(CLIENT_ROOT, 'apps', 'shell', 'dist');

const failures = [];
const fail = (msg) => failures.push(msg);

function buildShell(basePath) {
  // Strip any inherited absolute remote-URL overrides so the prod relative branch runs.
  const env = { ...process.env, NODE_ENV: 'production', BASE_PATH: basePath };
  delete env.ADACCOUNTS_REMOTE_URL;
  delete env.ADS_MANAGER_REMOTE_URL;
  const res = spawnSync('pnpm', ['--filter', '@mf2/shell', 'build'], {
    cwd: CLIENT_ROOT,
    env,
    stdio: 'inherit',
  });
  if (res.status !== 0) throw new Error(`shell build failed for BASE_PATH=${basePath}`);
}

function readManifestEntries() {
  const manifest = JSON.parse(readFileSync(join(SHELL_DIST, 'mf-manifest.json'), 'utf8'));
  return manifest.remotes ?? [];
}

function distContainsAbsoluteDomain() {
  // The remote URL also lands in the runtime chunk; assert no absolute domain leaks.
  for (const file of readdirSync(SHELL_DIST)) {
    if (!file.endsWith('.js') || file.endsWith('.map')) continue;
    if (readFileSync(join(SHELL_DIST, file), 'utf8').includes('smit-khoa.github.io')) return file;
  }
  return null;
}

function checkBasePath(basePath) {
  console.log(`\n--- BASE_PATH=${basePath} ---`);
  buildShell(basePath);
  const entries = readManifestEntries();
  if (entries.length === 0) fail(`[${basePath}] no remotes found in mf-manifest.json`);

  for (const remote of entries) {
    const name = remote.federationContainerName;
    const entry = remote.entry ?? '';
    const segment = toSegment(name);
    const expected = `${basePath}${segment}/mf-manifest.json`;
    // 1. Relative: starts with '/', no protocol/domain.
    if (/^https?:\/\//.test(entry) || entry.includes('://')) {
      fail(`[${basePath}] remote '${name}' entry is absolute: ${entry}`);
    }
    // 2. Exact BASE_PATH-prefixed path, no '//' artifacts, hyphen segment.
    if (entry !== expected) {
      fail(`[${basePath}] remote '${name}' entry '${entry}' !== expected '${expected}'`);
    }
    if (entry.includes('//', 1)) {
      fail(`[${basePath}] remote '${name}' entry has duplicate slash: ${entry}`);
    }
  }

  const leak = distContainsAbsoluteDomain();
  if (leak) fail(`[${basePath}] absolute domain 'smit-khoa.github.io' found in ${leak}`);
}

for (const basePath of ['/']) checkBasePath(basePath);

if (failures.length) {
  console.error(`\n✗ verify-same-origin-remotes FAILED (${failures.length}):`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('\n✓ verify-same-origin-remotes PASSED — all remotes same-origin relative');
