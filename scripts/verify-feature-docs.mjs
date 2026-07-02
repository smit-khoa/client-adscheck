// Anti-drift guard for the .claude/features/ AI memory layer.
// Fails when feature docs drift from the repo or become too thin for agents to use.
// Checks:
//   1. A path listed under `## Files` no longer exists on disk.
//   2. A feature doc is missing from the README.md index table.
//   3. The README index links a .md file that does not exist.
//   4. Every feature doc has the required sections from `_TEMPLATE.md`.
//
// File-line format (verified): `- apps/.../X.vue — description`. The path is
// the token BEFORE the em-dash; everything after is prose. Only lines whose
// first token matches a source path pattern are checked.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLIENT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FEATURES_DIR = join(CLIENT_ROOT, '.claude', 'features');

const failures = [];
const fail = (msg) => failures.push(msg);

const NON_FEATURE_DOCS = new Set(['README.md', '_TEMPLATE.md']);
// Only source files are drift-checked. Extend the ext list if a feature doc
// ever lists .scss/.json/.svg paths — other extensions are skipped as prose.
const SOURCE_PATH = /^(apps|packages)\/[\w./-]+\.(vue|ts|mts|mjs|css)$/;
const REQUIRED_SECTIONS = [
  'Purpose',
  'Flow',
  'Entry points / Routes',
  'Files',
  'APIs used',
  'State',
  'Permissions / Flags',
  'Verification',
  'Related',
  'Decisions / Gotchas',
];

const docFiles = readdirSync(FEATURES_DIR).filter(
  (f) => f.endsWith('.md') && !NON_FEATURE_DOCS.has(f),
);

function sectionBlocks(content) {
  const blocks = new Map();
  const matches = [...content.matchAll(/^##\s+(.+?)\s*$/gm)];
  for (let i = 0; i < matches.length; i++) {
    const rawTitle = matches[i][1].trim();
    const canonical = REQUIRED_SECTIONS.find(
      (section) => rawTitle === section || rawTitle.startsWith(`${section} `) || rawTitle.startsWith(`${section} (`),
    ) ?? rawTitle;
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    blocks.set(canonical, content.slice(start, end).trim());
  }
  return blocks;
}

// --- Check 1 & 4: every `## Files` path exists and required sections exist ---
let pathsChecked = 0;
for (const doc of docFiles) {
  const content = readFileSync(join(FEATURES_DIR, doc), 'utf8');
  const blocks = sectionBlocks(content);

  for (const section of REQUIRED_SECTIONS) {
    if (!blocks.has(section)) {
      fail(`${doc}: missing required section '## ${section}'`);
      continue;
    }
    const body = blocks.get(section);
    if (!body) fail(`${doc}: required section '## ${section}' is empty`);
  }

  const filesBlock = blocks.get('Files') ?? '';
  for (const line of filesBlock.split('\n')) {
    const m = line.match(/^\s*-\s+(\S+)/);
    if (!m) continue;
    const token = m[1]; // path is the token before ` — `
    if (!SOURCE_PATH.test(token)) continue; // skip prose / wikilinks
    pathsChecked++;
    if (!existsSync(join(CLIENT_ROOT, token))) {
      fail(`${doc}: '## Files' path does not exist → ${token}`);
    }
  }
}

// --- Check 2 & 3: README index <-> feature files consistency ---
const readme = readFileSync(join(FEATURES_DIR, 'README.md'), 'utf8');
const indexedDocs = new Set(
  [...readme.matchAll(/\]\(([\w-]+\.md)\)/g)].map((m) => m[1]),
);

for (const doc of docFiles) {
  if (!indexedDocs.has(doc)) fail(`feature doc '${doc}' is not listed in README.md index table`);
}
for (const linked of indexedDocs) {
  if (!existsSync(join(FEATURES_DIR, linked))) {
    fail(`README.md index links '${linked}' but that file does not exist`);
  }
}

console.log(
  `verify-feature-docs: ${docFiles.length} feature docs, ${pathsChecked} file paths checked, ` +
    `${indexedDocs.size} README index entries, ${REQUIRED_SECTIONS.length} required sections.`,
);

if (failures.length) {
  console.error(`\n✗ verify-feature-docs FAILED (${failures.length}):`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('✓ verify-feature-docs PASSED — no drift, index consistent, required sections present');
