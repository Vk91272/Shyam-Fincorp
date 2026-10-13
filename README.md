# Shyam Fincorp — public website + API alignment

Files: `index.html`, `public.css`, `public.js` for GitHub Pages; `server.js` is the matching Express backend source for Render.

## Important
- Public form submits to `POST /api/applications`. The backend returns `application.application_id`; the frontend now reads that response correctly.
- Tracking submits Application ID + registered mobile to `POST /api/customer/loan`. The included backend route returns only a limited application status view when both match.
- Do not place `ADMIN_KEY` or Supabase service-role keys in frontend files or GitHub Pages. Keep them in Render environment variables.
- This is an application/status workflow, not a live Aadhaar/PAN/credit bureau/bank verification or automatic money transfer integration. Staff must perform and document checks and confirm any actual disbursement.
- Before production, confirm company/NBFC registration claims, applicable disclosures, interest/fee disclosures, privacy policy and consent wording with qualified compliance counsel. Never upload customer KYC documents to a public repository.
