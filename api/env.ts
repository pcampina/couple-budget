import fs from 'node:fs';
import path from 'node:path';

function loadDotEnv(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const valRaw = trimmed.slice(idx + 1).trim();
      const val = valRaw.replace(/^['"]|['"]$/g, '');
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {}
}

// Load project root .env (../.env)
const here = __dirname;
const rootEnv = path.resolve(here, '../.env');
loadDotEnv(rootEnv);
