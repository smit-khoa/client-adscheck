import type { IconName } from '@mf2/shared-ui/icons';

// Tool-actions owns the group/function catalog shape and the demo action result.
// Local to the adaccounts remote (repo convention: promote to shared-types only
// when a second app needs it).

// Field kinds the inline config form can render. Kept minimal (KISS): every TKQC
// tool's panel maps to one of these. `select`/`switch` carry their own extras;
// `file` renders a native file picker (e.g. the XLSX campaign import).
export type ToolFieldType = 'text' | 'number' | 'textarea' | 'select' | 'switch' | 'file';

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
  accept?: string; // file-input filter (e.g. '.xlsx'); only used by `file`
  // Sensitive input (e.g. card CVV): rendered masked (password) so it isn't shown
  // on screen. All text inputs also disable browser autofill regardless.
  sensitive?: boolean;
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
}

export interface ToolGroup {
  id: string;
  label: string;
  icon?: IconName;
  functions: ToolFunction[];
}
