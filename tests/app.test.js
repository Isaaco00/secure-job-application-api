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

describe('POST /login and protected routes', () => {
  it('should log in and access /me with a valid token', async () => {
    const email = `login_${Date.now()}@example.com`;
    const password = 'testpassword123';

    await request(app).post('/register').send({ email, password });

    const loginResponse = await request(app)
      .post('/login')
      .send({ email, password });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    const token = loginResponse.body.token;

    const meResponse = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.userId).toBeDefined();
  });

  it('should reject /me with no token', async () => {
    const response = await request(app).get('/me');

    expect(response.status).toBe(401);
  });

  it('should reject /me with an invalid token', async () => {
    const response = await request(app)
      .get('/me')
      .set('Authorization', 'Bearer invalidtoken123');

    expect(response.status).toBe(403);
  });
});

describe('Job application ownership', () => {
  async function createUserAndToken() {
    const email = `owner_${Date.now()}_${Math.random()}@example.com`;
    const password = 'testpassword123';

    await request(app).post('/register').send({ email, password });
    const loginResponse = await request(app).post('/login').send({ email, password });

    return loginResponse.body.token;
  }

  it('should not allow one user to see another user\'s applications', async () => {
    const tokenA = await createUserAndToken();
    const tokenB = await createUserAndToken();

    await request(app)
      .post('/applications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ company: 'CompanyA', role: 'RoleA' });

    const responseB = await request(app)
      .get('/applications')
      .set('Authorization', `Bearer ${tokenB}`);

    const companies = responseB.body.results.map((app) => app.company);
    expect(companies).not.toContain('CompanyA');
  });

  it('should not allow one user to update another user\'s application', async () => {
    const tokenA = await createUserAndToken();
    const tokenB = await createUserAndToken();

    const createResponse = await request(app)
      .post('/applications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ company: 'CompanyC', role: 'RoleC' });

    const applicationId = createResponse.body.id;

    const updateAttempt = await request(app)
      .patch(`/applications/${applicationId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'rejected' });

    expect(updateAttempt.status).toBe(404);
  });
});

afterAll(async () => {
  await pool.end();
});