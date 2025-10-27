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

const distCandidates = [
  path.resolve(here, '../dist-api/migrations'),
  path.resolve(here, './dist-api/migrations')
];
const distMigrations = distCandidates.find((candidate) => fs.existsSync(candidate));
const sourceMigrations = path.resolve(here, './migrations');
const useDist = Boolean(distMigrations);
if (!useDist) {
  try {
    require('ts-node/register');
  } catch (err) {
    console.warn('ts-node/register not available; ensure migrations are built before running.');
  }
}

function extractPassword(raw) {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.password === 'string') {
      return parsed.password;
    }
  } catch {
    // fall through to return raw
  }
  return raw;
}

function shouldRequireSsl(host) {
  const override = process.env.DB_SSL && process.env.DB_SSL.toLowerCase();
  if (override === 'true') return true;
  if (override === 'false') return false;
  if (!host) return false;
  return host !== 'localhost' && host !== '127.0.0.1';
}

function buildConnectionDetails() {
  const urlString = process.env.SUPABASE_DB_URL || null;
  if (urlString) {
    try {
      const parsed = new URL(urlString);
      const host = parsed.hostname;
      const port = parsed.port ? Number(parsed.port) : 5432;
      const user = decodeURIComponent(parsed.username || 'dbadmin');
      const password = parsed.password ? decodeURIComponent(parsed.password) : '';
      const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'appdb';
      const connection = {
        host,
        port,
        user,
        password,
        database
      };
      if (shouldRequireSsl(host)) {
        connection.ssl = { rejectUnauthorized: false };
      }
      return connection;
    } catch {
      // fall through to environment variable approach
    }
  }

  const host = process.env.DB_HOST;
  if (!host) return null;
  const user = process.env.DB_USER || 'dbadmin';
  const password = extractPassword(process.env.DB_PASSWORD);
  const port = Number(process.env.DB_PORT || 5432);
  const database = process.env.DB_NAME || 'appdb';
  const connection = {
    host,
    port,
    user,
    password,
    database
  };
  if (shouldRequireSsl(host)) {
    connection.ssl = { rejectUnauthorized: false };
  }
  return connection;
}

/** @type {import('knex').Knex.Config} */
const connection = buildConnectionDetails();

const config = {
  client: 'pg',
  connection,
  migrations: {
    directory: useDist ? distMigrations : sourceMigrations,
    tableName: 'knex_migrations',
    extension: useDist ? 'js' : 'ts'
  }
};

module.exports = config;
