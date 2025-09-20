const path = require('node:path');
const fs = require('node:fs');

function loadEnv(file) {
  try {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {}
}

const here = __dirname;
loadEnv(path.resolve(here, '../.env'));

/** @type {import('knex').Knex.Config} */
const config = {
  client: 'pg',
  connection: process.env.SUPABASE_DB_URL,
  migrations: {
    directory: path.resolve(here, './migrations'),
    tableName: 'knex_migrations',
    extension: 'ts'
  }
};

module.exports = config;
