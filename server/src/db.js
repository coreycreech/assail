import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

// Keep external credentials separate from hosting-provided DB_* settings.
const external = Object.keys(process.env).some(key => key.startsWith('ASSAIL_DB_'));
const prefix = external ? 'ASSAIL_DB_' : 'DB_';
if (external) {
  for (const key of ['HOST', 'USER', 'PASSWORD', 'NAME']) {
    if (!process.env[`${prefix}${key}`]) {
      throw new Error(`Missing required external database setting: ${prefix}${key}`);
    }
  }
}

console.info('Database target:', {
  source: prefix,
  host: process.env[`${prefix}HOST`] || '(unset)',
  port: Number(process.env[`${prefix}PORT`] || 3306),
  database: process.env[`${prefix}NAME`] || 'assailHealthcare'
});

export const pool = mysql.createPool({
  host: process.env[`${prefix}HOST`],
  port: Number(process.env[`${prefix}PORT`] || 3306),
  user: process.env[`${prefix}USER`],
  password: process.env[`${prefix}PASSWORD`] || '',
  database: process.env[`${prefix}NAME`] || 'assailHealthcare',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});
