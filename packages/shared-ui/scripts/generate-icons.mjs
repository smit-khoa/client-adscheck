// Generate src/icons/sprite-symbols.ts from per-icon source files in src/icons/svg/.
// Add an icon: drop `<name>.svg` into src/icons/svg/, then run `pnpm generate:icons`.
// The .svg sources are dev-only; output is a single inlined sprite string (no runtime fetch).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const svgDir = resolve(here, "../src/icons/svg");
const outFile = resolve(here, "../src/icons/sprite-symbols.ts");

// Shared symbol attributes (kept identical across icons → smaller, consistent output).
const SYMBOL_ATTRS =
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const files = readdirSync(svgDir)
  .filter((f) => f.endsWith(".svg"))
  .sort();

const names = [];
const symbols = [];

for (const file of files) {
  const name = file.replace(/\.svg$/, "");
  const raw = readFileSync(resolve(svgDir, file), "utf8");

  const viewBox = (raw.match(/viewBox="([^"]+)"/) || [, "0 0 24 24"])[1];
  // Inner = everything between the outer <svg ...> and </svg>, whitespace-trimmed.
  const inner = raw
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*$/, "")
    .trim();

  names.push(name);
  symbols.push(
    `<symbol id="icon-${name}" viewBox="${viewBox}" ${SYMBOL_ATTRS}>${inner}</symbol>`
  );
}

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols.join("")}</svg>`;

const out = `// AUTO-GENERATED - DO NOT EDIT
// Run: pnpm generate:icons
// Source icons live in ./svg/ (one .svg per icon).

export const sprite_symbols = \`${sprite}\`;

export type IconName =
${names.map((n) => `  | "${n}"`).join("\n")};

export const ICON_NAMES = [
${names.map((n) => `  "${n}",`).join("\n")}
] as const;
`;

writeFileSync(outFile, out);
console.log(`Generated ${names.length} icons → ${outFile}`);
