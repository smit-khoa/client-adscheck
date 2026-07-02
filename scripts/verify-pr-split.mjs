// Enforces the governance rule that shared singleton package changes must not
// be mixed with app changes in the same commit/PR. Shared packages are consumed
// as Module Federation singletons, so app changes and shared changes must be
// split for safe review/revert.
//
// Usage:
//   node scripts/verify-pr-split.mjs --staged
//   node scripts/verify-pr-split.mjs --base origin/main
//   node scripts/verify-pr-split.mjs --files <path> <path> ...
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);

function runGit(gitArgs) {
  return execFileSync('git', gitArgs, { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function changedFiles() {
  const filesIndex = args.indexOf('--files');
  if (filesIndex >= 0) return args.slice(filesIndex + 1).filter(Boolean);

  if (args.includes('--staged')) {
    return runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  }

  const baseIndex = args.indexOf('--base');
  const base = baseIndex >= 0 ? args[baseIndex + 1] : 'origin/main';
  const mergeBase = execFileSync('git', ['merge-base', 'HEAD', base], { encoding: 'utf8' }).trim();
  return runGit(['diff', '--name-only', '--diff-filter=ACMR', `${mergeBase}...HEAD`]);
}

const files = changedFiles();
const shared = files.filter((f) => /^packages\/shared-(store|ui|types)\//.test(f));
const apps = files.filter((f) => /^apps\//.test(f));

console.log(`verify-pr-split: ${files.length} changed files (${shared.length} shared, ${apps.length} apps).`);

if (shared.length && apps.length) {
  console.error('\n✗ verify-pr-split FAILED: do not mix packages/shared-* changes with apps/* changes.');
  console.error('\nShared files:');
  for (const f of shared) console.error(`  - ${f}`);
  console.error('\nApp files:');
  for (const f of apps) console.error(`  - ${f}`);
  console.error('\nSplit this into separate changes: shared additive change first, app migration second.');
  process.exit(1);
}

console.log('✓ verify-pr-split PASSED — shared/app changes are split');
