import test from 'node:test';
import assert from 'node:assert/strict';
import { ensurePasswordCapacity } from '../src/migrations.js';

function fixture(capacity = 30, options = {}) {
  const calls = []; let released = false;
  const column = { dataType:'varchar', capacity, charset:'utf8mb3', collation:'utf8mb3_general_ci', nullable:'NO' };
  const connection = {
    async query(sql) {
      calls.push(sql);
      if (sql.includes('GET_LOCK')) return [[{acquired: options.lock === false ? 0 : 1}]];
      if (sql.includes('information_schema')) return [options.missing ? [] : [{...column}]];
      if (sql.startsWith('ALTER')) { if(options.fail)throw new Error('ALTER denied');column.capacity=255; }
      return [[]];
    },
    release() { released=true; }
  };
  return {pool:{getConnection:async()=>connection},calls,get released(){return released;}};
}
test('widens a legacy password column once and preserves its encoding', async()=>{
  const f=fixture();await ensurePasswordCapacity(f.pool,()=>{});await ensurePasswordCapacity(f.pool,()=>{});
  const changes=f.calls.filter(sql=>sql.startsWith('ALTER'));
  assert.equal(changes.length,1);
  assert.match(changes[0],/VARCHAR\(255\) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL/);
  assert.ok(f.released);
});
test('does not shrink a wider column', async()=>{
  const f=fixture(512);await ensurePasswordCapacity(f.pool,()=>{});assert.ok(!f.calls.some(sql=>sql.startsWith('ALTER')));
});
test('missing schema and denied ALTER fail cleanly and release the lock', async()=>{
  for(const options of [{missing:true},{fail:true}]) {
    const f=fixture(30,options);await assert.rejects(ensurePasswordCapacity(f.pool,()=>{}));
    assert.ok(f.calls.some(sql=>sql.includes('RELEASE_LOCK')));assert.ok(f.released);
  }
});
test('lock timeout prevents schema changes', async()=>{
  const f=fixture(30,{lock:false});await assert.rejects(ensurePasswordCapacity(f.pool,()=>{}));
  assert.ok(!f.calls.some(sql=>sql.startsWith('ALTER')));assert.ok(f.released);
});
