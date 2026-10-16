import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureHomeResources } from '../src/home-resources-migration.js';

function fixture(options = {}) {
  let applied = false;
  const calls = [];
  const connection = {
    async query(sql, values) {
      calls.push({sql, values});
      if (sql.includes('GET_LOCK')) return [[{acquired: 1}]];
      if (sql.startsWith('SELECT migrationKey')) return [applied ? [{migrationKey: 'done'}] : []];
      if (sql.startsWith('SELECT resourceId')) return [options.missing ? [] : []];
      if (sql.startsWith('INSERT INTO resource') && options.fail) throw new Error('Insert failed');
      if (sql.startsWith('INSERT INTO AppMigration')) applied = true;
      return [[]];
    },
    async beginTransaction() {},
    async commit() { calls.push({sql: 'COMMIT'}); },
    async rollback() { calls.push({sql: 'ROLLBACK'}); },
    release() { calls.push({sql: 'RELEASE'}); }
  };
  return {calls, pool: {getConnection: async () => connection}};
}

test('initializes resource links once and leaves later administrator changes alone', async () => {
  const f = fixture();
  await ensureHomeResources(f.pool, () => {});
  const inserts = f.calls.filter(c => c.sql.startsWith('INSERT INTO resource'));
  assert.equal(inserts.length, 10);
  assert.ok(inserts.every(c => c.values[0].length <= 45 && (!c.values[1] || c.values[1].length <= 100)));
  f.calls.length = 0;
  await ensureHomeResources(f.pool, () => {});
  assert.ok(!f.calls.some(c => /^(INSERT|DELETE|UPDATE) /.test(c.sql)));
});


test('failed initialization rolls back and releases connection and lock', async () => {
  const f = fixture({fail: true});
  await assert.rejects(ensureHomeResources(f.pool, () => {}), /Insert failed/);
  assert.ok(!f.calls.some(c => c.sql.startsWith('INSERT INTO AppMigration')));
  assert.ok(f.calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(f.calls.some(c => c.sql.includes('RELEASE_LOCK')));
  assert.equal(f.calls.at(-1).sql, 'RELEASE');
});
