const request = require('supertest');
const app = require('../app');

describe('GET /', () => {
  it('should return a running message', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Secure Job Application API is running (v2)');
  });
});