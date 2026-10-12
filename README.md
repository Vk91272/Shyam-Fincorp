# Shyam Fincorp — public customer website

Premium responsive static frontend intended for your existing GitHub Pages repository. It does not replace or modify the existing LMS/CRM or Render server.

## Files
- `index.html` — customer-facing page, application form and tracking form
- `style.css` — responsive design
- `script.js` — EMI calculator and API integration
- API base URL: `https://shyam-fincorp.onrender.com`

## Deploy to the existing repository
1. Download and extract this ZIP on your computer.
2. Open your repository: https://github.com/Vk91272/Shyam-Fincorp
3. Before replacing anything, download a backup of the current `index.html` or create a GitHub branch.
4. In the repository, choose **Add file → Upload files**.
5. Upload `index.html`, `style.css`, `script.js`, and `README.md` into the repository root. Do not delete or replace `server.js`, admin/CRM files, database schema, or Render settings.
6. Commit the files to the branch already configured for Pages (usually `main`).
7. Open **Settings → Pages**. Keep the existing publishing source/branch/folder unless you intentionally want to change it. For a root deployment this is often `main` and `/(root)`.
8. Wait for the deployment to complete, then visit https://vk91272.github.io/Shyam-Fincorp/ and hard-refresh with `Ctrl+F5`.

## Critical API integration check before launch
The frontend tries these route names:
- `POST /api/loan-applications` then fallback `POST /api/apply`
- `GET /api/my-loan?application_id=...&mobile=...` then fallback `GET /api/loan-status?application_id=...&mobile=...`

These names and the JSON field names are assumptions; they must match your actual `server.js`. Open your existing `server.js` and verify the route definitions and expected request body before accepting public applications. A route returning 404/400 is not proof the application was stored. The UI reports errors rather than pretending the request succeeded. Adjust only the API paths/payload mapping in `script.js` if needed.

## CORS, privacy and secrets
- Ensure Render's CORS policy allows requests from `https://vk91272.github.io`.
- Never put `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_KEY`, passwords, or other secrets in HTML/JavaScript. Keep them in Render environment variables.
- Tracking must verify the application ID and registered mobile on the server, return only the minimum necessary status, and use rate limiting. Do not expose customer records through public endpoints.
- Before public launch, add verified official contact details, privacy policy, grievance redressal details, lender/partner disclosures, applicable fees and terms. Do not claim regulatory approval unless verified.

## Smoke test
1. Open the site on desktop and mobile.
2. Change the EMI sliders and check that the estimated EMI updates.
3. Open the form and test required fields.
4. Use a valid test application ID and registered mobile to test status lookup.
5. Confirm the application appears in Supabase and the existing LMS/CRM before public promotion.
