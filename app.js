const API_BASE = "https://shyam-fincorp.onrender.com";

let currentApplicationId = "";
let currentMobile = "";
let currentLoan = null;
let currentEmiSchedule = [];
let currentPayments = [];

function showMessage(message, type = "info") {
  let box = document.getElementById("message");
  if (!box) {
    box = document.createElement("div");
    box.id = "message";
    box.className = "message";
    const main = document.querySelector("main");
    if (main) main.prepend(box); else document.body.prepend(box);
  }
  box.textContent = message;
  box.className = `message ${type}`;
  box.style.display = "block";
  setTimeout(() => { if (box) box.style.display = "none"; }, 6000);
}

function hideMessage() {
  const box = document.getElementById("message");
  if (box) box.style.display = "none";
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    }
  });
  let data = {};
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
  return data;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value ?? "-";
}
function showElement(id, display = "block") {
  const element = document.getElementById(id);
  if (element) element.style.display = display;
}
function hideElement(id) {
  const element = document.getElementById(id);
  if (element) element.style.display = "none";
}

/* Eligibility steps */
function showEligibilityStep(step) {
  [1, 2, 3].forEach(number => {
    const section = document.getElementById(`eligibilityStep${number}`);
    if (section) section.style.display = number === step ? "block" : "none";
    const indicator = document.getElementById(`step${number}Indicator`);
    if (indicator) {
      indicator.classList.toggle("active", number === step);
      indicator.classList.toggle("completed", number < step);
    }
  });
  const progress = document.getElementById("eligibilityProgress");
  if (progress) progress.style.width = step === 1 ? "0%" : step === 2 ? "50%" : "100%";
}

function validateEligibilityStep1() {
  const name = document.getElementById("eligibilityName");
  const mobile = document.getElementById("eligibilityMobile");
  if (!name || !mobile) return false;
  if (name.value.trim().length < 2) {
    showMessage("Please enter your full name.", "error"); name.focus(); return false;
  }
  if (!/^\d{10}$/.test(mobile.value.trim())) {
    showMessage("Please enter a valid 10-digit mobile number.", "error"); mobile.focus(); return false;
  }
  return true;
}
function goToEligibilityStep2() { if (validateEligibilityStep1()) showEligibilityStep(2); }
function goToEligibilityStep1() { showEligibilityStep(1); }

/* Application */
async function submitApplication(event) {
  if (event) event.preventDefault();
  const form = document.getElementById("loanApplicationForm");
  if (!form) return showMessage("Loan application form not found.", "error");
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  if (payload.mobile) payload.mobile = payload.mobile.trim();
  if (payload.full_name) payload.full_name = payload.full_name.trim();
  try {
    showMessage("Application submit ho rahi hai...", "info");
    const data = await apiRequest(`${API_BASE}/api/applications`, { method: "POST", body: JSON.stringify(payload) });
    const applicationId = data.application_id || data.application?.application_id || data.id || "";
    currentApplicationId = applicationId;
    currentMobile = payload.mobile || "";
    if (applicationId) {
      const input = document.getElementById("documentApplicationId");
      if (input) input.value = applicationId;
      showElement("documentUploadSection");
      showMessage(`Application submit ho gayi. Application ID: ${applicationId}`, "success");
    } else {
      showMessage("Application submit ho gayi, lekin Application ID response me nahi mili.", "success");
    }
    form.reset();
  } catch (error) {
    console.error("submitApplication:", error);
    showMessage(error.message, "error");
  }
}

/* Documents */
async function uploadSingleDocument(applicationId, file, documentType) {
  const info = await apiRequest(`${API_BASE}/api/documents/upload-url`, {
    method: "POST",
    body: JSON.stringify({ application_id: applicationId, file_name: file.name, content_type: file.type || "application/octet-stream" })
  });
  const uploadUrl = info.upload_url || info.url || info.signed_url;
  if (!uploadUrl) throw new Error(`${documentType}: upload URL server se nahi mili.`);
  const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
  if (!response.ok) throw new Error(`${documentType}: file storage upload failed.`);
  try {
    await apiRequest(`${API_BASE}/api/documents/record`, {
      method: "POST",
      body: JSON.stringify({ application_id: applicationId, document_type: documentType, file_name: file.name, file_path: info.file_path || info.path || info.object_path || "" })
    });
  } catch (recordError) { console.warn("Document record endpoint:", recordError); }
}

async function uploadDocument() {
  const input = document.getElementById("documentApplicationId");
  const applicationId = input?.value.trim() || currentApplicationId;
  if (!applicationId) return showMessage("Pehle loan application submit karke Application ID prapt karein.", "error");
  const documents = [
    { id: "identityProof", type: "identity_proof", label: "Identity Proof" },
    { id: "panCard", type: "pan_card", label: "PAN Card" },
    { id: "addressProof", type: "address_proof", label: "Address Proof" },
    { id: "incomeProof", type: "income_proof", label: "Income Proof" },
    { id: "applicantPhoto", type: "applicant_photo", label: "Applicant Photo" }
  ];
  const selected = documents.map(d => ({ ...d, file: document.getElementById(d.id)?.files?.[0] || null })).filter(d => d.file);
  if (!selected.length) return showMessage("Kam se kam ek document select karein.", "error");
  const button = document.getElementById("uploadDocumentsButton");
  if (button) { button.disabled = true; button.textContent = "Uploading..."; }
  const status = document.getElementById("documentUploadStatus");
  if (status) status.innerHTML = "";
  try {
    let count = 0;
    for (const doc of selected) {
      if (status) { const item = document.createElement("div"); item.textContent = `${doc.label}: uploading...`; item.dataset.documentType = doc.type; status.appendChild(item); }
      await uploadSingleDocument(applicationId, doc.file, doc.type);
      count++;
      if (status) { const item = status.querySelector(`[data-document-type="${doc.type}"]`); if (item) item.textContent = `${doc.label}: uploaded successfully`; }
    }
    const message = document.getElementById("documentUploadMessage");
    if (message) { message.textContent = `${count} document(s) successfully uploaded.`; message.style.display = "block"; }
    showMessage(`${count} document(s) successfully upload ho gaye.`, "success");
  } catch (error) {
    console.error("uploadDocument:", error);
    const message = document.getElementById("documentUploadMessage");
    if (message) { message.textContent = error.message; message.style.display = "block"; }
    showMessage(error.message, "error");
  } finally {
    if (button) { button.disabled = false; button.textContent = "Upload Documents"; }
  }
}

/* Loan lookup */
async function lookupLoan(event) {
  if (event) event.preventDefault();
  const applicationIdInput = document.getElementById("lookupApplicationId");
  const mobileInput = document.getElementById("lookupMobile");
  const message = document.getElementById("lookupMessage");
  if (!applicationIdInput || !mobileInput) return showMessage("Loan lookup form not found.", "error");
  const applicationId = applicationIdInput.value.trim();
  const mobile = mobileInput.value.trim();
  if (!applicationId) return showMessage("Application ID enter karein.", "error");
  if (!/^\d{10}$/.test(mobile)) return showMessage("Valid 10-digit mobile number enter karein.", "error");
  try {
    if (message) message.textContent = "Loan details load ho rahi hain...";
    const data = await apiRequest(`${API_BASE}/api/customer/loan`, { method: "POST", body: JSON.stringify({ application_id: applicationId, mobile }) });
    currentApplicationId = applicationId; currentMobile = mobile; currentLoan = getLoanObject(data);
    displayLoan(data);
    await loadPaymentHistory(false);
    if (message) message.textContent = "Loan details successfully loaded.";
    showMessage("Loan details successfully load ho gayi.", "success");
  } catch (error) {
    console.error("lookupLoan:", error);
    if (message) message.textContent = error.message;
    ["loanSummarySection", "paymentSummarySection", "emiScheduleSection", "paymentSection", "paymentHistorySection"].forEach(hideElement);
    showMessage(error.message, "error");
  }
}
function getLoanObject(data) { return data.loan || data.loan_account || data.account || data; }
function getScheduleFromData(data) { return data.emi_schedule || data.schedule || data.emiSchedule || getLoanObject(data)?.emi_schedule || []; }

/* Loan display */
function displayLoan(data) {
  const loan = getLoanObject(data);
  if (!loan) return showMessage("Loan details nahi mili.", "error");
  currentLoan = loan;
  setText("loanAccountNo", loan.loan_account_number || loan.account_number || loan.loanAccountNumber || "-");
  setText("loanPrincipal", formatNumber(loan.principal ?? loan.loan_amount ?? loan.amount ?? 0));
  setText("loanRate", loan.interest_rate ?? loan.rate ?? loan.interestRate ?? 0);
  setText("loanTenure", loan.tenure_months ?? loan.tenure ?? loan.tenureMonths ?? 0);
  setText("loanEmi", formatNumber(loan.emi_amount ?? loan.emi ?? loan.monthly_emi ?? 0));
  setText("loanStatus", loan.status || loan.loan_status || "Active");
  showElement("loanSummarySection");
  currentEmiSchedule = getScheduleFromData(data);
  displayEmiSchedule(currentEmiSchedule);
  displayPaymentSummary(currentEmiSchedule, currentPayments);
  showElement("paymentSection"); showElement("paymentHistorySection");
}

/* Payment summary */
function displayPaymentSummary(schedule = [], payments = []) {
  const rows = Array.isArray(schedule) ? schedule : [];
  const paymentRows = Array.isArray(payments) ? payments : [];
  let totalPayable = 0, schedulePaid = 0, paidCount = 0, pendingCount = 0;
  rows.forEach(emi => {
    const due = Number(emi.total_due ?? emi.emi_amount ?? emi.emi ?? emi.total ?? 0);
    const paid = Number(emi.paid_amount ?? emi.amount_paid ?? emi.paid ?? 0);
    totalPayable += due; schedulePaid += paid;
    const status = String(emi.status || "").toLowerCase();
    if (status === "paid" || (paid >= due && due > 0)) paidCount++; else pendingCount++;
  });
  const paymentPaid = paymentRows.reduce((sum, p) => sum + Number(p.amount ?? p.paid_amount ?? p.payment_amount ?? 0), 0);
  const totalPaid = schedulePaid > 0 ? schedulePaid : paymentPaid;
  const totalPending = Math.max(totalPayable - totalPaid, 0);
  setText("totalPayableAmount", formatNumber(totalPayable));
  setText("totalPaidAmount", formatNumber(totalPaid));
  setText("totalPendingAmount", formatNumber(totalPending));
  setText("paidEmiCount", paidCount);
  setText("pendingEmiCount", pendingCount);
  const progress = totalPayable > 0 ? Math.min((totalPaid / totalPayable) * 100, 100) : 0;
  const progressBar = document.getElementById("paymentProgress");
  if (progressBar) {
    if (progressBar.tagName === "PROGRESS") progressBar.value = progress;
    else { progressBar.style.width = `${progress}%`; progressBar.textContent = `${Math.round(progress)}%`; }
  }
  showElement("paymentSummarySection");
}

/* EMI schedule */
function displayEmiSchedule(schedule = []) {
  const body = document.getElementById("emiTableBody");
  if (!body) return;
  body.innerHTML = "";
  if (!Array.isArray(schedule) || !schedule.length) {
    const row = document.createElement("tr"); row.innerHTML = '<td colspan="7">EMI schedule available nahi hai.</td>'; body.appendChild(row);
    showElement("emiScheduleSection"); return;
  }
  schedule.forEach((emi, index) => {
    const installmentNo = emi.installment_no ?? emi.installment_number ?? emi.emi_number ?? index + 1;
    const principal = emi.principal_amount ?? emi.principal ?? 0;
    const interest = emi.interest_amount ?? emi.interest ?? 0;
    const total = emi.total_due ?? emi.emi_amount ?? emi.emi ?? emi.total ?? Number(principal) + Number(interest);
    const paid = emi.paid_amount ?? emi.amount_paid ?? emi.paid ?? 0;
    const rawStatus = String(emi.status || (Number(paid) >= Number(total) && Number(total) > 0 ? "Paid" : "Pending"));
    const isPaid = rawStatus.toLowerCase() === "paid" || (Number(paid) >= Number(total) && Number(total) > 0);
    const row = document.createElement("tr");
    const actionHtml = isPaid ? `<span class="status-paid">${rawStatus}</span>` : `<button type="button" class="pay-emi-button" onclick="payEmi(${Number(installmentNo)})">Pay EMI</button> <span>${rawStatus}</span>`;
    row.innerHTML = `<td>${installmentNo}</td><td>${formatDate(emi.due_date ?? emi.dueDate ?? emi.payment_date)}</td><td>${formatMoney(principal)}</td><td>${formatMoney(interest)}</td><td>${formatMoney(total)}</td><td>${formatMoney(paid)}</td><td>${actionHtml}</td>`;
    body.appendChild(row);
  });
  showElement("emiScheduleSection");
}

/* Payments */
function getNextPendingEmi() {
  if (!Array.isArray(currentEmiSchedule)) return null;
  return currentEmiSchedule.find((emi, index) => {
    const total = Number(emi.total_due ?? emi.emi_amount ?? emi.emi ?? emi.total ?? 0);
    const paid = Number(emi.paid_amount ?? emi.amount_paid ?? emi.paid ?? 0);
    return String(emi.status || "").toLowerCase() !== "paid" && paid < total;
  }) || null;
}

async function payEmi(installmentNo) {
  if (!currentApplicationId || !currentMobile) return showMessage("Pehle apni loan details lookup karein.", "error");
  const emi = currentEmiSchedule.find((item, index) => Number(item.installment_no ?? item.installment_number ?? item.emi_number ?? index + 1) === Number(installmentNo));
  const amount = Number(emi?.total_due ?? emi?.emi_amount ?? emi?.emi ?? emi?.total ?? 0);
  if (!window.confirm(`EMI ${installmentNo} ke liye ${formatMoney(amount)} ka test payment karna hai?`)) return;
  try {
    showMessage("Payment process ho rahi hai...", "info");
    const data = await apiRequest(`${API_BASE}/api/customer/pay-emi-test`, { method: "POST", body: JSON.stringify({ application_id: currentApplicationId, mobile: currentMobile, installment_no: Number(installmentNo), payment_method: "test" }) });
    showMessage(data.message || "EMI payment successfully recorded.", "success");
    await refreshLoan();
  } catch (error) { console.error("payEmi:", error); showMessage(error.message, "error"); }
}

async function handlePaymentForm(event) {
  if (event) event.preventDefault();
  const amountInput = document.getElementById("paymentAmount");
  const methodInput = document.getElementById("paymentMethod");
  const message = document.getElementById("paymentMessage");
  if (!currentApplicationId || !currentMobile) return showMessage("Pehle loan details lookup karein.", "error");
  const nextEmi = getNextPendingEmi();
  if (!nextEmi) return showMessage("Koi pending EMI nahi hai.", "success");
  const installmentNo = nextEmi.installment_no ?? nextEmi.installment_number ?? nextEmi.emi_number;
  const amount = Number(nextEmi.total_due ?? nextEmi.emi_amount ?? nextEmi.emi ?? nextEmi.total ?? 0);
  if (amountInput) amountInput.value = amount;
  try {
    if (message) message.textContent = "Payment process ho rahi hai...";
    const data = await apiRequest(`${API_BASE}/api/customer/pay-emi-test`, { method: "POST", body: JSON.stringify({ application_id: currentApplicationId, mobile: currentMobile, installment_no: Number(installmentNo), payment_method: methodInput?.value || "test" }) });
    if (message) message.textContent = data.message || "Payment successfully recorded.";
    showMessage(data.message || "Payment successfully recorded.", "success");
    await refreshLoan();
  } catch (error) { console.error("handlePaymentForm:", error); if (message) message.textContent = error.message; showMessage(error.message, "error"); }
}

/* Payment history */
async function loadPaymentHistory(showStatus = true) {
  if (!currentApplicationId || !currentMobile) return;
  try {
    if (showStatus) showMessage("Payment history load ho rahi hai...", "info");
    const data = await apiRequest(`${API_BASE}/api/customer/payment-history?application_id=${encodeURIComponent(currentApplicationId)}&mobile=${encodeURIComponent(currentMobile)}`);
    currentPayments = data.payments || data.payment_history || data.history || [];
    displayPaymentHistory(currentPayments);
    displayPaymentSummary(currentEmiSchedule, currentPayments);
    if (showStatus) showMessage("Payment history loaded.", "success");
  } catch (error) {
    console.error("loadPaymentHistory:", error); currentPayments = []; displayPaymentHistory([]); if (showStatus) showMessage(error.message, "error");
  }
}

function displayPaymentHistory(payments = []) {
  const body = document.getElementById("paymentHistoryBody");
  if (!body) return;
  body.innerHTML = "";
  if (!Array.isArray(payments) || !payments.length) {
    const row = document.createElement("tr"); row.innerHTML = '<td colspan="5">Payment history available nahi hai.</td>'; body.appendChild(row); showElement("paymentHistorySection"); return;
  }
  payments.forEach(payment => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${payment.installment_no ?? payment.installment_number ?? "-"}</td><td>${formatMoney(payment.amount ?? payment.paid_amount ?? payment.payment_amount ?? 0)}</td><td>${payment.payment_method || payment.method || "-"}</td><td>${formatDate(payment.paid_at || payment.payment_date || payment.created_at)}</td><td>${payment.transaction_ref || payment.transaction_id || payment.reference || "-"}</td>`;
    body.appendChild(row);
  });
  showElement("paymentHistorySection");
}

async function refreshLoan() {
  if (!currentApplicationId || !currentMobile) return showMessage("Pehle Application ID aur mobile number se loan lookup karein.", "error");
  try {
    const data = await apiRequest(`${API_BASE}/api/customer/loan`, { method: "POST", body: JSON.stringify({ application_id: currentApplicationId, mobile: currentMobile }) });
    currentLoan = getLoanObject(data); currentEmiSchedule = getScheduleFromData(data); displayLoan(data); await loadPaymentHistory(false); showMessage("Loan details refresh ho gayi.", "success");
  } catch (error) { console.error("refreshLoan:", error); showMessage(error.message, "error"); }
}

/* Eligibility */
async function checkEligibility(event) {
  if (event) event.preventDefault();
  const nameInput = document.getElementById("eligibilityName");
  const mobileInput = document.getElementById("eligibilityMobile");
  const amountInput = document.getElementById("requestedAmount");
  const incomeInput = document.getElementById("monthlyIncome");
  const tenureInput = document.getElementById("eligibilityTenure");
  const result = document.getElementById("eligibilityResult");
  if (!nameInput || !mobileInput || !amountInput || !incomeInput || !tenureInput) return showMessage("Eligibility form fields nahi mile.", "error");
  const name = nameInput.value.trim();
  const mobile = mobileInput.value.trim();
  const requestedAmount = Number(amountInput.value);
  const monthlyIncome = Number(incomeInput.value);
  const tenureMonths = Number(tenureInput.value);
  const age = Number(document.getElementById("eligibilityAge")?.value || 0);
  const employmentType = document.getElementById("employmentType")?.value || "";
  const existingEmi = Number(document.getElementById("existingEmi")?.value || 0);
  if (name.length < 2) return showMessage("Please enter your full name.", "error");
  if (!/^\d{10}$/.test(mobile)) return showMessage("Please enter a valid 10-digit mobile number.", "error");
  if (!Number.isFinite(age) || age < 18 || age > 80) return showMessage("Please enter a valid age.", "error");
  if (!employmentType) return showMessage("Please select employment type.", "error");
  if (!Number.isFinite(existingEmi) || existingEmi < 0) return showMessage("Please enter a valid existing EMI.", "error");
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) return showMessage("Please enter a valid requested loan amount.", "error");
  if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) return showMessage("Please enter a valid monthly income.", "error");
  if (!Number.isFinite(tenureMonths) || tenureMonths < 1 || tenureMonths > 120) return showMessage("Tenure 1 se 120 months ke beech honi chahiye.", "error");
  try {
    showMessage("Eligibility check ho raha hai...", "info");
    const data = await apiRequest(`${API_BASE}/api/eligibility`, { method: "POST", body: JSON.stringify({ full_name: name, mobile, age, employment_type: employmentType, existing_emi: existingEmi, monthly_income: monthlyIncome, requested_amount: requestedAmount, tenure_months: tenureMonths }) });
    const isEligible = data.eligible === true || data.eligibility_status === "likely_eligible";
    const needsReview = data.eligibility_status === "needs_review";
    setText("eligibilityTitle", isEligible ? "Preliminary Eligibility: Likely Eligible" : needsReview ? "Preliminary Eligibility: Review Required" : "Preliminary Eligibility: Not Eligible");
    setText("eligibilityMessage", data.message || data.eligibility_reason || "Preliminary eligibility result received.");
    setText("estimatedEmi", formatNumber(data.estimated_emi ?? data.estimatedEmi ?? 0));
    setText("estimatedRate", data.estimated_rate ?? data.estimatedRate ?? 12);
    setText("inquiryId", data.inquiry_id || data.inquiryId || "-");
    if (result) result.style.display = "block";
    const loanApplication = document.getElementById("loanApplication");
    if (loanApplication) loanApplication.style.display = "block";
    showEligibilityStep(3);
    showMessage("Preliminary eligibility result mil gaya.", "success");
  } catch (error) {
    console.error("checkEligibility:", error);
    setText("eligibilityMessage", error.message);
    if (result) result.style.display = "block";
    showMessage(error.message, "error");
  }
}

/* Optional inquiry form */
async function submitInquiry(event) {
  if (event) event.preventDefault();
  const form = document.getElementById("inquiryForm");
  if (!form) return showMessage("Inquiry form available nahi hai.", "error");
  try {
    showMessage("Inquiry submit ho rahi hai...", "info");
    const payload = Object.fromEntries(new FormData(form).entries());
    const data = await apiRequest(`${API_BASE}/api/inquiries`, { method: "POST", body: JSON.stringify(payload) });
    showMessage(data.message || "Inquiry successfully submit ho gayi.", "success");
    form.reset();
  } catch (error) { console.error("submitInquiry:", error); showMessage(error.message, "error"); }
}

/* Events */
document.addEventListener("DOMContentLoaded", () => {
  const nextStep1 = document.getElementById("nextStep1");
  if (nextStep1) nextStep1.addEventListener("click", goToEligibilityStep2);
  const backStep2 = document.getElementById("backStep2");
  if (backStep2) backStep2.addEventListener("click", goToEligibilityStep1);
  const eligibilityForm = document.getElementById("eligibilityForm");
  if (eligibilityForm) eligibilityForm.addEventListener("submit", checkEligibility);
  const applicationForm = document.getElementById("loanApplicationForm");
  if (applicationForm) applicationForm.addEventListener("submit", submitApplication);
  const uploadButton = document.getElementById("uploadDocumentsButton");
  if (uploadButton) uploadButton.addEventListener("click", uploadDocument);
  const lookupForm = document.getElementById("lookupForm");
  if (lookupForm) lookupForm.addEventListener("submit", lookupLoan);
  const paymentForm = document.getElementById("paymentForm");
  if (paymentForm) paymentForm.addEventListener("submit", handlePaymentForm);
  const inquiryForm = document.getElementById("inquiryForm");
  if (inquiryForm) inquiryForm.addEventListener("submit", submitInquiry);
  if (document.getElementById("eligibilityStep1")) showEligibilityStep(1);

  const applyNowBtn = document.querySelector(".apply-now-btn");
  if (applyNowBtn) applyNowBtn.addEventListener("click", () => {
    const section = document.getElementById("loanApplication");
    if (section) { section.style.display = "block"; setTimeout(() => section.scrollIntoView({behavior:"smooth", block:"start"}), 50); }
  });
});

window.submitApplication = submitApplication;
window.uploadDocument = uploadDocument;
window.lookupLoan = lookupLoan;
window.payEmi = payEmi;
window.refreshLoan = refreshLoan;
window.loadPaymentHistory = loadPaymentHistory;
window.checkEligibility = checkEligibility;
window.submitInquiry = submitInquiry;
window.goToEligibilityStep2 = goToEligibilityStep2;
window.goToEligibilityStep1 = goToEligibilityStep1;
