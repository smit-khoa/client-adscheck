// Single source of truth for remote name -> URL segment mapping, shared by the
// shell's build-time remote URLs (dev-proxy-config) and the dist assembly step.
// MF container names use underscores (`ads_manager`); served URL segments and the
// app's dist folder use hyphens (`ads-manager`). Keeping this rule in one place
// stops the two consumers from drifting (a mismatch = 404 on the remote manifest).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLIENT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// owners.json lives at the repo root (gitignored, per-machine) — copy owners.example.json to start.
const owners = JSON.parse(
  readFileSync(join(CLIENT_ROOT, 'owners.json'), 'utf8'),
);

/** MF remote name (underscore) -> URL segment / dist folder (hyphen). */
export const toSegment = (name) => name.replace(/_/g, '-');

/** All remote MF names declared by the shell (e.g. ['adaccounts', 'ads_manager']).
 * `shell` is the host (owners.shell), not a remote — only owners.remotes counts here. */
export const remoteNames = Object.keys(owners.remotes);

/**
 * Remote descriptors for assembly/publish.
 * `segment` is both the served URL segment AND the app's dist folder under apps/.
 */
export const remotes = remoteNames.map((name) => ({ name, segment: toSegment(name) }));
