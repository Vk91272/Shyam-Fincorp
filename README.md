# Shyam Fincorp Loan Backend

## 1. Database
Create a Supabase project, open SQL Editor, and run `schema.sql`.

## 2. Backend
Install Node.js, then:

npm install
npm start

The API listens on port 10000 by default.

## 3. Environment
Set:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_KEY
- PORT (optional)

Never put the service-role key in the browser/frontend.

## API
GET `/` — health response

GET `/api/health` — configuration health

POST `/api/applications` — create a loan application

GET `/api/applications` — admin list; requires header `x-admin-key`

PATCH `/api/applications/:applicationId/status` — admin status update; requires `x-admin-key`

## Frontend
Update `web/app.js`:
`API_BASE` must point to the deployed backend, e.g. `https://your-api.onrender.com`.

This is a prototype backend. Before live lending, add authentication, KYC/document handling, audit logs, rate limiting, encryption/security controls, consent/privacy flows, approved payment/disbursement integrations, and the applicable legal/RBI/digital-lending compliance controls.
