import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const production = process.env.NODE_ENV === 'production';
if (!production) {
  dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
}

// Production uses only the hosting environment, never bundled local settings.
const prefix = 'DB_';
if (production) {
  for (const key of ['HOST', 'USER', 'PASSWORD', 'NAME']) {
    if (!process.env[`${prefix}${key}`]) {
      throw new Error(`Missing required hosted database setting: ${prefix}${key}`);
    }
  }
}

console.info('Database target:', {
  configuration: 'hosted-db-v2',
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
