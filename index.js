const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const authenticateToken = require('./middleware/auth');

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Secure Job Application API is running (v2)' });
});

app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ message: 'Login successful', token });
});

app.get('/me', authenticateToken, (req, res) => {
  res.json({ userId: req.userId });
});

app.post('/applications', authenticateToken, async (req, res) => {
  const { company, role } = req.body;

  if (!company || !role) {
    return res.status(400).json({ error: 'Company and role are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO job_applications (user_id, company, role) VALUES ($1, $2, $3) RETURNING *',
      [req.userId, company, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/applications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM job_applications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


app.patch('/applications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE job_applications SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [status, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
// ↑↑↑ NEW ROUTE ENDS HERE ↑↑↑

app.listen(3000, () => {
  console.log('Server is running on port http://localhost:3000');
});

app.delete('/applications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM job_applications WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application deleted', application: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port http://localhost:3000');
});