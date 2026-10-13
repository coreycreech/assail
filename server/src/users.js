import bcrypt from 'bcryptjs';

const columns = 'userId, userName, userTypeId, email, sirName, firstName, middleName, lastName, suffix';
const fail = (status, message) => Object.assign(new Error(message), { status });

export function registerUsers(app, pool, requireAuth) {
  const admin = async (req, res, next) => {
    const [rows] = await pool.query('SELECT userTypeId FROM User WHERE userId = ?', [req.authUserId]);
    if (Number(rows[0]?.userTypeId) !== 1) return res.status(403).json({ message: 'Administrator access is required.' });
    next();
  };
  const idFrom = req => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw fail(400, 'Invalid user ID.');
    return id;
  };
  const fieldsFrom = async (body, creating) => {
    const fields = {};
    for (const [key, max] of Object.entries({ userName: 30, email: 50, sirName: 4, firstName: 30, middleName: 30, lastName: 30, suffix: 4 })) {
      if (body[key] != null && typeof body[key] !== 'string') throw fail(400, `Invalid ${key}.`);
      fields[key] = (body[key] || '').trim();
      if (fields[key].length > max) throw fail(400, `${key} must be ${max} characters or fewer.`);
    }
    if (!fields.userName || !fields.firstName || !fields.lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) throw fail(400, 'Username, first name, last name, and a valid email are required.');
    fields.userTypeId = Number(body.userTypeId);
    if (!Number.isSafeInteger(fields.userTypeId) || fields.userTypeId < 1) throw fail(400, 'Select a valid user type.');
    const [types] = await pool.query('SELECT userTypeId FROM UserType WHERE userTypeId = ?', [fields.userTypeId]);
    if (!types.length) throw fail(400, 'Selected user type does not exist.');
    const password = body.password;
    if (creating || (password !== undefined && password !== '')) {
      if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw fail(400, 'Password must be at least 12 characters and at most 72 UTF-8 bytes.');
      fields.password = await bcrypt.hash(password, 12);
    }
    return fields;
  };
  app.get('/api/users', requireAuth, admin, async (_req, res) => {
    const [rows] = await pool.query(`SELECT ${columns} FROM User ORDER BY userName`);
    res.json(rows);
  });
  app.get('/api/user-types', requireAuth, admin, async (_req, res) => {
    const [rows] = await pool.query('SELECT userTypeId, userTypeDesc FROM UserType ORDER BY userTypeId');
    res.json(rows);
  });
  const save = creating => async (req, res) => {
    const id = creating ? null : idFrom(req);
    const fields = await fieldsFrom(req.body || {}, creating);
    if (id === req.authUserId && fields.userTypeId !== 1) throw fail(400, 'You cannot remove your own administrator access.');
    const [duplicates] = await pool.query('SELECT userId FROM User WHERE userName = ? AND userId <> ?', [fields.userName, id || 0]);
    if (duplicates.length) throw fail(409, 'That username is already in use.');
    try {
      let savedId = id;
      if (creating) {
        const [result] = await pool.query('INSERT INTO User SET ?', [fields]);
        savedId = result.insertId;
      } else {
        const [existing] = await pool.query('SELECT userId FROM User WHERE userId = ?', [id]);
        if (!existing.length) throw fail(404, 'User not found.');
        await pool.query('UPDATE User SET ? WHERE userId = ?', [fields, id]);
      }
      const [rows] = await pool.query(`SELECT ${columns} FROM User WHERE userId = ?`, [savedId]);
      res.status(creating ? 201 : 200).json(rows[0]);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') throw fail(409, 'That username is already in use.');
      throw error;
    }
  };
  app.post('/api/users', requireAuth, admin, save(true));
  app.put('/api/users/:id', requireAuth, admin, save(false));
  app.delete('/api/users/:id', requireAuth, admin, async (req, res) => {
    const id = idFrom(req);
    if (id === req.authUserId) throw fail(400, 'You cannot delete your own account.');
    try {
      const [result] = await pool.query('DELETE FROM User WHERE userId = ?', [id]);
      if (!result.affectedRows) throw fail(404, 'User not found.');
      res.sendStatus(204);
    } catch (error) {
      if (error.code === 'ER_ROW_IS_REFERENCED_2') throw fail(409, 'This user is referenced by other records and cannot be deleted.');
      throw error;
    }
  });
}
