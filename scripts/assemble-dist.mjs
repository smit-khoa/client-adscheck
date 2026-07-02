// Mirrors selected app build outputs into the deployment repo as one same-origin tree.
// Structure:
//   <target>/            <- shell dist (index.html, assets, mf-manifest.json)
//   <target>/<segment>/  <- remote dist (adaccounts/, ads-manager/)
//   <target>/404.html    <- copy of shell index.html when shell is assembled
//
// Only selected apps are mirrored. Updating a remote does not delete shell files or other
// remotes; updating shell cleans root shell files while preserving remote directories.
import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join, parse, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { remoteNames, remotes, toSegment } from './remote-segments.mjs';

const CLIENT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DEPLOY_TARGET = resolve(dirname(CLIENT_ROOT), 'client-adscheck-deployment');
const DIST = 'dist';
const knownApps = ['shell', ...remoteNames.map(toSegment)];
const remoteSegments = new Set(remotes.map(({ segment }) => segment));

const argv = process.argv.slice(2);
const getFlag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};

const appsArg = getFlag('--apps');
const selectedApps = appsArg
  ? [...new Set(appsArg.split(',').map((app) => app.trim()).filter(Boolean))]
  : knownApps;

const unknownApps = selectedApps.filter((app) => !knownApps.includes(app));
if (unknownApps.length) {
  console.error(`✗ assemble aborted: unknown app(s): ${unknownApps.join(', ')}.`);
  console.error(`  Known apps: ${knownApps.join(', ')}`);
  process.exit(1);
}

const TARGET = DEPLOY_TARGET;
if (TARGET === CLIENT_ROOT || CLIENT_ROOT.startsWith(TARGET + sep) || TARGET === parse(TARGET).root) {
  console.error(`✗ assemble aborted: target '${TARGET}' is the repo or an ancestor of it.`);
  process.exit(1);
}

const appDist = (app) => join(CLIENT_ROOT, 'apps', app, DIST);
const missing = selectedApps.filter((app) => !existsSync(appDist(app)));
if (missing.length) {
  console.error(`✗ assemble aborted: missing dist for ${missing.join(', ')}.`);
  console.error('  Build selected app(s) first with pnpm build.');
  console.error(`  ${TARGET} left untouched.`);
  process.exit(1);
}

mkdirSync(TARGET, { recursive: true });

function cleanShellRoot() {
  for (const entry of readdirSync(TARGET)) {
    if (entry === '.git' || remoteSegments.has(entry)) continue;
    rmSync(join(TARGET, entry), { recursive: true, force: true });
  }
}

function mirrorRemote(segment) {
  const targetDir = join(TARGET, segment);
  rmSync(targetDir, { recursive: true, force: true });
  cpSync(appDist(segment), targetDir, { recursive: true });
}

if (selectedApps.includes('shell')) {
  cleanShellRoot();
  cpSync(appDist('shell'), TARGET, { recursive: true });
  copyFileSync(join(TARGET, 'index.html'), join(TARGET, '404.html'));
}

for (const app of selectedApps) {
  if (app === 'shell') continue;
  mirrorRemote(app);
}

console.log(`✓ assemble: ${selectedApps.join(', ')} -> ${TARGET}`);
