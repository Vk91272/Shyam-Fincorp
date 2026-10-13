# Deployment steps

## 1. Frontend on GitHub Pages
1. Open repository `Vk91272/Shyam-Fincorp`.
2. Upload/replace `index.html`, `public.css`, and `public.js` in the folder served by GitHub Pages (repo root if Pages is set to `main` → `/root`).
3. Commit changes. Wait for GitHub Pages to publish, then hard-refresh the page.

## 2. Backend on Render
1. Back up your current `server.js` first.
2. Merge/deploy the included `server.js` to the backend repository/root that Render deploys. It is based on the provided current server file and adds `POST /api/customer/loan`; it also retains existing routes.
3. Keep `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_KEY` only in Render Environment. Never expose them in frontend JavaScript.
4. Confirm Render deploy succeeds and open `https://shyam-fincorp.onrender.com/` — it should return the service JSON.
5. Test with a non-sensitive test application: submit the public form, save the Application ID, then track using that ID and the same registered mobile.

## 3. Database checks
- The Supabase `loan_applications` table must contain `application_id`, `full_name`, `mobile`, `requested_amount`, `tenure_months`, `status`, and `created_at`.
- Ensure `application_id` is unique and mobile is stored consistently as a 10-digit string.
- Do not make KYC/document storage public.

## 4. Before launch
Use only verified legal entity details, lender/NBFC status, charges, rates, grievance contact, privacy policy and terms. This package does not connect to live KYC, credit-bureau or bank-transfer services. Do not describe a loan as disbursed until an authorised person confirms the real transfer.
