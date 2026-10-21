/* One-shot sweep: amber-world remnants → app-discord world.
   Scope: app/** and components/** EXCLUDING components/landing. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full.includes('components' + path.sep + 'landing')) continue;
      walk(full, out);
    } else if (entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

const files = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'components'))];
const changed = [];

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  const before = src;

  // A. Gradient logo block → shared BrandLockup (40px and 32px variants)
  const lockup40 = /<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center">\s*<MessageCircle className="w-5 h-5 text-background" \/>\s*<\/div>\s*<span className="text-xl font-bold">\s*Freedom<span className="gradient-text">Talk<\/span>\s*<\/span>/;
  const lockup32 = /<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-secondary flex items-center justify-center">\s*<MessageCircle className="w-4 h-4 text-background" \/>\s*<\/div>\s*<span className="text-lg font-bold">\s*Freedom<span className="gradient-text">Talk<\/span>\s*<\/span>/;

  if (lockup40.test(src)) {
    src = src.replace(lockup40, '<BrandLockup size={40} wordmarkClassName="text-xl" />');
  }
  if (lockup32.test(src)) {
    src = src.replace(lockup32, '<BrandLockup size={32} wordmarkClassName="text-lg" />');
  }
  if (src !== before && src.includes('BrandLockup') && !src.includes("from '@/components/brand/brand'")) {
    // add import after the last existing import
    const imports = [...src.matchAll(/^import .*$/gm)];
    if (imports.length) {
      const last = imports[imports.length - 1];
      const insertAt = last.index + last[0].length;
      src = src.slice(0, insertAt) + "\nimport { BrandLockup } from '@/components/brand/brand';" + src.slice(insertAt);
    }
    // drop MessageCircle from the lucide import if now unused
    const uses = (src.match(/MessageCircle/g) || []).length;
    if (uses === 1) {
      src = src.replace(/,?\s*MessageCircle,?/, (m) => (m.includes(',') ? (m.trim() === 'MessageCircle,' ? '' : m.replace('MessageCircle, ', '')) : m));
      // normalize possible double commas
      src = src.replace(/,\s*,/g, ',').replace(/{\s*,/g, '{').replace(/,\s*}/g, ' }');
    }
  }

  // B. Flat swap for the invite banner gradient
  src = src.replace('bg-gradient-to-r from-accent/20 to-accent/10', 'bg-accent/10');
  src = src.replace("'from-accent to-secondary'", "'bg-accent'");

  // C. gradient-text → brand-text (solid soft blurple)
  src = src.replace(/gradient-text/g, 'brand-text');

  // D. text-background on colored fills → white text (pinned: white on blurple/success/error)
  src = src.replace(/text-background(?![a-z-])/g, 'text-white');

  // E. yellow-500 → warning token
  src = src.replace(/\b(text|bg|border|ring)-yellow-500\b/g, '$1-warning');

  if (src !== before) {
    fs.writeFileSync(file, src);
    changed.push(path.relative(ROOT, file));
  }
}

console.log('changed', changed.length, 'files:');
changed.forEach((f) => console.log(' -', f));
