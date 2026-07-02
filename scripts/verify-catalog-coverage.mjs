// Verifies .claude/components-catalog.md documents every shared-ui component
// group, so an AI assistant always discovers an existing component instead of
// reinventing it. shadcn-vue uses COMPOUND components (Card = Card + CardHeader
// + CardContent ...), so the catalog documents one entry per component GROUP
// (24 ui dirs + 4 root components = 28 groups), listing sub-parts inside the
// parent entry — not 99 separate headings.
//
// Coverage rule (drift guard, both directions):
//   1. Each ui dir under components/ui/ must have >=1 of its exported components
//      appear as a `### <Name>` heading in the catalog (the group is documented).
//   2. Each root-level default export (RemoteErrorBoundary, SmitLogo, ...) must
//      have a `### <Name>` heading.
//   3. Every `### <Name>` heading must be a REAL exported component name
//      (catches a catalog entry left behind after a component was deleted).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// All exported identifier names from an index.ts: both `export { default as X }`
// and named re-exports `export { A, B as C }`. Named re-exports matter because
// some shadcn-vue dirs surface real components from upstream libs that way
// (e.g. form/ re-exports Form/FormField/FormFieldArray from vee-validate) — a
// catalog heading for one of those must NOT be flagged as an orphan.
function exportedNames(source) {
  const names = [];
  for (const block of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of block[1].split(',')) {
      const seg = part.trim();
      if (!seg) continue;
      // `default as X` | `Orig as Alias` | `Name` → take the exported (last) identifier
      const m = seg.match(/(?:\bas\s+)?(\w+)\s*$/);
      if (m) names.push(m[1]);
    }
  }
  return names;
}

const CLIENT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SUI = join(CLIENT_ROOT, 'packages', 'shared-ui', 'src');
const CATALOG = join(CLIENT_ROOT, '.claude', 'components-catalog.md');

const failures = [];
const fail = (msg) => failures.push(msg);

const rootIndex = readFileSync(join(SUI, 'index.ts'), 'utf8');

// 1. ui dirs from `export * from "./components/ui/<name>"`
const uiDirs = [...rootIndex.matchAll(/export \* from "\.\/components\/ui\/([\w-]+)"/g)].map(
  (m) => m[1],
);

// For each ui dir: `groupComponents` holds DEFAULT exports only (used for the
// Rule 1 "is this group documented" check + a clean suggested heading name).
// `allComponentNames` holds ALL exported identifiers (default + named) so the
// Rule 3 orphan check never flags a real named-re-exported component.
const groupComponents = {}; // dir -> [DefaultComponentName, ...]
const allComponentNames = new Set();
for (const dir of uiDirs) {
  const idx = readFileSync(join(SUI, 'components', 'ui', dir, 'index.ts'), 'utf8');
  const defaults = [...idx.matchAll(/export \{ default as (\w+)/g)].map((m) => m[1]);
  groupComponents[dir] = defaults;
  exportedNames(idx).forEach((n) => allComponentNames.add(n));
}

// 2. root-level default exports (non-ui components like RemoteErrorBoundary)
const rootComponents = [...rootIndex.matchAll(/export \{ default as (\w+) \} from/g)].map(
  (m) => m[1],
);
exportedNames(rootIndex).forEach((n) => allComponentNames.add(n));

// 3. catalog `### <Name>` headings
const catalog = readFileSync(CATALOG, 'utf8');
const headings = new Set(
  [...catalog.matchAll(/^### (\w+)/gm)].map((m) => m[1]),
);

// Rule 1: every ui group documented (>=1 of its components is a heading)
for (const dir of uiDirs) {
  const documented = groupComponents[dir].some((c) => headings.has(c));
  if (!documented) {
    // Fallback name covers a future dir that only named-re-exports (no default).
    const suggested = groupComponents[dir][0] ?? `<a ${dir} component>`;
    fail(`ui group '${dir}' not documented — add a '### ${suggested}' entry to components-catalog.md`);
  }
}

// Rule 2: every root component documented
for (const c of rootComponents) {
  if (!headings.has(c)) fail(`root component '${c}' missing '### ${c}' entry in components-catalog.md`);
}

// Rule 3: no orphan headings (heading for a component that no longer exists)
for (const h of headings) {
  if (!allComponentNames.has(h)) {
    fail(`catalog heading '### ${h}' is not a real shared-ui component (orphan/drift) — remove or rename it`);
  }
}

console.log(
  `verify-catalog-coverage: ${uiDirs.length} ui groups + ${rootComponents.length} root components, ` +
    `${allComponentNames.size} total component names, ${headings.size} catalog headings.`,
);

if (failures.length) {
  console.error(`\n✗ verify-catalog-coverage FAILED (${failures.length}):`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('✓ verify-catalog-coverage PASSED — every shared-ui component group is documented');
