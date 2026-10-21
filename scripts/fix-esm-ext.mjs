// Rewrite relative import specifiers in compiled dist output to explicit
// ESM-resolvable paths (`./x` -> `./x.js`, `./dir` -> `./dir/index.js`).
//
// tsc with `moduleResolution: "bundler"` emits extensionless relative
// imports verbatim. Node's module syntax detection (default since
// v20.19/v22.7) then parses the output as ESM, where directory and
// extensionless specifiers are hard errors (ERR_UNSUPPORTED_DIR_IMPORT,
// ERR_MODULE_NOT_FOUND). Running this after `tsc` makes `node dist/index.js`
// work without rewriting every source import or switching the packages to
// CommonJS output.
//
// Usage: node scripts/fix-esm-ext.mjs <dist-dir> [more-dirs...]
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const IMPORT_RE =
  /(\bfrom\s*|\bimport\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]+)(\2)/g;

function* walkJsFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkJsFiles(p);
    else if (entry.isFile() && entry.name.endsWith('.js')) yield p;
  }
}

function resolveSpecifier(specifier, fromFile) {
  // Strip a trailing slash safely; specifiers never carry queries here
  const base = join(fromFile, '..');
  if (existsSync(join(base, specifier + '.js'))) return specifier + '.js';
  if (existsSync(join(base, specifier, 'index.js'))) return specifier + '/index.js';
  return null;
}

let changed = 0;
for (const root of process.argv.slice(2)) {
  for (const file of walkJsFiles(root)) {
    const src = readFileSync(file, 'utf8');
    let touched = false;
    const out = src.replace(IMPORT_RE, (match, lead, quote, spec) => {
      const resolved = resolveSpecifier(spec, file);
      if (!resolved || resolved === spec) return match;
      touched = true;
      return `${lead}${quote}${resolved}${quote}`;
    });
    if (touched) {
      writeFileSync(file, out);
      changed++;
      console.log(`fixed imports in ${relative(process.cwd(), file)}`);
    }
  }
}
console.log(`fix-esm-ext: ${changed} file(s) updated`);
