import test from 'node:test';
import assert from 'node:assert/strict';
import { isDatabaseConnectionError } from '../src/database-errors.js';
test('connection failures require a new sign-in, ordinary errors do not', () => {
  for (const code of ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_SERVER_SHUTDOWN']) {
    assert.equal(isDatabaseConnectionError({code}), true);
  }
  for (const code of ['ER_DUP_ENTRY', 'ER_NO_SUCH_TABLE', 'ER_DATA_TOO_LONG', undefined]) {
    assert.equal(isDatabaseConnectionError({code}), false);
  }
  assert.equal(isDatabaseConnectionError(null), false);
});
