import net from 'net';
import dns from 'dns';
import { Pool, types } from 'pg';

// Return PostgreSQL DATE as 'YYYY-MM-DD' string without timezone shifting
types.setTypeParser(1082, (val: string) => val);

// Fix Windows IPv4 resolution
if (process.platform === 'win32') {
  if ((net as any).setDefaultAutoSelectFamily) {
    (net as any).setDefaultAutoSelectFamily(false);
  }
  const origLookup = dns.lookup;
  dns.lookup = function (hostname: string, options: any, callback: any) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    } else if (typeof options === 'number') {
      options = { family: options };
    }
    options = Object.assign({}, options, { family: 4 });
    return origLookup.call(dns, hostname, options, callback);
  } as any;
}

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (_pool) return _pool;

  const rawUrl = process.env.DATABASE_URL || '';
  if (!rawUrl) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }

  let connectionString = rawUrl;
  try {
    const url = new URL(rawUrl);
    url.searchParams.delete('channel_binding');
    connectionString = url.toString();
  } catch (e) {}

  _pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  });

  _pool.on('error', (err) => {
    console.warn('PostgreSQL pool idle client warning:', err.message);
  });

  return _pool;
}

export const pool: Pool = new Proxy({} as Pool, {
  get(target, prop: string | symbol) {
    const p = getPool() as any;
    const val = p[prop];
    return typeof val === 'function' ? val.bind(p) : val;
  },
});
