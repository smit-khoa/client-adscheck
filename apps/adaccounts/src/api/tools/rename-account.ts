import { graph } from '../fb-graph';
import { isGraphError } from '../types';
import type { AdAccount } from '../../features/adaccounts';
import type { ToolRunner } from './index';

// Rename an ad account (ported from Facebook.js onRenameAdaccount: POST graph
// /act_<id> with name). Two naming modes drive how the new name is built:
//   - random:     base name + a large random number (anti-flag, like Xmeta)
//   - sequential: base name + an incrementing number; the start is the next free
//                 number after existing "<base> <n>" accounts (deterministic per
//                 index → no collision even when accounts run concurrently)
//
// Naming is a pure FB convenience (Meta does NOT require unique account names) —
// numbers just help the user tell accounts apart and dodge anti-flag heuristics.
// A rename that fails because the account sits in a BM without manage permission
// is reported as-is (no self-grant in this version); the user grants it manually.

function randomNumber(): number {
  // Range matches the reference tool; large enough to avoid name collisions.
  return 110599 + Math.floor(Math.random() * (999999 - 110599 + 1));
}

// Escape a string for safe use inside a RegExp (base names may contain . ( ) etc).
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Place the number where the user wants it: at each `*` if present, else appended
// at the end. Empty base + no `*` → the number alone.
function buildName(base: string, num: number): string {
  if (base.includes('*')) return base.replaceAll('*', String(num));
  return base ? `${base} ${num}` : String(num);
}

// Next free sequential number: the highest <base> <n> among existing account
// names, +1, but never below the user's startNum. Wildcard bases don't append at
// the end, so they can't be scanned → start from startNum. Computed from a stable
// snapshot so num = start + index is collision-free across concurrent workers.
function computeSeqStart(base: string, accounts: AdAccount[], startNum: number): number {
  let max = 0;
  if (!base.includes('*')) {
    const re = new RegExp(base ? `^${escapeRegExp(base)} (\\d+)$` : `^(\\d+)$`);
    for (const acc of accounts) {
      const n = Number(acc.name.match(re)?.[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return Math.max(max + 1, startNum);
}

export const renameAccount: ToolRunner = async (account, values, index, ctx) => {
  const base = typeof values.newName === 'string' ? values.newName.trim() : '';
  const mode = values.mode === 'sequential' ? 'sequential' : 'random';

  // account.id is `act_<digits>`; graph path expects the act_ prefix.
  const bareId = account.id.startsWith('act_') ? account.id.slice(4) : account.id;

  let name: string;
  if (mode === 'sequential') {
    const startNum = Number.isFinite(Number(values.startNum)) ? Number(values.startNum) : 1;
    const start = computeSeqStart(base, ctx?.allAccounts ?? [], startNum);
    name = buildName(base, start + index);
  } else {
    name = buildName(base, randomNumber());
  }

  const res = await graph<{ success?: boolean }>(`/act_${bareId}`, {
    method: 'POST',
    params: { name },
  });

  if (isGraphError(res)) return { ok: false, message: res.message };
  // patch the resolved name so the list + cache update locally.
  return { ok: true, message: `Đã đổi tên → ${name}`, patch: { name } };
};
