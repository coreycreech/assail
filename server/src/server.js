import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { extname } from 'node:path';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { pool } from './db.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const authTokenSecret = process.env.AUTH_TOKEN_SECRET || randomBytes(32).toString('hex');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:4200' }));
app.use(express.json({ limit: '1mb' }));
const pick = (source, keys) => Object.fromEntries(keys.map(k => [k, source[k]]));
const toBit = value => (value === true || value === 1 || value === '1' || value === 'true') ? 1 : 0;
const issueAuthToken = user => {
  const payload = Buffer.from(JSON.stringify({ userId: user.userId, expiresAt: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const signature = createHmac('sha256', authTokenSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};
const requireAuth = (req, res, next) => {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return res.status(401).json({ message: 'Sign in to make this change.' });
  const expected = createHmac('sha256', authTokenSecret).update(payload).digest();
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return res.status(401).json({ message: 'Your sign-in has expired. Please sign in again.' });
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isInteger(claims.userId) || claims.userId < 1 || claims.expiresAt <= Date.now()) return res.status(401).json({ message: 'Your sign-in has expired. Please sign in again.' });
    req.authUserId = claims.userId;
    next();
  } catch {
    return res.status(401).json({ message: 'Your sign-in has expired. Please sign in again.' });
  }
};
const appointmentFrom = body => {
  const required = ['eventTitle', 'eventStart', 'eventEnd', 'eventSubject', 'eventDetail'];
  const missing = required.filter(field => !String(body[field] ?? '').trim());
  if (missing.length) {
    const error = new Error(`Missing required appointment fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
  const start = new Date(body.eventStart);
  const end = new Date(body.eventEnd);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
    const error = new Error('Appointment end time must be after its start time.');
    error.status = 400;
    throw error;
  }
  return {
    eventTitle: String(body.eventTitle).trim().slice(0, 50),
    eventStart: String(body.eventStart).replace('T', ' ').replace('Z', '').slice(0, 19),
    eventEnd: String(body.eventEnd).replace('T', ' ').replace('Z', '').slice(0, 19),
    eventSubject: String(body.eventSubject).trim().slice(0, 100),
    eventDetail: String(body.eventDetail).trim().slice(0, 300),
    isBlock: toBit(body.isBlock),
    isReadOnly: toBit(body.isReadOnly),
    recurrenceRule: String(body.recurrenceRule || '').slice(0, 50),
    isAllDay: toBit(body.isAllDay)
  };
};

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
});

app.get('/api/events', async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM CalendarEvent ORDER BY eventStart'); res.json(rows);
});
app.post('/api/events', async (req, res) => {
  const event = appointmentFrom(req.body);
  const [result] = await pool.query(
    'INSERT INTO CalendarEvent (eventTitle, eventStart, eventEnd, eventSubject, eventDetail, isBlock, isReadOnly, recurrenceRule, isAllDay) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [event.eventTitle, event.eventStart, event.eventEnd, event.eventSubject, event.eventDetail, event.isBlock, event.isReadOnly, event.recurrenceRule, event.isAllDay]
  );
  const [events] = await pool.query('SELECT * FROM CalendarEvent WHERE eventId = ?', [result.insertId]);
  res.status(201).json(events[0]);
});
app.put('/api/events/:id', async (req, res) => {
  const fields = ['eventTitle','eventStart','eventEnd','eventSubject','eventDetail','isBlock','isReadOnly','recurrenceRule','isAllDay'];
  await pool.query('UPDATE CalendarEvent SET ? WHERE eventId = ?', [pick(req.body, fields), req.params.id]); res.sendStatus(204);
});
app.delete('/api/events/:id', async (req, res) => { await pool.query('DELETE FROM CalendarEvent WHERE eventId = ?', [req.params.id]); res.sendStatus(204); });

const pageFieldsFrom = body => {
  const name = String(body.name ?? '').trim();
  const title = String(body.title ?? '').trim();
  const information = String(body.information ?? '').trim();
  if (!name || name.length > 30 || !title || title.length > 50 || information.length > 500) {
    const error = new Error('Page name, title, or information is missing or exceeds its maximum length.'); error.status = 400; throw error;
  }
  return { name, title, information };
};
const sectionFieldsFrom = body => {
  const sectionTitle = String(body.sectionTitle ?? '').trim();
  const sectionInfo = String(body.sectionInfo ?? '').trim();
  if (!sectionTitle || sectionTitle.length > 50 || sectionInfo.length > 500) {
    const error = new Error('Section title or information is missing or exceeds its maximum length.'); error.status = 400; throw error;
  }
  return { sectionTitle, sectionInfo };
};
app.get('/api/pages', async (_req, res) => { const [rows] = await pool.query('SELECT pageId, TRIM(name) AS name, TRIM(title) AS title, information FROM PageInfo ORDER BY name'); res.json(rows); });
app.get('/api/pages/:id/sections', async (req, res) => {
  const pageId = Number(req.params.id);
  if (!Number.isInteger(pageId) || pageId < 1) return res.status(400).json({ message: 'A valid pageId is required.' });
  const [rows] = await pool.query('SELECT sectionId, pageId, TRIM(sectionTitle) AS sectionTitle, sectionInfo FROM PageSection WHERE pageId = ? ORDER BY sectionId', [pageId]);
  res.json(rows);
});
app.post('/api/pages', requireAuth, async (req, res) => {
  const fields = pageFieldsFrom(req.body);
  const [result] = await pool.query('INSERT INTO PageInfo SET ?', [fields]);
  res.status(201).json({ pageId: result.insertId, ...fields });
});
app.put('/api/pages/:id', requireAuth, async (req, res) => {
  const pageId = Number(req.params.id);
  if (!Number.isInteger(pageId) || pageId < 1) return res.status(400).json({ message: 'A valid pageId is required.' });
  const fields = pageFieldsFrom(req.body);
  const [result] = await pool.query('UPDATE PageInfo SET ? WHERE pageId = ?', [fields, pageId]);
  if (!result.affectedRows) {
    const [existing] = await pool.query('SELECT pageId FROM PageInfo WHERE pageId = ?', [pageId]);
    if (!existing[0]) return res.sendStatus(404);
  }
  res.sendStatus(204);
});
app.post('/api/pages/:id/sections', requireAuth, async (req, res) => {
  const pageId = Number(req.params.id);
  if (!Number.isInteger(pageId) || pageId < 1) return res.status(400).json({ message: 'A valid pageId is required.' });
  const [pages] = await pool.query('SELECT pageId FROM PageInfo WHERE pageId = ?', [pageId]);
  if (!pages[0]) return res.sendStatus(404);
  const fields = sectionFieldsFrom(req.body);
  const [result] = await pool.query('INSERT INTO PageSection SET ?', { ...fields, pageId });
  res.status(201).json({ sectionId: result.insertId, pageId, ...fields });
});
app.put('/api/sections/:id', requireAuth, async (req, res) => {
  const sectionId = Number(req.params.id);
  if (!Number.isInteger(sectionId) || sectionId < 1) return res.status(400).json({ message: 'A valid sectionId is required.' });
  const fields = sectionFieldsFrom(req.body);
  const [result] = await pool.query('UPDATE PageSection SET ? WHERE sectionId = ?', [fields, sectionId]);
  if (!result.affectedRows) {
    const [existing] = await pool.query('SELECT sectionId FROM PageSection WHERE sectionId = ?', [sectionId]);
    if (!existing[0]) return res.sendStatus(404);
  }
  res.sendStatus(204);
});
app.delete('/api/sections/:id', requireAuth, async (req, res) => {
  const sectionId = Number(req.params.id);
  if (!Number.isInteger(sectionId) || sectionId < 1) return res.status(400).json({ message: 'A valid sectionId is required.' });
  const [result] = await pool.query('DELETE FROM PageSection WHERE sectionId = ?', [sectionId]);
  if (!result.affectedRows) return res.sendStatus(404);
  res.sendStatus(204);
});

app.get('/api/clients', async (_req, res) => { const [rows] = await pool.query('SELECT clientId, ClientName AS clientName, address, city, state, zip FROM Client ORDER BY ClientName, clientId'); res.json(rows); });
app.post('/api/clients', async (req, res) => {
  const clientName = String(req.body.clientName || '').trim().slice(0, 45);
  if (!clientName) return res.status(400).json({ message: 'clientName is required' });
  const address = String(req.body.address || '').trim().slice(0, 45);
  const city = String(req.body.city || '').trim().slice(0, 45);
  const state = String(req.body.state || '').trim().slice(0, 2);
  const zip = String(req.body.zip || '').trim().slice(0, 15);
  const [result] = await pool.query('INSERT INTO Client (ClientName, address, city, state, zip) VALUES (?, ?, ?, ?, ?)', [clientName, address || null, city || null, state || null, zip || null]);
  res.status(201).json({ clientId: result.insertId, clientName, address: address || null, city: city || null, state: state || null, zip: zip || null });
});
app.put('/api/clients/:id', async (req, res) => {
  const clientId = Number(req.params.id);
  const clientName = String(req.body.clientName || '').trim().slice(0, 45);
  if (!Number.isInteger(clientId) || clientId < 1 || !clientName) return res.status(400).json({ message: 'A valid clientId and clientName are required' });
  const address = String(req.body.address || '').trim().slice(0, 45);
  const city = String(req.body.city || '').trim().slice(0, 45);
  const state = String(req.body.state || '').trim().slice(0, 2);
  const zip = String(req.body.zip || '').trim().slice(0, 15);
  const [result] = await pool.query('UPDATE Client SET ClientName = ?, address = ?, city = ?, state = ?, zip = ? WHERE clientId = ?', [clientName, address || null, city || null, state || null, zip || null, clientId]);
  if (!result.affectedRows) {
    const [rows] = await pool.query('SELECT clientId FROM Client WHERE clientId = ?', [clientId]);
    if (!rows[0]) return res.sendStatus(404);
  }
  res.json({ clientId, clientName, address: address || null, city: city || null, state: state || null, zip: zip || null });
});
app.delete('/api/clients/:id', async (req, res) => {
  const clientId = Number(req.params.id);
  if (!Number.isInteger(clientId) || clientId < 1) return res.status(400).json({ message: 'A valid clientId is required' });
  const [documents] = await pool.query('SELECT COUNT(*) AS documentCount FROM Document WHERE clientId = ?', [clientId]);
  if (Number(documents[0].documentCount) > 0) return res.status(409).json({ message: 'This client has documents. Remove or reassign them before deleting the client.' });
  const [billing] = await pool.query('SELECT COUNT(*) AS billingCount FROM Billing WHERE clientId = ?', [clientId]);
  if (Number(billing[0].billingCount) > 0) return res.status(409).json({ message: 'This client has billing visits. Remove or reassign them before deleting the client.' });
  const [result] = await pool.query('DELETE FROM Client WHERE clientId = ?', [clientId]);
  if (!result.affectedRows) return res.sendStatus(404);
  res.sendStatus(204);
});

const serviceFieldsFrom = body => {
  const serviceName = String(body.serviceName ?? '').trim();
  const description = String(body.description ?? '').trim();
  const rate = Number(body.billingRate);
  if (!serviceName || serviceName.length > 100) return { error: 'Service name is required and must be 100 characters or fewer.' };
  if (body.billingRate === '' || body.billingRate === null || body.billingRate === undefined || !Number.isFinite(rate) || rate < 0 || rate > 99999999.99) return { error: 'Enter a valid non-negative billing rate.' };
  if (description.length > 500) return { error: 'Description must be 500 characters or fewer.' };
  return { fields: { serviceName, billingRate: Math.round(rate * 100) / 100, description: description || null } };
};
const serviceSelect = 'SELECT serviceId, serviceName, billingRate, description FROM Service';
const serviceRow = row => ({ ...row, billingRate: Number(row.billingRate) });
app.get('/api/services', async (_req, res) => {
  const [rows] = await pool.query(`${serviceSelect} ORDER BY serviceName, serviceId`);
  res.json(rows.map(serviceRow));
});
app.post('/api/services', async (req, res) => {
  const { fields, error } = serviceFieldsFrom(req.body);
  if (error) return res.status(400).json({ message: error });
  const [result] = await pool.query('INSERT INTO Service SET ?', [fields]);
  res.status(201).json(serviceRow({ serviceId: result.insertId, ...fields }));
});
app.put('/api/services/:id', async (req, res) => {
  const serviceId = Number(req.params.id);
  if (!Number.isInteger(serviceId) || serviceId < 1) return res.status(400).json({ message: 'A valid serviceId is required.' });
  const { fields, error } = serviceFieldsFrom(req.body);
  if (error) return res.status(400).json({ message: error });
  const [result] = await pool.query('UPDATE Service SET ? WHERE serviceId = ?', [fields, serviceId]);
  if (!result.affectedRows) {
    const [rows] = await pool.query('SELECT serviceId FROM Service WHERE serviceId = ?', [serviceId]);
    if (!rows[0]) return res.sendStatus(404);
  }
  res.json(serviceRow({ serviceId, ...fields }));
});
app.delete('/api/services/:id', async (req, res) => {
  const serviceId = Number(req.params.id);
  if (!Number.isInteger(serviceId) || serviceId < 1) return res.status(400).json({ message: 'A valid serviceId is required.' });
  const [billings] = await pool.query('SELECT COUNT(*) AS billingCount FROM Billing WHERE serviceId = ?', [serviceId]);
  if (Number(billings[0].billingCount) > 0) return res.status(409).json({ message: 'This service is used by billing records and cannot be deleted.' });
  const [result] = await pool.query('DELETE FROM Service WHERE serviceId = ?', [serviceId]);
  if (!result.affectedRows) return res.sendStatus(404);
  res.sendStatus(204);
});

const billingFieldsFrom = body => {
  const fail = message => { const error = new Error(message); error.status = 400; throw error; };
  const visitDate = String(body.visitDate ?? '').trim();
  const parsedVisitDate = new Date(`${visitDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || Number.isNaN(parsedVisitDate.valueOf()) || parsedVisitDate.toISOString().slice(0, 10) !== visitDate) fail('A valid visitDate is required (YYYY-MM-DD).');
  const serviceId = Number(body.serviceId);
  if (!Number.isInteger(serviceId) || serviceId < 1) fail('Select a service.');
  const timeField = (value, name) => {
    const time = String(value ?? '').trim();
    if (!time) return null;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) fail(`${name} must use HH:MM format.`);
    return `${time}:00`;
  };
  const startTime = timeField(body.startTime, 'startTime');
  const endTime = timeField(body.endTime, 'endTime');
  if (startTime && endTime && endTime <= startTime) fail('endTime must be after startTime.');
  const decimalField = (value, name, { required = false, positive = false } = {}) => {
    if (value === '' || value === null || value === undefined) {
      if (required) fail(`${name} is required.`);
      return null;
    }
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || (positive && number <= 0) || number > 999999.99) fail(`${name} must be a valid ${positive ? 'positive ' : ''}number.`);
    return Math.round(number * 100) / 100;
  };
  const units = decimalField(body.units, 'units', { required: true, positive: true });
  const billingCode = String(body.billingCode ?? '').trim();
  const notes = String(body.notes ?? '').trim();
  if (billingCode.length > 30) fail('billingCode must be 30 characters or fewer.');
  if (Buffer.byteLength(notes, 'utf8') > 65535) fail('notes must be 65,535 bytes or fewer.');
  return {
    visitDate, startTime, endTime, serviceId,
    billingCode: billingCode || null, units, notes: notes || null
  };
};
const billingSelect = `SELECT billingId, clientId, DATE_FORMAT(visitDate, '%Y-%m-%d') AS visitDate,
  TIME_FORMAT(startTime, '%H:%i') AS startTime, TIME_FORMAT(endTime, '%H:%i') AS endTime,
  serviceId, serviceDescription, billingCode, units, rate, amount, notes, createdAt, updatedAt FROM Billing`;
const billingRow = row => ({ ...row, serviceId: row.serviceId === null ? null : Number(row.serviceId), units: Number(row.units), rate: row.rate === null ? null : Number(row.rate), amount: row.amount === null ? null : Number(row.amount) });
const serviceForBilling = async serviceId => {
  const [services] = await pool.query('SELECT serviceId, serviceName, billingRate FROM Service WHERE serviceId = ?', [serviceId]);
  if (!services[0]) {
    const error = new Error('The selected service could not be found. Refresh the worksheet and try again.'); error.status = 400; throw error;
  }
  return { serviceId: services[0].serviceId, serviceDescription: services[0].serviceName, rate: Number(services[0].billingRate) };
};
app.get('/api/clients/:clientId/billing', async (req, res) => {
  const clientId = Number(req.params.clientId);
  if (!Number.isInteger(clientId) || clientId < 1) return res.status(400).json({ message: 'A valid clientId is required.' });
  const [clients] = await pool.query('SELECT clientId FROM Client WHERE clientId = ?', [clientId]);
  if (!clients[0]) return res.sendStatus(404);
  const [rows] = await pool.query(`${billingSelect} WHERE clientId = ? ORDER BY visitDate DESC, billingId DESC`, [clientId]);
  res.json(rows.map(billingRow));
});
app.post('/api/clients/:clientId/billing', async (req, res) => {
  const clientId = Number(req.params.clientId);
  if (!Number.isInteger(clientId) || clientId < 1) return res.status(400).json({ message: 'A valid clientId is required.' });
  const [clients] = await pool.query('SELECT clientId FROM Client WHERE clientId = ?', [clientId]);
  if (!clients[0]) return res.status(404).json({ message: 'Client not found.' });
  const fields = billingFieldsFrom(req.body);
  const service = await serviceForBilling(fields.serviceId);
  const rate = service.rate;
  const amount = Math.round(fields.units * rate * 100) / 100;
  const [result] = await pool.query('INSERT INTO Billing (clientId, serviceId, visitDate, startTime, endTime, serviceDescription, billingCode, units, rate, amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [clientId, service.serviceId, fields.visitDate, fields.startTime, fields.endTime, service.serviceDescription, fields.billingCode, fields.units, rate, amount, fields.notes]);
  const [rows] = await pool.query(`${billingSelect} WHERE billingId = ?`, [result.insertId]);
  res.status(201).json(billingRow(rows[0]));
});
app.put('/api/billing/:id', async (req, res) => {
  const billingId = Number(req.params.id);
  if (!Number.isInteger(billingId) || billingId < 1) return res.status(400).json({ message: 'A valid billingId is required.' });
  const fields = billingFieldsFrom(req.body);
  const service = await serviceForBilling(fields.serviceId);
  const rate = service.rate;
  const amount = Math.round(fields.units * rate * 100) / 100;
  const [result] = await pool.query('UPDATE Billing SET serviceId = ?, visitDate = ?, startTime = ?, endTime = ?, serviceDescription = ?, billingCode = ?, units = ?, rate = ?, amount = ?, notes = ? WHERE billingId = ?', [service.serviceId, fields.visitDate, fields.startTime, fields.endTime, service.serviceDescription, fields.billingCode, fields.units, rate, amount, fields.notes, billingId]);
  if (!result.affectedRows) {
    const [existing] = await pool.query('SELECT billingId FROM Billing WHERE billingId = ?', [billingId]);
    if (!existing[0]) return res.sendStatus(404);
  }
  const [rows] = await pool.query(`${billingSelect} WHERE billingId = ?`, [billingId]);
  res.json(billingRow(rows[0]));
});
app.delete('/api/billing/:id', async (req, res) => {
  const billingId = Number(req.params.id);
  if (!Number.isInteger(billingId) || billingId < 1) return res.status(400).json({ message: 'A valid billingId is required.' });
  const [result] = await pool.query('DELETE FROM Billing WHERE billingId = ?', [billingId]);
  if (!result.affectedRows) return res.sendStatus(404);
  res.sendStatus(204);
});

const resourceColumns = { name: 45, phone: 15, address1: 45, address2: 45, city: 45, state: 2, zip: 15, Url: 100 };
const resourceFields = body => Object.fromEntries(Object.entries(resourceColumns).map(([field, max]) => {
  const value = String(body[field] ?? '').trim().slice(0, max);
  return [field, value || null];
}));
app.get('/api/resources', async (_req, res) => {
  const [rows] = await pool.query('SELECT resourceId, name, phone, address1, address2, city, state, zip, Url FROM resource ORDER BY name, resourceId');
  res.json(rows);
});
app.post('/api/resources', async (req, res) => {
  const fields = resourceFields(req.body);
  const [result] = await pool.query('INSERT INTO resource SET ?', [fields]);
  res.status(201).json({ resourceId: result.insertId, ...fields });
});
app.put('/api/resources/:id', async (req, res) => {
  const resourceId = Number(req.params.id);
  if (!Number.isInteger(resourceId) || resourceId < 1) return res.status(400).json({ message: 'A valid resourceId is required' });
  const fields = resourceFields(req.body);
  const [result] = await pool.query('UPDATE resource SET ? WHERE resourceId = ?', [fields, resourceId]);
  if (!result.affectedRows) {
    const [rows] = await pool.query('SELECT resourceId FROM resource WHERE resourceId = ?', [resourceId]);
    if (!rows[0]) return res.sendStatus(404);
  }
  res.json({ resourceId, ...fields });
});
app.delete('/api/resources/:id', async (req, res) => {
  const resourceId = Number(req.params.id);
  if (!Number.isInteger(resourceId) || resourceId < 1) return res.status(400).json({ message: 'A valid resourceId is required' });
  const [result] = await pool.query('DELETE FROM resource WHERE resourceId = ?', [resourceId]);
  if (!result.affectedRows) return res.sendStatus(404);
  res.sendStatus(204);
});
app.get('/api/documents', async (_req, res) => { const [rows] = await pool.query('SELECT docId, docName, clientId, filePath FROM Document ORDER BY docId DESC'); res.json(rows); });
app.get('/api/documents/:id/download', async (req, res) => { const [rows] = await pool.query('SELECT docName, docBlob FROM Document WHERE docId = ?', [req.params.id]); if (!rows[0]) return res.sendStatus(404); res.attachment(rows[0].docName).send(rows[0].docBlob); });
app.get('/api/documents/:id/view', async (req, res) => {
  const [rows] = await pool.query('SELECT filePath, docBlob FROM Document WHERE docId = ?', [req.params.id]);
  if (!rows[0]) return res.sendStatus(404);
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.txt': 'text/plain; charset=utf-8'
  };
  const contentType = contentTypes[extname(rows[0].filePath).toLowerCase()];
  if (!contentType) return res.status(415).json({ message: 'Preview is available for PDF and image files.' });
  res.set({ 'Content-Type': contentType, 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff' }).send(rows[0].docBlob);
});
app.post('/api/documents', upload.single('file'), async (req, res) => { if (!req.file || !req.body.clientId) return res.status(400).json({ message: 'file and clientId are required' }); const [r] = await pool.query('INSERT INTO Document SET ?', [{ docName: req.file.originalname.slice(0,50), docBlob: req.file.buffer, clientId: req.body.clientId, filePath: req.file.originalname.slice(0,200) }]); res.status(201).json({ docId: r.insertId }); });
app.delete('/api/documents/:id', async (req, res) => { await pool.query('DELETE FROM Document WHERE docId = ?', [req.params.id]); res.sendStatus(204); });

app.post('/api/auth/login', async (req, res) => { const [rows] = await pool.query('SELECT userId, userName, password, userTypeId, email, firstName, lastName FROM User WHERE userName = ?', [req.body.userName]); const user = rows[0]; const valid = user && (user.password.startsWith('$2') ? await bcrypt.compare(req.body.password || '', user.password) : user.password === req.body.password); if (!valid) return res.status(401).json({ message: 'Invalid credentials' }); delete user.password; res.json({ user, token: issueAuthToken(user) }); });

app.use((err, _req, res, _next) => {
  console.error(err);
  const message = err.status
    ? err.message
    : process.env.NODE_ENV === 'production'
      ? 'Something went wrong.'
      : err.sqlMessage || err.message;
  res.status(err.status || 500).json({ message });
});
app.listen(process.env.PORT || 3000, () => console.log('Assail API listening'));
