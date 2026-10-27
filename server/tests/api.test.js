process.env.JWT_SECRET = 'test_secret';
process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = 'uploads/test';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

let mongo;
const api = () => request(app);
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const hours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();
const job = { title: 'Dev', description: 'Build things', location: 'Remote', status: 'published' };

beforeAll(async () => { mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri()); });
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });

const register = async (body) => (await api().post('/api/auth/register').send(body)).body;
let adminA, adminB, cand, cand2, recruiter, jobA, appA;

describe('Authentication', () => {
  test('registers, rejects duplicates and weak passwords, logs in', async () => {
    adminA = await register({ name: 'A', email: 'a@x.com', password: 'password1', role: 'admin', organizationName: 'OrgA' });
    adminB = await register({ name: 'B', email: 'b@x.com', password: 'password1', role: 'admin', organizationName: 'OrgB' });
    cand = await register({ name: 'C', email: 'c@x.com', password: 'password1', role: 'candidate' });
    cand2 = await register({ name: 'D', email: 'd@x.com', password: 'password1', role: 'candidate' });
    expect(adminA.token).toBeTruthy();
    expect((await api().post('/api/auth/register').send({ name: 'A', email: 'a@x.com', password: 'password1', role: 'candidate' })).status).toBe(409);
    expect((await api().post('/api/auth/register').send({ name: 'E', email: 'e@x.com', password: 'short', role: 'candidate' })).status).toBe(400);
    expect((await api().post('/api/auth/login').send({ email: 'a@x.com', password: 'password1' })).status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email: 'a@x.com', password: 'wrongpass' })).status).toBe(401);
  });
  test('cannot self-register as recruiter', async () => {
    expect((await api().post('/api/auth/register').send({ name: 'R', email: 'r@x.com', password: 'password1', role: 'recruiter' })).status).toBe(400);
  });
  test('protected routes require a token', async () => {
    expect((await api().get('/api/jobs')).status).toBe(401);
  });
});

describe('Permissions & organization isolation', () => {
  test('candidate cannot create jobs; admin can; admin adds recruiter', async () => {
    expect((await api().post('/api/jobs').set(auth(cand.token)).send(job)).status).toBe(403);
    const res = await api().post('/api/jobs').set(auth(adminA.token)).send(job);
    expect(res.status).toBe(201);
    jobA = res.body;
    const r = await api().post('/api/users').set(auth(adminA.token)).send({ name: 'Rec', email: 'rec@x.com', password: 'password1', role: 'recruiter' });
    expect(r.status).toBe(201);
    recruiter = (await api().post('/api/auth/login').send({ email: 'rec@x.com', password: 'password1' })).body;
    expect((await api().post('/api/users').set(auth(recruiter.token)).send({ name: 'X', email: 'x@x.com', password: 'password1', role: 'recruiter' })).status).toBe(403);
  });
  test("another organization cannot read or edit this org's job", async () => {
    expect((await api().get(`/api/jobs/${jobA._id}`).set(auth(adminB.token))).status).toBe(404);
    expect((await api().put(`/api/jobs/${jobA._id}`).set(auth(adminB.token)).send(job)).status).toBe(404);
    expect((await api().get('/api/jobs').set(auth(adminB.token))).body).toHaveLength(0);
  });
  test('rejects NoSQL operator injection in login', async () => {
    const res = await api().post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
  });
});

describe('Applications', () => {
  const apply = (token) => api().post('/api/applications').set(auth(token))
    .field('job', jobA._id).attach('resume', Buffer.from('%PDF-1.4 test'), { filename: 'cv.pdf', contentType: 'application/pdf' });

  test('candidate applies once; duplicate application is rejected', async () => {
    const first = await apply(cand.token);
    expect(first.status).toBe(201);
    appA = first.body;
    expect((await apply(cand.token)).status).toBe(409);
  });
  test('rejects non-document resumes and staff applying', async () => {
    const bad = await api().post('/api/applications').set(auth(cand2.token)).field('job', jobA._id)
      .attach('resume', Buffer.from('x'), { filename: 'evil.exe', contentType: 'application/octet-stream' });
    expect(bad.status).toBe(400);
    expect((await apply(adminA.token)).status).toBe(403);
  });
  test('other org cannot download the resume; own org can', async () => {
    expect((await api().get(`/api/applications/${appA._id}/resume`).set(auth(adminB.token))).status).toBe(404);
    expect((await api().get(`/api/applications/${appA._id}/resume`).set(auth(adminA.token))).status).toBe(200);
  });
});

describe('Interview scheduling', () => {
  const schedule = (token, body) => api().post('/api/interviews').set(auth(token)).send({ application: appA._id, interviewer: recruiter.user.id, ...body });

  test('schedules an interview and moves application to "interview"', async () => {
    const res = await schedule(adminA.token, { start: hours(24), end: hours(25) });
    expect(res.status).toBe(201);
    const apps = await api().get('/api/applications').set(auth(adminA.token));
    expect(apps.body[0].status).toBe('interview');
  });
  test('blocks overlapping interviews for the same interviewer', async () => {
    const res = await schedule(adminA.token, { start: hours(24.5), end: hours(25.5) });
    expect(res.status).toBe(409);
  });
  test('allows back-to-back slots and rejects invalid ranges / past dates', async () => {
    expect((await schedule(adminA.token, { start: hours(25), end: hours(26) })).status).toBe(201);
    expect((await schedule(adminA.token, { start: hours(30), end: hours(29) })).status).toBe(400);
    expect((await schedule(adminA.token, { start: hours(-5), end: hours(-4) })).status).toBe(400);
  });
  test('candidates cannot schedule; other orgs cannot use this application', async () => {
    expect((await schedule(cand.token, { start: hours(40), end: hours(41) })).status).toBe(403);
    expect((await schedule(adminB.token, { start: hours(40), end: hours(41) })).status).toBe(404);
  });
});
