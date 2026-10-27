# RecruitFlow – Recruitment & Interview Management

MERN app (React + Vite + Tailwind, Express, MongoDB/Mongoose) with JWT auth, role-based access (Admin / Recruiter / Candidate), organization-level data isolation, resume uploads, interview scheduling with conflict detection, and a live dashboard.

## Setup
Requirements: Node 18+, MongoDB running locally (or an Atlas URI).

```bash
# 1. API
cd server
cp .env.example .env        # set MONGO_URI and JWT_SECRET
npm install
npm run seed                # demo data + demo users
npm run dev                 # http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :5000)

# 3. Tests (downloads an in-memory MongoDB on first run)
cd server && npm test
```

## Demo credentials (after `npm run seed`)
| Role | Email | Password |
|---|---|---|
| Admin | admin@recruitflow.com | Admin@123 |
| Recruiter | recruiter@recruitflow.com | Recruiter@123 |
| Candidate | candidate@recruitflow.com | Candidate@123 |

## Architecture
```
server/src
  models/       Organization, User, Job, Application, Interview
  middleware/   auth (JWT + RBAC), validate, sanitize, upload (multer), error
  routes/       auth, users, jobs, applications, interviews, dashboard
client/src
  pages/        Auth, Dashboard, Jobs, Applications, Interviews, Team
  components/   Layout, ui (Modal, Field, Badge, Empty ...)
```

**Roles**
- *Admin*: registers a company (creates an Organization), manages team, jobs, applications, interviews.
- *Recruiter*: created by an admin; manages jobs, applications, interviews. Cannot delete jobs or add users.
- *Candidate*: browses published jobs, applies once per job, tracks status and interviews.

**Security**
- bcrypt (12 rounds) password hashing; JWT verified on every request; user re-loaded from DB.
- Roles cannot be self-escalated: public registration only allows `candidate` or `admin` (new org).
- Org isolation: every staff query filters by `organization` taken from the token's user, never from the request body. Cross-org access returns 404.
- Input validation (express-validator), NoSQL-operator stripping, helmet, CORS, auth rate-limit.
- Resumes: type + extension + 5 MB limit, random filenames, **not served statically**; downloads go through an authorized endpoint.
- Duplicate applications blocked by a unique index `{job, candidate}` plus a pre-check.
- Interview conflicts: overlapping `scheduled` slots are rejected for both the interviewer and the candidate (`start < otherEnd && end > otherStart`), so back-to-back slots are allowed.

## API (all under `/api`, JSON, `Authorization: Bearer <token>`)
| Method | Path | Access | Description |
|---|---|---|---|
| POST | /auth/register | public | `{name,email,password,role: candidate\|admin, organizationName?}` |
| POST | /auth/login | public | `{email,password}` → `{token,user}` |
| GET | /auth/me | any | Current user |
| GET | /users | staff | Team of own org |
| POST | /users | admin | Add recruiter/admin to own org |
| GET | /jobs | any | Query: `q, type, location, status` (staff). Candidates see published only |
| GET | /jobs/:id | any | Single job (scoped) |
| POST | /jobs | staff | Create job |
| PUT | /jobs/:id | staff | Update job |
| PATCH | /jobs/:id/status | staff | `{status: draft\|published\|closed}` |
| DELETE | /jobs/:id | admin | Delete (blocked if it has applications) |
| POST | /applications | candidate | multipart: `job`, `resume` (file), `coverLetter` |
| GET | /applications | any | Candidate: own. Staff: org. Query `job`, `status` |
| PATCH | /applications/:id/status | staff | `{status}` |
| GET | /applications/:id/resume | owner / org staff | Download resume |
| GET | /interviews | any | Query `status`, `upcoming=true` |
| POST | /interviews | staff | `{application, interviewer, start, end, mode, link}`; 409 on conflict |
| PATCH | /interviews/:id/feedback | interviewer / admin | `{rating 1-5, recommendation, comments}` |
| PATCH | /interviews/:id/cancel | staff | Cancel |
| GET | /dashboard | any | Counts for jobs, applications, upcoming interviews (UI polls every 15 s) |

Errors: `{ "message": "...", "errors": [{field, message}] }` with 400 / 401 / 403 / 404 / 409.

