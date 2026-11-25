import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const scanRoots = ['src', 'scripts'].filter((dir) => fs.existsSync(path.join(root, dir)));
const ignoredDirs = new Set(['node_modules', 'dist', '.git', 'public', 'Docs', 'docs']);
const extensions = new Set(['.js', '.jsx', '.mjs', '.cjs']);
const failures = [];
const jsxFallbackChecked = [];
let checked = 0;
let parse = null;

async function tryLoadBabelParser() {
  try {
    const parser = await import('@babel/parser');
    return parser.parse;
  } catch {
    return null;
  }
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (extensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function lightweightModuleSyntaxCheck(file) {
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) throw new Error(check.stderr || 'Native syntax check failed');
}

function lightweightJsxSyntaxCheck(code, rel) {
  if (/^<<<<<<<|^=======|^>>>>>>>/m.test(code)) {
    throw new Error(`merge conflict marker found in ${rel}`);
  }
  if (!code.trim()) throw new Error(`empty JSX file ${rel}`);
}

parse = await tryLoadBabelParser();
if (strict && !parse) { console.error('Strict syntax check requires @babel/parser (install project dependencies).'); process.exit(1); }
const files = scanRoots.flatMap((dir) => walk(path.join(root, dir))).sort();

for (const file of files) {
  checked += 1;
  const ext = path.extname(file);
  const rel = path.relative(root, file);
  const code = fs.readFileSync(file, 'utf8');
  try {
    if (parse) {
      parse(code, {
        sourceType: 'module',
        allowImportExportEverywhere: false,
        errorRecovery: false,
        plugins: [
          'jsx',
          'importMeta',
          'topLevelAwait',
          'classProperties',
          'objectRestSpread',
          'optionalChaining',
          'nullishCoalescingOperator',
          'dynamicImport',
        ],
      });
    } else if (ext === '.jsx') {
      lightweightJsxSyntaxCheck(code, rel);
      jsxFallbackChecked.push(rel);
    } else {
      lightweightModuleSyntaxCheck(file);
    }
  } catch (error) {
    failures.push(`${rel}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(`Syntax check failed for ${failures.length} file(s):`);
  failures.slice(0, 80).forEach((failure) => console.error(` - ${failure}`));
  if (failures.length > 80) console.error(` ... ${failures.length - 80} more`);
  process.exit(1);
}

if (jsxFallbackChecked.length) {
  console.warn(`Syntax check fallback: @babel/parser unavailable; performed structural JSX fallback check for ${jsxFallbackChecked.length} JSX file(s).`);
  console.warn('Run `npm install` then `npm run syntax:strict` for full Babel JSX parsing in CI.');
}
console.log(`Syntax check passed for ${checked} scanned JS/JSX/MJS/CJS file(s). Total files scanned: ${checked}.`);
process.exit(0);
