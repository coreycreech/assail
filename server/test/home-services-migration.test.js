import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureHomeServiceSections } from '../src/home-services-migration.js';

function fixture(options = {}) {
  let applied = false;
  const calls = [];
  const connection = {
    async query(sql, values) {
      calls.push({sql, values});
      if (sql.includes('GET_LOCK')) return [[{acquired: 1}]];
      if (sql.startsWith('SELECT migrationKey')) return [applied ? [{migrationKey: 'done'}] : []];
      if (sql.startsWith('SELECT pageId')) return [options.missing ? [] : [{pageId: 7}]];
      if (sql.startsWith('INSERT INTO PageSection') && options.fail) throw new Error('Insert failed');
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

test('initializes Home panels once and leaves later administrator changes alone', async () => {
  const f = fixture();
  await ensureHomeServiceSections(f.pool, () => {});
  const inserts = f.calls.filter(c => c.sql.startsWith('INSERT INTO PageSection'));
  assert.equal(inserts.length, 6);
  assert.ok(inserts.every(c => c.values[0] === 7));
  f.calls.length = 0;
  await ensureHomeServiceSections(f.pool, () => {});
  assert.ok(!f.calls.some(c => /^(INSERT|DELETE|UPDATE) /.test(c.sql)));
});

test('missing Home page is not marked as migrated', async () => {
  const f = fixture({missing: true});
  await ensureHomeServiceSections(f.pool, () => {});
  assert.ok(!f.calls.some(c => c.sql.startsWith('INSERT')));
  assert.ok(f.calls.some(c => c.sql === 'ROLLBACK'));
});

test('failed initialization rolls back and releases connection and lock', async () => {
  const f = fixture({fail: true});
  await assert.rejects(ensureHomeServiceSections(f.pool, () => {}), /Insert failed/);
  assert.ok(!f.calls.some(c => c.sql.startsWith('INSERT INTO AppMigration')));
  assert.ok(f.calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(f.calls.some(c => c.sql.includes('RELEASE_LOCK')));
  assert.equal(f.calls.at(-1).sql, 'RELEASE');
});
