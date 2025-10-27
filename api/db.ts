import knex, { Knex } from 'knex';
import { URL } from 'node:url';

let db: Knex | null = null;

function extractPassword(raw?: string | null): string {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.password === 'string') {
      return parsed.password;
    }
  } catch {
    // ignore parse error and fall through
  }
  return raw;
}

function shouldRequireSsl(host?: string | null): boolean {
  const override = process.env['DB_SSL']?.toLowerCase();
  if (override === 'true') return true;
  if (override === 'false') return false;
  if (!host) return false;
  return host !== 'localhost' && host !== '127.0.0.1';
}

function buildConnectionConfig(): Knex.StaticConnectionConfig | null {
  const urlString = process.env['SUPABASE_DB_URL'] ?? null;
  if (urlString) {
    try {
      const parsed = new URL(urlString);
      const host = parsed.hostname;
      const port = parsed.port ? Number(parsed.port) : 5432;
      const user = decodeURIComponent(parsed.username || 'dbadmin');
      const password = parsed.password ? decodeURIComponent(parsed.password) : '';
      const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'appdb';
      const connection: Knex.StaticConnectionConfig = {
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
      // fall through to env-based configuration
    }
  }

  const host = process.env['DB_HOST'];
  if (!host) return null;
  const user = process.env['DB_USER'] || 'dbadmin';
  const password = extractPassword(process.env['DB_PASSWORD']);
  const port = Number(process.env['DB_PORT'] || 5432);
  const database = process.env['DB_NAME'] || 'appdb';
  const connection: Knex.StaticConnectionConfig = {
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

export function getDb(): Knex | null {
  const connection = buildConnectionConfig();
  if (!connection) return null;
  if (!db) {
    db = knex({ client: 'pg', connection });
  }
  return db;
}
