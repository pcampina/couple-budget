import path from 'node:path';
import fs from 'node:fs';

// Simple .env loader (no dependency)
function loadEnv(file) {
  try {
    if (!fs.existsSync(file)) return;
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

loadEnv(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../.env'));

/** @type {import('knex').Knex.Config} */
const config = {
  client: 'pg',
  connection: process.env.SUPABASE_DB_URL,
  migrations: {
    directory: path.resolve(path.dirname(new URL(import.meta.url).pathname), './migrations'),
    tableName: 'knex_migrations',
    extension: 'js',
  },
};

export default config;

