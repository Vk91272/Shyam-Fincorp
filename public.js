// Public browser code only. Never put ADMIN_KEY or Supabase service-role keys here.
const API_BASE = "https://shyam-fincorp.onrender.com";
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.textContent = open ? "×" : "☰";
  });
  mainNav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    mainNav.classList.remove("open"); menuToggle.setAttribute("aria-expanded", "false"); menuToggle.textContent = "☰";
  }));
}
document.getElementById("year").textContent = new Date().getFullYear();
const appForm = document.getElementById("applicationForm");
const appMessage = document.getElementById("applicationMessage");
const submitButton = document.getElementById("submitApplication");
function message(el, text, type="") { el.textContent = text; el.className = "form-message" + (type ? " " + type : ""); }
function labelStatus(s) { return String(s || "Pending").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()); }
function rupees(n) { return Number(n || 0).toLocaleString("en-IN", {maximumFractionDigits:2}); }
if (appForm) appForm.addEventListener("submit", async e => {
  e.preventDefault();
  const mobile = document.getElementById("mobile").value.trim();
  if (!/^\d{10}$/.test(mobile)) return message(appMessage,"Please enter a valid 10-digit mobile number.","error");
  const payload = {
    full_name: document.getElementById("fullName").value.trim(), mobile,
    email: document.getElementById("email").value.trim(),
    monthly_income: Number(document.getElementById("monthlyIncome").value),
    requested_amount: Number(document.getElementById("requestedAmount").value),
    tenure_months: Number(document.getElementById("tenureMonths").value),
    address: document.getElementById("address").value.trim()
  };
  submitButton.disabled = true; submitButton.textContent = "Submitting…";
  message(appMessage,"Submitting your enquiry…");
  try {
    // Confirm this route and field names against server.js before launch.
    const res = await fetch(`${API_BASE}/api/applications`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.error || `Application API returned HTTP ${res.status}.`);
    const id = data.application_id || data.applicationId || data.id;
    if (!id) throw new Error("The server did not return an application ID. Contact support before submitting again.");
    message(appMessage,`Enquiry submitted. Your Application ID is ${id}. Save it to track progress. This is not a loan approval or disbursement.`,"success");
    appForm.reset(); document.getElementById("trackApplicationId").value = id; document.getElementById("trackMobile").value = mobile;
  } catch(err) { message(appMessage,`${err.message} The form may need to be aligned with the currently deployed API.`,"error"); }
  finally { submitButton.disabled = false; submitButton.textContent = "Submit enquiry ↗"; }
});
const trackForm = document.getElementById("trackForm");
const trackMessage = document.getElementById("trackMessage");
const trackResult = document.getElementById("trackResult");
if (trackForm) trackForm.addEventListener("submit", async e => {
  e.preventDefault(); const id = document.getElementById("trackApplicationId").value.trim();
  const mobile = document.getElementById("trackMobile").value.trim();
  if (!/^\d{10}$/.test(mobile)) return message(trackMessage,"Please enter the registered 10-digit mobile number.","error");
  const button = document.getElementById("trackButton"); button.disabled = true; button.textContent = "Checking…"; trackResult.hidden = true;
  message(trackMessage,"Checking the connected loan service…");
  try {
    // Confirm this route and response schema against server.js before launch.
    const res = await fetch(`${API_BASE}/api/customer/loan`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({application_id:id,mobile})});
    const data = await res.json().catch(()=>({})); if (!res.ok) throw new Error(data.error || `Tracking API returned HTTP ${res.status}.`);
    const loan = data.loan || data.loan_account || data.application || data;
    trackResult.replaceChildren(); const h = document.createElement("h4"); h.textContent = "Application status"; trackResult.appendChild(h);
    const rows = [["Application ID",loan.application_id || data.application_id || id],["Current status",labelStatus(loan.status || data.status || "Status unavailable")]];
    const amount = loan.approved_amount ?? loan.principal ?? loan.loan_amount;
    if (amount !== undefined) rows.push(["Approved / loan amount",`₹${rupees(amount)}`]);
    const disb = loan.disbursement_status || loan.disbursementStatus; if (disb) rows.push(["Disbursement",labelStatus(disb)]);
    if (loan.expected_delivery) rows.push(["Expected date",String(loan.expected_delivery)]);
    rows.forEach(([k,v])=>{const p=document.createElement("p"),b=document.createElement("strong");b.textContent=`${k}: `;p.append(b,document.createTextNode(String(v)));trackResult.appendChild(p);});
    const note=document.createElement("p");note.textContent="Disbursement should be shown as complete only after the actual transfer is confirmed by the authorised process.";trackResult.appendChild(note);
    trackResult.hidden=false; message(trackMessage,"Record retrieved successfully.","success");
  } catch(err) { message(trackMessage,`${err.message} If your application is under review, try later or contact support.`,"error"); }
  finally {button.disabled=false;button.textContent="Check status →";}
});
