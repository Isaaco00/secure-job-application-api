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

  it('should reject registration with missing fields', async () => {
    const response = await request(app)
      .post('/register')
      .send({ email: 'incomplete@example.com' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Email and password are required');
  });

  it('should reject registration with a duplicate email', async () => {
    const duplicateEmail = `dup_${Date.now()}@example.com`;

    await request(app)
      .post('/register')
      .send({ email: duplicateEmail, password: 'testpassword123' });

    const response = await request(app)
      .post('/register')
      .send({ email: duplicateEmail, password: 'testpassword123' });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Email already registered');
  });
});

afterAll(async () => {
  await pool.end();
});