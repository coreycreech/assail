import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { extname } from 'node:path';
import { pool } from './db.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:4200' }));
app.use(express.json({ limit: '1mb' }));
const pick = (source, keys) => Object.fromEntries(keys.map(k => [k, source[k]]));
const toBit = value => (value === true || value === 1 || value === '1' || value === 'true') ? 1 : 0;
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
  const [result] = await pool.query('INSERT INTO CalendarEvent SET ?', [appointmentFrom(req.body)]);
  const [events] = await pool.query('SELECT * FROM CalendarEvent WHERE eventId = ?', [result.insertId]);
  res.status(201).json(events[0]);
});
app.put('/api/events/:id', async (req, res) => {
  const fields = ['eventTitle','eventStart','eventEnd','eventSubject','eventDetail','isBlock','isReadOnly','recurrenceRule','isAllDay'];
  await pool.query('UPDATE CalendarEvent SET ? WHERE eventId = ?', [pick(req.body, fields), req.params.id]); res.sendStatus(204);
});
app.delete('/api/events/:id', async (req, res) => { await pool.query('DELETE FROM CalendarEvent WHERE eventId = ?', [req.params.id]); res.sendStatus(204); });

app.get('/api/pages', async (_req, res) => { const [rows] = await pool.query('SELECT * FROM PageInfo ORDER BY name'); res.json(rows); });
app.get('/api/pages/:id/sections', async (req, res) => { const [rows] = await pool.query('SELECT * FROM PageSection WHERE pageId = ? ORDER BY sectionId', [req.params.id]); res.json(rows); });
app.post('/api/pages', async (req, res) => { const [r] = await pool.query('INSERT INTO PageInfo SET ?', pick(req.body, ['name','title','information'])); res.status(201).json({ pageId: r.insertId }); });
app.put('/api/pages/:id', async (req, res) => { await pool.query('UPDATE PageInfo SET ? WHERE pageId = ?', [pick(req.body, ['name','title','information']), req.params.id]); res.sendStatus(204); });
app.post('/api/pages/:id/sections', async (req, res) => { const [r] = await pool.query('INSERT INTO PageSection SET ?', { ...pick(req.body, ['sectionTitle','sectionInfo']), pageId: req.params.id }); res.status(201).json({ sectionId: r.insertId }); });
app.put('/api/sections/:id', async (req, res) => { await pool.query('UPDATE PageSection SET ? WHERE sectionId = ?', [pick(req.body, ['sectionTitle','sectionInfo']), req.params.id]); res.sendStatus(204); });
app.delete('/api/sections/:id', async (req, res) => { await pool.query('DELETE FROM PageSection WHERE sectionId = ?', [req.params.id]); res.sendStatus(204); });

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
  const [result] = await pool.query('DELETE FROM Client WHERE clientId = ?', [clientId]);
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

app.post('/api/auth/login', async (req, res) => { const [rows] = await pool.query('SELECT userId, userName, password, userTypeId, email, firstName, lastName FROM User WHERE userName = ?', [req.body.userName]); const user = rows[0]; const valid = user && (user.password.startsWith('$2') ? await bcrypt.compare(req.body.password || '', user.password) : user.password === req.body.password); if (!valid) return res.status(401).json({ message: 'Invalid credentials' }); delete user.password; res.json({ user }); });

app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ message: 'Something went wrong.' }); });
app.listen(process.env.PORT || 3000, () => console.log('Assail API listening'));
