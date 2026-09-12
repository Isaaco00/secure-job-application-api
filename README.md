# Secure Job Application API

A RESTful backend API for tracking job applications, built with authentication and authorization as first-class concerns rather than an afterthought. Users can register, log in, and manage their own job applications — with strict guarantees that one user's data is never accessible to another.

## Features

- User registration with hashed passwords (bcrypt)
- JWT-based authentication and login
- Protected routes requiring a valid token
- Full CRUD for job applications, scoped to the authenticated user
- Ownership enforcement on update/delete (users cannot modify or delete another user's data)
- Pagination and filtering (by status and company) on the applications list

## Developer

Isaac — [GitHub](https://github.com/Isaaco00)

## Tech Stack

- **Node.js** + **Express** — REST API framework
- **PostgreSQL** — relational database, chosen for the relational nature of the data (users own applications)
- **bcrypt** — password hashing
- **jsonwebtoken (JWT)** — stateless authentication
- **dotenv** — environment variable management
- **nodemon** — development auto-restart

## API Endpoints

### Authentication

#### `POST /register`
Register a new user.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Responses:**
- `201 Created` — user created, returns `{ id, email, created_at }`
- `400 Bad Request` — missing email or password
- `409 Conflict` — email already registered

---

#### `POST /login`
Authenticate and receive a JWT.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Responses:**
- `200 OK` — returns `{ message, token }`
- `400 Bad Request` — missing email or password
- `401 Unauthorized` — invalid email or password

---

#### `GET /me`
Returns the authenticated user's ID. Requires a valid Bearer token.

**Responses:**
- `200 OK` — returns `{ userId }`
- `401 Unauthorized` — no token provided
- `403 Forbidden` — invalid or expired token

---

### Job Applications

All routes below require a valid Bearer token (`Authorization: Bearer <token>`), and only ever operate on the authenticated user's own data.

#### `POST /applications`
Create a new job application.

**Body:**
```json
{
  "company": "Google",
  "role": "Backend Engineer Intern"
}
```

**Responses:**
- `201 Created` — returns the created application
- `400 Bad Request` — missing company or role

---

#### `GET /applications`
List the authenticated user's job applications, with optional pagination and filtering.

**Query parameters (all optional):**
- `status` — exact match (e.g. `?status=applied`)
- `company` — partial, case-insensitive match (e.g. `?company=goog`)
- `page` — page number, default `1`
- `limit` — results per page, default `10`

**Response:** `200 OK` — returns `{ page, limit, results }`

---

#### `PATCH /applications/:id`
Update the status of a specific application. Only succeeds if the application belongs to the authenticated user.

**Body:**
```json
{
  "status": "interviewing"
}
```

**Responses:**
- `200 OK` — returns the updated application
- `400 Bad Request` — missing status
- `404 Not Found` — application doesn't exist, or doesn't belong to this user

---

#### `DELETE /applications/:id`
Delete a specific application. Only succeeds if it belongs to the authenticated user.

**Responses:**
- `200 OK` — returns `{ message, application }`
- `404 Not Found` — application doesn't exist, or doesn't belong to this user

## Setup

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL

### Installation

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/Isaaco00/secure-job-application-api
cd secure-job-application-api
npm install
```

2. Create a PostgreSQL database:
```bash
psql -U postgres -c "CREATE DATABASE secure_job_application_api;"
```

3. Run the schema files to create the required tables:
```bash
psql -U postgres -d secure_job_application_api -f sql/schema.sql
psql -U postgres -d secure_job_application_api -f sql/job_applications.sql
```

4. Create a `.env` file in the project root with the following variables:
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secure_job_application_api
JWT_SECRET=your_long_random_secret


5. Start the development server:
```bash
npm run dev
```

The API will be running at `http://localhost:3000`.

## Security & Architecture Notes

- **Passwords are never stored in plain text** — bcrypt hashes passwords with a per-password random salt before storage; the original password cannot be recovered from the stored hash.
- **Parameterized queries throughout** — all SQL queries use placeholders (`$1`, `$2`, ...) rather than string concatenation, preventing SQL injection regardless of what a client submits.
- **Ownership is enforced at the database level, not just the application level** — every update/delete query includes `WHERE ... AND user_id = $x`, so even a bug elsewhere in the code couldn't accidentally let one user modify another's data.
- **Generic error messages on authentication failure** — login returns the same "Invalid email or password" message whether the email doesn't exist or the password is wrong, preventing user enumeration attacks.
- **JWTs are short-lived (1 hour)** — limiting the window of misuse if a token is ever leaked or stolen.
- **Environment variables for all secrets** — database credentials and the JWT signing secret are never hardcoded, and `.env` is excluded from version control via `.gitignore`.

## Future Improvements

- Refresh tokens, so users aren't logged out every hour without a graceful re-authentication flow
- Rate limiting on `/login` and `/register` to slow down brute-force attempts
- Email verification on registration
- Automated test suite (unit + integration tests)
- Role-based access control, if this were extended to support admin-level users