# Shyam Fincorp public website — deployment

## Bundle contents
- `index.html`: premium public-facing homepage, services, application enquiry, tracking, FAQs and footer.
- `public.css`: responsive styling.
- `public.js`: public application and tracking requests.

## Important: preserve your existing LMS/CRM
1. Open https://github.com/Vk91272/Shyam-Fincorp and select the `main` branch.
2. Before replacing the root `index.html`, save its current contents as a backup on your computer. If the CRM login currently depends on the root index, first identify its correct CRM entry page and preserve a working link to it.
3. Upload `index.html`, `public.css`, and `public.js` from this bundle to the repository root and commit the changes.
4. Do not delete or replace `server.js`, `app.js`, `lms.html`, `lms.js`, `lms.css`, `admin.html`, `admin.js`, `admin.css`, or database files as part of this homepage change.
5. Confirm GitHub Pages uses `main` and `/(root)` in repository Settings → Pages.
6. Open https://vk91272.github.io/Shyam-Fincorp/ after deployment and hard refresh with Ctrl+F5.

## Backend compatibility must be tested
The frontend currently calls `POST https://shyam-fincorp.onrender.com/api/applications` and `POST https://shyam-fincorp.onrender.com/api/customer/loan`. These route names and JSON fields need to match the deployed `server.js` exactly. If your current backend uses different routes, adjust `public.js` to the actual implementation before launch. A failed request is not a successful submission.

## Safety and launch checklist
- Never place `ADMIN_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or any secret in browser JavaScript.
- Only show a loan as disbursed after the backend records confirmation of the actual transfer; a button click alone must not set `Disbursed`.
- Verify legal company name, actual contact details, grievance process, privacy policy, terms, lender relationship, regulatory status, product availability, rates and fees before publishing them.
- Do not advertise guaranteed approval or disbursement. Document upload alone does not prove KYC, creditworthiness or bank ownership verification.
- Test the enquiry form and tracking API using test records before directing real customers to it.
