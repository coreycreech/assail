// Incremental migration only: never import a dump or replace application tables.
export async function ensurePasswordCapacity(pool, log = console.info) {
  const connection = await pool.getConnection();
  let locked = false;
  try {
    // Preview and published instances can start against the same database.
    const [locks] = await connection.query("SELECT GET_LOCK(CONCAT(LEFT(DATABASE(), 40), ':password-width'), 60) AS acquired");
    locked = Number(locks[0]?.acquired) === 1;
    if (!locked) throw new Error('Could not acquire the password migration lock. Retry startup.');
    const [columns] = await connection.query(`SELECT DATA_TYPE AS dataType,
      CHARACTER_MAXIMUM_LENGTH AS capacity, CHARACTER_SET_NAME AS charset,
      COLLATION_NAME AS collation, IS_NULLABLE AS nullable
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'User' AND COLUMN_NAME = 'password'`);
    const column = columns[0];
    if (!column) throw new Error('Password migration requires the existing User.password column. No tables were created or replaced.');
    if (Number(column.capacity) >= 255) {
      log('Password migration: existing column capacity is sufficient.');
      return;
    }
    if (column.dataType !== 'varchar') throw new Error('Password migration expected a VARCHAR column; inspect the schema before retrying.');
    if (![column.charset, column.collation].every(value => typeof value === 'string' && /^[a-zA-Z0-9_]+$/.test(value))) {
      throw new Error('Password migration encountered unsupported column metadata.');
    }
    await connection.query(`ALTER TABLE \`User\` MODIFY COLUMN \`password\` VARCHAR(255) CHARACTER SET ${column.charset} COLLATE ${column.collation} ${column.nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    log('Password migration: User.password widened to VARCHAR(255); existing records preserved.');
  } finally {
    try {
      if (locked) await connection.query("SELECT RELEASE_LOCK(CONCAT(LEFT(DATABASE(), 40), ':password-width'))");
    } finally { connection.release(); }
  }
}
