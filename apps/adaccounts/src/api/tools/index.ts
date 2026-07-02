import type { AdAccount } from '../../features/adaccounts';
import { renameAccount } from './rename-account';
import { openCloseAccount } from './open-close-account';
import { removeUser } from './remove-user';

// Cross-account context a runner may need (e.g. rename sequential numbering
// scans existing account names to find the next free number). Optional — most
// runners ignore it, like `index`.
export interface ToolRunContext {
  allAccounts: AdAccount[];
  delayMs?: number;
}

// A tool runner acts on one account with the form values, returning a per-row
// outcome. Tools are pure logic — no UI imports. On success a runner may return
// `patch` = the fields it changed (e.g. { name }, { status }) so the caller can
// update the list + cache locally without re-fetching from FB.
export type ToolRunner = (
  account: AdAccount,
  values: Record<string, string | boolean>,
  // Position of this account in the selected batch — sequential tools (e.g.
  // rename numbering) use it; others ignore it.
  index: number,
  // Cross-account context (e.g. the full account list). Optional — most ignore it.
  ctx?: ToolRunContext
) => Promise<{ ok: boolean; message: string; patch?: Partial<AdAccount> }>;

// Maps a catalog function id to its runner. Only wired tools are present; the
// rest stay visible in the catalog and warn truthfully until implemented.
export const TOOL_RUNNERS: Record<string, ToolRunner> = {
  rename: renameAccount,
  'open-close-account': openCloseAccount,
  'remove-user': removeUser,
};

export function hasRunner(functionId: string): boolean {
  return functionId in TOOL_RUNNERS;
}
