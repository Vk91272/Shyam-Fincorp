
const API_BASE = "https://shyam-fincorp.onrender.com";

const $ = (id) => document.getElementById(id);

let adminToken = "";
let applicationData = [];
let customerData = [];
let paymentData = [];
let eligibilityData = [];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const safe = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);

const statusClass = (value) => {
  const key = String(value || "").toLowerCase().replace(/\s+/g, "_");
  const allowed = [
    "approved", "paid", "disbursed", "closed",
    "submitted", "pending", "under_review",
    "rejected", "overdue"
  ];
  return allowed.includes(key) ? `status-${key}` : "status-default";
};

function setNotice(message, error = false) {
  const notice = $("notice");
  if (!notice) return;
  notice.textContent = message;
  notice.classList.remove("hidden", "error");
  if (error) notice.classList.add("error");
}

function clearNotice() {
  $("notice")?.classList.add("hidden");
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed (${response.status})`);
  }

  return data;
}

function showLogin() {
  $("loginScreen")?.classList.remove("hidden");
  $("adminSection")?.classList.add("hidden");
}

function showAdmin() {
  $("loginScreen")?.classList.add("hidden");
  $("adminSection")?.classList.remove("hidden");
}

async function login(event) {
  event.preventDefault();

  const key = $("adminKey").value.trim();
  const button = $("loginButton");
  const message = $("loginMessage");

  if (!key) {
    message.textContent = "Please enter your admin key.";
    return;
  }

  button.disabled = true;
  button.textContent = "Connecting…";
  message.textContent = "";

  try {
    const result = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ adminKey: key, key, password: key })
    });

    // Use the token returned by your backend, if it issues one.
    adminToken = result.token || result.accessToken || key;

    showAdmin();
    clearNotice();
    await loadDashboard();
  } catch (error) {
    message.textContent =
      `${error.message}. Check the backend login route and ADMIN_KEY on Render.`;
  } finally {
    button.disabled = false;
    button.textContent = "Sign in to CRM";
  }
}

function logout() {
  adminToken = "";
  $("adminKey").value = "";
  $("loginMessage").textContent = "";
  showLogin();
}

function showSection(name) {
  document.querySelectorAll(".page-section").forEach((section) => {
    section.classList.toggle("hidden", section.id !== name);
  });

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === name);
  });

  const active = document.querySelector(`.nav-link[data-section="${name}"]`);
  $("pageTitle").textContent = active ? active.textContent.trim() : name;
  $("sidebar").classList.remove("open");

  const loaders = {
    dashboard: loadDashboard,
    applications: loadApplications,
    customers: loadCustomers,
    payments: loadPayments,
    eligibility: loadEligibility,
    documents: loadDocuments
  };

  if (loaders[name]) loaders[name]();
}

function arrayFrom(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function getAmount(app) {
  return app.requested_amount ?? app.loan_amount ?? app.amount ?? 0;
}

function getApplicationId(app) {
  return app.application_id ?? app.applicationId ?? app.id ?? "—";
}

function renderStatus(value) {
  const label = String(value || "unknown").replace(/_/g, " ");
  return `<span class="status-badge ${statusClass(value)}">${safe(label)}</span>`;
}

function renderRecentApplications(rows) {
  const body = $("recentApplications");
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty">No applications found.</td></tr>';
    return;
  }

  body.innerHTML = rows.slice(0, 6).map((app) => `
    <tr>
      <td><strong>${safe(getApplicationId(app))}</strong></td>
      <td>${safe(app.full_name || app.customer_name || app.name || "—")}</td>
      <td>${money(getAmount(app))}</td>
      <td>${renderStatus(app.status)}</td>
    </tr>
  `).join("");
}

async function loadDashboard() {
  try {
    const result = await api("/api/admin/applications");
    applicationData = arrayFrom(result, ["applications", "data", "items"]);
    $("totalApplications").textContent = applicationData.length;
    $("pendingApplications").textContent = applicationData.filter((a) =>
      ["submitted", "under_review", "pending"].includes(String(a.status).toLowerCase())
    ).length;
    $("approvedApplications").textContent = applicationData.filter((a) =>
      ["approved", "disbursed", "closed"].includes(String(a.status).toLowerCase())
    ).length;

    renderRecentApplications(applicationData);

    try {
      const payments = await api("/api/admin/emis");
      paymentData = arrayFrom(payments, ["emis", "payments", "data", "items"]);
      const paid = paymentData
        .filter((p) => String(p.status).toLowerCase() === "paid")
        .reduce((sum, p) => sum + Number(p.amount || p.emi_amount || 0), 0);
      $("totalCollected").textContent = money(paid);
    } catch {
      $("totalCollected").textContent = "—";
    }
    clearNotice();
  } catch (error) {
    setNotice(`Dashboard could not load: ${error.message}`, true);
    renderRecentApplications([]);
  }
}

function renderApplications(rows) {
  const body = $("applicationsTable");
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty">No applications match your search.</td></tr>';
    return;
  }

  body.innerHTML = rows.map((app) => {
    const id = getApplicationId(app);
    const status = String(app.status || "submitted").toLowerCase();
    const options = ["submitted", "under_review", "approved", "rejected", "disbursed", "closed"];
    return `<tr>
      <td><strong>${safe(id)}</strong></td>
      <td>${safe(app.full_name || app.customer_name || app.name || "—")}</td>
      <td>${safe(app.mobile || app.phone || "—")}</td>
      <td>${money(getAmount(app))}</td>
      <td>${safe(app.tenure_months ?? app.tenure ?? "—")}</td>
      <td>${renderStatus(status)}</td>
      <td><select class="row-select" data-app-status="${safe(id)}">
        ${options.map((option) => `<option value="${option}" ${option === status ? "selected" : ""}>${option.replace(/_/g, " ")}</option>`).join("")}
      </select></td>
    </tr>`;
  }).join("");
}

async function loadApplications() {
  try {
    const result = await api("/api/admin/applications");
    applicationData = arrayFrom(result, ["applications", "data", "items"]);
    filterApplications();
  } catch (error) {
    $("applicationsTable").innerHTML = `<tr><td colspan="7" class="empty">${safe(error.message)}</td></tr>`;
  }
}

function filterApplications() {
  const query = ($("applicationSearch")?.value || "").toLowerCase();
  const status = $("applicationStatus")?.value || "";
  const filtered = applicationData.filter((app) => {
    const text = [
      getApplicationId(app), app.full_name, app.customer_name, app.mobile, app.email
    ].join(" ").toLowerCase();
    return text.includes(query) && (!status || String(app.status).toLowerCase() === status);
  });
  renderApplications(filtered);
}

async function updateApplicationStatus(id, status) {
  if (!confirm(`Change application ${id} status to "${status.replace(/_/g, " ")}"?`)) {
    loadApplications();
    return;
  }

  try {
    await api(`/api/admin/applications/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    setNotice(`Application ${id} status updated.`);
    await loadApplications();
    await loadDashboard();
  } catch (error) {
    setNotice(`Status update failed: ${error.message}`, true);
    await loadApplications();
  }
}

async function loadCustomers() {
  try {
    const result = await api("/api/admin/customers");
    customerData = arrayFrom(result, ["customers", "data", "items"]);
    filterCustomers();
  } catch (error) {
    $("customersTable").innerHTML = `<tr><td colspan="5" class="empty">${safe(error.message)}. Confirm that your backend has a customers endpoint.</td></tr>`;
  }
}

function filterCustomers() {
  const query = ($("customerSearch")?.value || "").toLowerCase();
  const rows = customerData.filter((c) =>
    [c.full_name, c.name, c.customer_name, c.mobile, c.phone, c.email, c.loan_account]
      .join(" ").toLowerCase().includes(query)
  );

  $("customersTable").innerHTML = rows.length ? rows.map((c) => `
    <tr>
      <td><strong>${safe(c.full_name || c.customer_name || c.name || "—")}</strong></td>
      <td>${safe(c.mobile || c.phone || "—")}</td>
      <td>${safe(c.email || "—")}</td>
      <td>${safe(c.loan_account || c.loan_account_number || "—")}</td>
      <td>${renderStatus(c.status || "active")}</td>
    </tr>`).join("") : '<tr><td colspan="5" class="empty">No customers found.</td></tr>';
}

async function loadPayments() {
  try {
    const result = await api("/api/admin/emis");
    paymentData = arrayFrom(result, ["emis", "payments", "data", "items"]);
    filterPayments();

    $("totalEmis").textContent = paymentData.length;
    const pending = paymentData.filter((p) => ["pending", "overdue"].includes(String(p.status).toLowerCase()));
    const paid = paymentData.filter((p) => String(p.status).toLowerCase() === "paid");
    $("pendingEmiAmount").textContent = money(pending.reduce((s, p) => s + Number(p.amount || p.emi_amount || 0), 0));
    $("paidEmiAmount").textContent = money(paid.reduce((s, p) => s + Number(p.amount || p.emi_amount || 0), 0));
  } catch (error) {
    $("paymentsTable").innerHTML = `<tr><td colspan="6" class="empty">${safe(error.message)}. Confirm the backend EMI endpoint.</td></tr>`;
  }
}

function filterPayments() {
  const query = ($("paymentSearch")?.value || "").toLowerCase();
  const status = $("paymentStatus")?.value || "";
  const rows = paymentData.filter((p) =>
    [p.application_id, p.customer, p.customer_name, p.name].join(" ").toLowerCase().includes(query) &&
    (!status || String(p.status).toLowerCase() === status)
  );

  $("paymentsTable").innerHTML = rows.length ? rows.map((p) => {
    const id = p.id;
    const currentStatus = String(p.status || "pending").toLowerCase();
    return `<tr>
      <td><strong>${safe(p.application_id || "—")}</strong></td>
      <td>${safe(p.customer || p.customer_name || p.name || "—")}</td>
      <td>${money(p.amount || p.emi_amount)}</td>
      <td>${safe(p.due_date || "—")}</td>
      <td>${renderStatus(currentStatus)}</td>
      <td>${currentStatus !== "paid" ? `<button class="small-action" data-mark-paid="${safe(id)}">Mark paid</button>` : "Completed"}</td>
    </tr>`;
  }).join("") : '<tr><td colspan="6" class="empty">No EMI records found.</td></tr>';
}

async function markEmiPaid(id) {
  if (!confirm("Mark this EMI as paid? Only do this after verifying the payment.")) return;
  try {
    await api(`/api/admin/emis/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "paid" })
    });
    setNotice("EMI status updated to paid.");
    await loadPayments();
    await loadDashboard();
  } catch (error) {
    setNotice(`Could not update EMI: ${error.message}`, true);
  }
}

async function loadEligibility() {
  try {
    const result = await api("/api/admin/eligibility");
    eligibilityData = arrayFrom(result, ["inquiries", "eligibility", "data", "items"]);
    $("eligibilityTable").innerHTML = eligibilityData.length ? eligibilityData.map((e) => `
      <tr>
        <td>${safe(e.full_name || e.name || "—")}</td>
        <td>${safe(e.mobile || "—")}</td>
        <td>${money(e.monthly_income)}</td>
        <td>${money(e.requested_amount)}</td>
        <td>${money(e.estimated_emi)}</td>
        <td>${safe(e.eligibility_status || e.status || "Review required")}</td>
      </tr>`).join("") : '<tr><td colspan="6" class="empty">No eligibility inquiry records found.</td></tr>';
  } catch (error) {
    $("eligibilityTable").innerHTML = `<tr><td colspan="6" class="empty">${safe(error.message)}. Your backend may not provide this endpoint yet.</td></tr>`;
  }
}

async function loadDocuments() {
  $("documentsMessage").textContent =
    "This section needs a protected backend endpoint for listing document metadata. Private document files should not be made public.";
}

function refreshCurrent() {
  const active = document.querySelector(".nav-link.active");
  if (active) showSection(active.dataset.section);
}

document.addEventListener("DOMContentLoaded", () => {
  $("currentYear").textContent = new Date().getFullYear();
  $("loginForm").addEventListener("submit", login);
  $("logoutButton").addEventListener("click", logout);
  $("refreshButton").addEventListener("click", refreshCurrent);
  $("menuButton").addEventListener("click", () => $("sidebar").classList.toggle("open"));

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => showSection(button.dataset.section));
  });

  document.querySelectorAll("[data-goto]").forEach((button) => {
    button.addEventListener("click", () => showSection(button.dataset.goto));
  });

  document.querySelectorAll("[data-reload]").forEach((button) => {
    button.addEventListener("click", () => showSection(button.dataset.reload));
  });

  $("applicationSearch").addEventListener("input", filterApplications);
  $("applicationStatus").addEventListener("change", filterApplications);
  $("customerSearch").addEventListener("input", filterCustomers);
  $("paymentSearch").addEventListener("input", filterPayments);
  $("paymentStatus").addEventListener("change", filterPayments);

  document.addEventListener("change", (event) => {
    const select = event.target.closest("[data-app-status]");
    if (select) updateApplicationStatus(select.dataset.appStatus, select.value);
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mark-paid]");
    if (button) markEmiPaid(button.dataset.markPaid);
  });

  fetch(API_BASE)
    .then((response) => {
      if (!response.ok) throw new Error("API unavailable");
    })
    .catch(() => setNotice("API connection could not be verified. Check your Render service.", true));
});
