import {describe, expect, it} from 'vitest';
import request from 'supertest';

process.env.JOB_SOURCES_JSON = '[]';
const app = (await import('./server.js')).default;

describe('API', () => {
  it('reports health without placeholder jobs', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.jobs).toBe(0);
  });

  it('registers and returns explainable recommendations', async () => {
    const email = `test-${Date.now()}@example.com`;
    const signup = await request(app).post('/api/auth/register').send({email, password: 'strong-pass-123', name: 'Test User'});
    expect(signup.status).toBe(201);
    const response = await request(app).get('/api/jobs/recommended').set('Authorization', `Bearer ${signup.body.token}`);
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(0);
  });
});

describe('Resume privacy', () => {
  it('does not expose uploaded resume text in profile responses', async () => {
    const email = `resume-${Date.now()}@example.com`;
    const signup = await request(app).post('/api/auth/register').send({email, password: 'strong-pass-123', name: 'Resume User'});
    const upload = await request(app).post('/api/resumes').set('Authorization', `Bearer ${signup.body.token}`).attach('resume', Buffer.from('Backend engineer with TypeScript and PostgreSQL.'), 'resume.txt');
    expect(upload.status).toBe(200);
    expect(upload.body.profile).not.toHaveProperty('experienceText');
    const me = await request(app).get('/api/me').set('Authorization', `Bearer ${signup.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.profile).not.toHaveProperty('experienceText');
  });
});
