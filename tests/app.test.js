const request = require('supertest');
const app = require('../app');
const pool = require('../db');

describe('GET /', () => {
  it('should return a running message', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Secure Job Application API is running (v2)');
  });
});

describe('POST /register', () => {
  it('should register a new user with a unique email', async () => {
    const uniqueEmail = `test_${Date.now()}@example.com`;

    const response = await request(app)
      .post('/register')
      .send({ email: uniqueEmail, password: 'testpassword123' });

    expect(response.status).toBe(201);
    expect(response.body.email).toBe(uniqueEmail);
    expect(response.body.password_hash).toBeUndefined();
  });
});

afterAll(async () => {
  await pool.end();
});