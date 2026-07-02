// Verifies one app's build output under apps/<app>/dist, or the assembled deployment tree.
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { remoteNames, remotes, toSegment } from './remote-segments.mjs';

const CLIENT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DEPLOY_TARGET = resolve(dirname(CLIENT_ROOT), 'client-adscheck-deployment');
const knownApps = ['shell', ...remoteNames.map(toSegment)];
const firstArg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : undefined;
const app = firstArg && firstArg !== 'assembled' ? firstArg : undefined;

const failures = [];
const must = (target, rel) => {
  if (!existsSync(join(target, rel))) failures.push(`missing ${rel}`);
};

function report(name, target) {
  if (failures.length) {
    console.error(`✗ verify-dist FAILED (${failures.length}) in ${target}:`);
    for (const f of failures) console.error('  - ' + f);
    process.exit(1);
  }
  console.log(`✓ verify-dist PASSED — ${name}: ${target}`);
}

if (!firstArg || firstArg === 'assembled') {
  const target = DEPLOY_TARGET;
  must(target, 'index.html');
  must(target, '404.html');
  must(target, 'mf-manifest.json');
  for (const { segment } of remotes) {
    must(target, join(segment, 'mf-manifest.json'));
    must(target, join(segment, 'remoteEntry.js'));
  }
  report('assembled deployment tree complete', target);
  process.exit(0);
}

if (!knownApps.includes(app)) {
  console.error(`✗ verify-dist aborted: pass one app name (${knownApps.join(', ')}) or 'assembled'.`);
  console.error('  Example: pnpm verify:dist adaccounts');
  console.error('  Example: pnpm verify:dist assembled');
  process.exit(1);
}

const target = join(CLIENT_ROOT, 'apps', app, 'dist');
must(target, 'mf-manifest.json');
if (app === 'shell') {
  must(target, 'index.html');
} else {
  must(target, 'remoteEntry.js');
}
report(`${app} dist complete`, target);
