import type { Knex } from 'knex';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as url from 'node:url';

// Simple .env loader (no dependency)
function loadEnv(file: string) {
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
      if ((process as any).env[k] == null) (process as any).env[k] = v;
    }
  } catch {}
}

const here = process.cwd();
loadEnv(path.resolve(here, '../.env'));

const config: Knex.Config = {
  client: 'pg',
  connection: process.env['SUPABASE_DB_URL'],
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
    extension: 'ts',
  },
};

export default config;
