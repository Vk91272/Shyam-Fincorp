const API_BASE = "https://shyam-fincorp.onrender.com";
let currentApplicationId = "";
let currentLoanAccountId = "";
let currentCustomerMobile = "";
let currentSchedule = [];

const $ = id => document.getElementById(id);
const money = n => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = $(id);
  if (el) {
    el.classList.add("active");
    window.scrollTo({top: 0, behavior: "smooth"});
  }
  document.querySelectorAll("#mainNav a").forEach(a => a.classList.toggle("active", a.dataset.screen === id));
  document.getElementById("mainNav")?.classList.remove("open");
}

document.querySelectorAll("[data-screen]").forEach(el => {
  el.addEventListener("click", e => {
    const id = el.dataset.screen;
    if (id) { e.preventDefault(); showScreen(id); }
  });
});
$("mobileMenu")?.addEventListener("click", () => $("mainNav")?.classList.toggle("open"));

function calcEmi(P, annual, months) {
  const r = Number(annual) / 12 / 100, n = Number(months);
  if (!P || !n) return 0;
  return r ? P * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1) : P/n;
}
function updateCalculator() {
  const emi = calcEmi($("calcAmount")?.value, $("calcRate")?.value, $("calcMonths")?.value);
  $("emiValue").textContent = money(emi);
  $("heroEmi").textContent = money(emi);
}
["calcAmount","calcRate","calcMonths"].forEach(id => $(id)?.addEventListener("input", updateCalculator));

$("eligNext")?.addEventListener("click", () => {
  if (!$("eligName").value.trim() || !/^\d{10}$/.test($("eligMobile").value.trim()) || !$("eligAge").value) {
    alert("Please enter valid basic details.");
    return;
  }
  $("eligibilityStep1").classList.add("hidden");
  $("eligibilityStep2").classList.remove("hidden");
  document.querySelectorAll(".stepper span")[0].classList.remove("active");
  document.querySelectorAll(".stepper span")[1].classList.add("active");
});
$("eligBack")?.addEventListener("click", () => {
  $("eligibilityStep2").classList.add("hidden");
  $("eligibilityStep1").classList.remove("hidden");
  document.querySelectorAll(".stepper span")[1].classList.remove("active");
  document.querySelectorAll(".stepper span")[0].classList.add("active");
});

$("eligibilityForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const result = $("eligibilityResult");
  result.classList.remove("hidden");
  result.innerHTML = `<div class="loading">Checking your preliminary eligibility…</div>`;
  const payload = {
    full_name: $("eligName").value.trim(), mobile: $("eligMobile").value.trim(),
    email: "", age: Number($("eligAge").value), employment_type: $("eligEmployment").value,
    monthly_income: Number($("eligIncome").value), existing_emi: Number($("eligExistingEmi").value),
    requested_amount: Number($("eligAmount").value), tenure_months: Number($("eligTenure").value)
  };
  try {
    const r = await fetch(API_BASE + "/api/eligibility", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)});
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Eligibility inquiry failed");
    result.innerHTML = `<div class="result-icon">✓</div><div><span>INQUIRY ID: ${data.inquiry_id || "—"}</span><h3>${data.eligibility_status || "Inquiry received"}</h3><p>${data.eligibility_reason || data.message || "Your inquiry has been received."}</p><div class="result-metrics"><div><b>${data.estimated_interest_rate ? data.estimated_interest_rate+"%" : "—"}</b><small>Estimated rate</small></div><div><b>${data.estimated_emi ? money(data.estimated_emi) : "—"}</b><small>Estimated EMI</small></div></div><button type="button" class="btn btn-gold" id="continueApply">Continue to Loan Application →</button></div>`;
    $("continueApply").onclick = () => {
      $("appName").value = payload.full_name; $("appMobile").value = payload.mobile;
      $("appIncome").value = payload.monthly_income; $("appAmount").value = payload.requested_amount; $("appTenure").value = payload.tenure_months;
      showScreen("apply");
    };
  } catch(err) {
    result.innerHTML = `<div class="error-box">${err.message || "Could not connect to server."}</div>`;
  }
});

$("loanForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  $("applicationMessage").textContent = "Submitting application…";
  const payload = {full_name:$("appName").value.trim(), mobile:$("appMobile").value.trim(), email:$("appEmail").value.trim(), monthly_income:Number($("appIncome").value), requested_amount:Number($("appAmount").value), tenure_months:Number($("appTenure").value), address:$("appAddress").value.trim()};
  try {
    const r = await fetch(API_BASE + "/api/applications", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Application submission failed");
    currentApplicationId = data.application_id || "";
    $("documentApplicationId").textContent = currentApplicationId || "—";
    $("applicationMessage").innerHTML = `<span class="success">Application submitted successfully. ID: <b>${currentApplicationId}</b></span>`;
    showScreen("documents");
  } catch(err) {
    $("applicationMessage").innerHTML = `<span class="error">${err.message || "Backend connection failed."}</span>`;
  }
});

$("documentForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const file = $("documentFile").files[0];
  if (!currentApplicationId) { $("documentMessage").textContent = "Application ID not found. Please submit the application first."; return; }
  if (!file) return;
  if (file.size > 5*1024*1024) { $("documentMessage").textContent = "File must be 5 MB or smaller."; return; }
  $("documentMessage").textContent = "Preparing secure upload…";
  try {
    const p = new URLSearchParams({application_id:currentApplicationId,document_type:$("documentType").value,file_name:file.name,file_type:file.type,file_size:String(file.size)});
    const r = await fetch(API_BASE + "/api/documents/upload-url", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({application_id:currentApplicationId,document_type:$("documentType").value,file_name:file.name,file_type:file.type,file_size:file.size})});
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Could not create upload URL");
    const signedUrl = data.signedUrl || data.signed_url || data.url;
    if (!signedUrl) throw new Error("Upload URL was not returned by server.");
    const up = await fetch(signedUrl, {method:"PUT",headers:{"Content-Type":file.type},body:file});
    if (!up.ok) throw new Error("File upload failed.");
    if (data.storagePath || data.storage_path) {
      await fetch(API_BASE + "/api/documents/record", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({application_id:currentApplicationId,document_type:$("documentType").value,file_name:file.name,storage_path:data.storagePath||data.storage_path,file_type:file.type,file_size:file.size})});
    }
    $("documentMessage").innerHTML = `<span class="success">Document uploaded successfully.</span>`;
    $("documentFile").value = "";
  } catch(err) {
    $("documentMessage").innerHTML = `<span class="error">${err.message}</span>`;
  }
});

function renderSchedule(schedule) {
  currentSchedule = Array.isArray(schedule) ? schedule : [];
  const box = $("emiScheduleContainer");
  if (!currentSchedule.length) { box.innerHTML = `<div class="empty">No EMI schedule found.</div>`; return; }
  box.innerHTML = currentSchedule.map((x,i) => {
    const due = Number(x.total_due || x.emi || 0), paid = Number(x.paid_amount || 0), pending = Math.max(0,due-paid);
    return `<div class="schedule-row"><div class="installment"><b>EMI ${x.installment_no || i+1}</b><small>${x.due_date || "—"}</small></div><strong>${money(due)}</strong><span class="status ${(x.status||"pending").toLowerCase()}">${x.status || "pending"}</span></div>`;
  }).join("");
  const pending = currentSchedule.reduce((s,x)=>s+Math.max(0,Number(x.total_due||x.emi||0)-Number(x.paid_amount||0)),0);
  $("paymentSummaryAmount").textContent = money(pending) + " pending";
  $("paymentInstallment").innerHTML = currentSchedule.filter(x => (x.status||"pending") !== "paid" && Math.max(0,Number(x.total_due||x.emi||0)-Number(x.paid_amount||0)) > 0).map((x,i) => {
    const no = x.installment_no || i+1, amt = Math.max(0,Number(x.total_due||x.emi||0)-Number(x.paid_amount||0));
    return `<option value="${no}" data-amount="${amt}">EMI ${no} — ${money(amt)}</option>`;
  }).join("") || `<option value="">No pending EMI</option>`;
  updatePaymentAmount();
}
function updatePaymentAmount() {
  const o = $("paymentInstallment")?.selectedOptions[0];
  if (o?.dataset.amount) $("paymentAmount").value = Math.round(Number(o.dataset.amount));
}
$("paymentInstallment")?.addEventListener("change", updatePaymentAmount);

function renderHistory(items) {
  const box = $("paymentHistoryContainer");
  if (!items?.length) { box.innerHTML = `<div class="empty">No payment history found.</div>`; return; }
  box.innerHTML = items.map(x => `<div class="history-row"><div><b>${x.payment_id || x.id || "Payment"}</b><small>${x.paid_at || x.created_at || "—"}</small></div><strong>${money(x.amount)}</strong><span>${x.status || "success"}</span></div>`).join("");
}

async function loadLoan() {
  const mobile = $("loanMobile").value.trim();
  if (!/^\d{10}$/.test(mobile)) { $("loanMessage").textContent = "Please enter a valid 10-digit mobile number."; return; }
  $("loanMessage").textContent = "Loading loan details…";
  try {
    let r = await fetch(API_BASE + "/api/customer/loan", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mobile})});
    if (!r.ok) {
      r = await fetch(API_BASE + "/api/customer/loan?mobile=" + encodeURIComponent(mobile));
    }
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Loan details not found");
    currentCustomerMobile = mobile;
    currentApplicationId = data.application_id || currentApplicationId;
    currentLoanAccountId = data.loan_account_id || data.loan_account_no || "";
    $("displayLoanAccount").textContent = data.loan_account_no || data.loan_account_id || "—";
    $("displayCustomerName").textContent = data.full_name || data.customer_name || "Customer";
    $("displayLoanAmount").textContent = money(data.loan_amount || data.principal || data.requested_amount);
    $("displayEmi").textContent = money(data.emi);
    $("displayTenure").textContent = (data.tenure_months || "—") + " months";
    $("displayOutstanding").textContent = money(data.outstanding_amount || data.outstanding || 0);
    $("displayLoanStatus").textContent = data.status || "Active";
    renderSchedule(data.emi_schedule || data.schedule || []);
    await loadHistory();
    $("loanMessage").textContent = "";
    showScreen("dashboard");
  } catch(err) { $("loanMessage").textContent = err.message || "Unable to load loan."; }
}
$("loadLoanBtn")?.addEventListener("click", loadLoan);

async function loadHistory() {
  if (!currentApplicationId && !currentLoanAccountId) return;
  try {
    const r = await fetch(API_BASE + "/api/customer/payment-history", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({application_id:currentApplicationId,loan_account_id:currentLoanAccountId,mobile:currentCustomerMobile})});
    const data = await r.json();
    if (r.ok) renderHistory(data.payments || data.history || data || []);
  } catch(e) {}
}

$("paymentForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const installment_no = Number($("paymentInstallment").value);
  const amount = Number($("paymentAmount").value);
  if (!installment_no || !amount) { $("paymentMessage").textContent = "Select a pending EMI."; return; }
  $("paymentMessage").textContent = "Processing payment request…";
  try {
    const r = await fetch(API_BASE + "/api/customer/pay-emi-test", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({application_id:currentApplicationId,loan_account_id:currentLoanAccountId,mobile:currentCustomerMobile,installment_no,amount,payment_method:$("paymentMode").value})});
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Payment failed");
    $("paymentMessage").innerHTML = `<span class="success">Payment recorded successfully.</span>`;
    await loadLoan();
  } catch(err) { $("paymentMessage").innerHTML = `<span class="error">${err.message}</span>`; }
});

updateCalculator();
showScreen("home");
