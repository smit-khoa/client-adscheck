import type { IconName } from '@mf2/shared-ui/icons';

// Catalog shape for the BM action panel. The BM remote only needs the function +
// field schema types (no group/panel machinery), so this is a trimmed copy of the
// adaccounts tool-actions types — local to the bm remote (repo convention:
// promote to shared-types only when a second app needs the same shape).

// Field kinds the inline config form can render. Kept minimal (KISS): every BM
// tool's panel maps to one of these. `select`/`switch` carry their own extras.
export type ToolFieldType = 'text' | 'number' | 'textarea' | 'select' | 'switch';

export interface ToolFieldOption {
  value: string;
  label: string;
}

// One input row in a function's config form. Data-driven so a single generic
// form component renders every tool — no hand-written panel per button.
export interface ToolFieldSchema {
  key: string;
  label: string;
  type: ToolFieldType;
  placeholder?: string;
  // text/number/textarea/switch -> string|boolean default; select uses `options`.
  default?: string | number | boolean;
  options?: ToolFieldOption[]; // required for `select`
  hint?: string; // small helper text under the field
  // Show this field only when another field's value matches (e.g. show
  // "Số bắt đầu" only when mode === 'sequential'). Absent -> always shown.
  showWhen?: { key: string; equals: string };
}

export interface ToolFunction {
  id: string;
  label: string;
  icon?: IconName;
  // Optional config form. Absent/empty -> the function runs directly (no form).
  fields?: ToolFieldSchema[];
  // BM panel only: false = runs per session (e.g. Create BM), no selection needed.
  // Absent/true = acts on the selected rows.
  requiresBm?: boolean;
  // How the panel dispatches this function. 'run' (default) = expand form values
  // into jobs → runner → toast (the 16+ batch tools). 'viewer' = open the generic
  // BmManagerDialog (interactive list + checkbox + inline actions) instead of
  // running a runner — for read-then-act tools (manage BAGs, manage BM admins).
  // 'appeal' = open BmAppealLinkDialog: one result row/BM (link + copy/open), a
  // read-only output dialog with no mutation (get appeal link per BM).
  kind?: 'run' | 'viewer' | 'appeal';
}
