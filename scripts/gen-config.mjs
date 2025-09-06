#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function loadEnv(file) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
      if (process.env[k] == null) process.env[k] = v;
    }
  } catch {}
}

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const envPath = path.join(ROOT, '.env');
loadEnv(envPath);

const cfg = {
  __USE_API__: process.env.USE_API,
  __API_URL__: process.env.API_URL,
  __SUPABASE_URL__: process.env.SUPABASE_URL,
  __SUPABASE_ANON_KEY__: process.env.SUPABASE_ANON_KEY,
  __DEBUG__: process.env.DEBUG,
};

const lines = [
  '// Generated from .env by scripts/gen-config.mjs',
  '(function(w){',
  ...Object.entries(cfg)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => {
      if (k === '__USE_API__' || k === '__DEBUG__') {
        const s = String(v).trim().toLowerCase();
        const boolVal = s === 'true' || s === '1' ? 'true' : 'false';
        return `  w.${k} = ${boolVal};`;
      }
      return `  w.${k} = ${JSON.stringify(v)};`;
    }),
  '})(window);',
  '',
];

// Write into public so Angular dev server serves it at /config.js
const outDir = path.join(ROOT, 'public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'config.js'), lines.join('\n'));
console.log('Wrote public/config.js from .env');
