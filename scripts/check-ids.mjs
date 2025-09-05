#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const INCLUDE_DIRS = ['src', 'api'];
const EXTS = new Set(['.ts', '.js', '.mjs']);
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'dist-api', 'coverage', '.angular', '.git']);

const PATTERNS = [
  /Math\.random\(\)\.toString\(36\)\.slice\(2/g,
  /\buid\s*\(/g,
];

/** @type {{file:string,line:number,match:string}[]} */
const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (EXTS.has(path.extname(entry.name))) inspect(full);
  }
}

function inspect(file) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const re of PATTERNS) {
      if (re.test(line)) findings.push({ file, line: i + 1, match: line.trim() });
    }
  }
}

for (const d of INCLUDE_DIRS) {
  const p = path.join(ROOT, d);
  if (fs.existsSync(p)) walk(p);
}

if (findings.length) {
  console.error('Found non-uuid ID generation patterns:');
  for (const f of findings) console.error(`- ${path.relative(ROOT, f.file)}:${f.line}: ${f.match}`);
  console.error('\nUse uuid() helpers:');
  console.error('- Frontend: src/app/shared/uuid.ts');
  console.error('- API: api/utils.ts');
  process.exit(1);
} else {
  console.log('OK: No prohibited ID patterns found.');
}

