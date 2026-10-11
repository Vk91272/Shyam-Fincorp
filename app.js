
const API_BASE = "https://shyam-fincorp.onrender.com";
// Agar aapka actual Render service URL alag hai, to upar use replace karein.

const $ = (s) => document.querySelector(s);
let token = sessionStorage.getItem("sfl_admin_token") || "";
let applicationCache = [];

const money = n => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(Number(n) || 0);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));

const pretty = s => String(s || "unknown")
  .replaceAll("_", " ")
  .replace(/\b\w/g, c => c.toUpperCase());

function say(message, error = false) {
  $("#notice").textContent = message;
  $("#notice").classList.toggle("error-text", error);
}

async function api(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    logout();
    throw new Error("Session expired. Please sign in again.");
  }
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  $("#view-" + name).classList.remove("hidden");
  document.querySelectorAll("[data-view]").forEach(b =>
    b.classList.toggle("active", b.dataset.view === name)
  );
  $("#page-title").textContent = ({
    dashboard: "Dashboard",
    applications: "Loan Applications",
    customers: "Customers",
    emis: "EMI Tracking"
  })[name];
  loadView(name);
}

function statusTag(value) {
  const safe = esc(value || "unknown").toLowerCase().replaceAll(" ", "_");
  return `<span class="status ${safe}">${esc(pretty(value))}</span>`;
}

function makeTable(headers, rows) {
  return `<div class="table-wrap"><table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.length ? rows.map(row =>
      `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`
    ).join("") : `<tr><td colspan="${headers.length}">No records found.</td></tr>`}</tbody>
  </table></div>`;
}

async function loadDashboard() {
  const [summary, apps] = await Promise.all([
    api("/api/admin/summary"),
    api("/api/admin/applications")
  ]);
  applicationCache = apps;
  $("#total-apps").textContent = summary.applications ?? apps.length;
  $("#total-customers").textContent = summary.customers ?? "—";
  $("#total-amount").textContent = money(summary.requestedAmount);
  $("#pending-emis").textContent = summary.pendingEmis ?? "—";

  $("#recent-table").innerHTML = makeTable(
    ["Application", "Customer", "Amount", "Status"],
    apps.slice(0, 5).map(a => [
      esc(a.application_id),
      esc(a.full_name) + `<br><small>${esc(a.mobile)}</small>`,
      money(a.requested_amount),
      statusTag(a.status)
    ])
  );
}

async function loadApplications() {
  const apps = await api("/api/admin/applications");
  applicationCache = apps;
  $("#applications-table").innerHTML = makeTable(
    ["Application ID", "Customer", "Income", "Requested amount", "Tenure", "Status"],
    apps.map(a => [
      esc(a.application_id),
      `${esc(a.full_name)}<br><small>${esc(a.mobile)}</small>`,
      money(a.monthly_income),
      money(a.requested_amount),
      `${esc(a.tenure_months ?? "—")} months`,
      `<select data-status-id="${esc(a.application_id)}">
        ${["submitted","under_review","approved","rejected","disbursed","closed"]
          .map(s => `<option value="${s}" ${a.status === s ? "selected" : ""}>${pretty(s)}</option>`)
          .join("")}
      </select>`
    ])
  );
}

async function loadCustomers() {
  const customers = await api("/api/admin/customers");
  $("#customers-table").innerHTML = makeTable(
    ["Customer", "Mobile", "Email", "Address"],
    customers.map(c => [
      esc(c.full_name),
      esc(c.mobile),
      esc(c.email || "—"),
      esc(c.address || "—")
    ])
  );
}

async function loadEmis() {
  const emis = await api("/api/admin/emis");
  $("#emis-table").innerHTML = makeTable(
    ["Application", "Customer", "EMI amount", "Due date", "Status", "Action"],
    emis.map(e => [
      esc(e.application_id),
      esc(e.customer || e.full_name || "—"),
      money(e.amount),
      esc(e.due_date || "—"),
      statusTag(e.status),
      e.status === "paid" ? "Paid" :
        `<button class="btn" data-mark-paid="${esc(e.id)}">Mark paid</button>`
    ])
  );
}

async function loadView(name) {
  try {
    say("Loading records…");
    if (name === "dashboard") await loadDashboard();
    if (name === "applications") await loadApplications();
    if (name === "customers") await loadCustomers();
    if (name === "emis") await loadEmis();
    say("Data updated successfully.");
  } catch (e) {
    say(e.message, true);
  }
}

function openApp() {
  $("#login-screen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  showView("dashboard");
}

function logout() {
  token = "";
  sessionStorage.removeItem("sfl_admin_token");
  $("#app").classList.add("hidden");
  $("#login-screen").classList.remove("hidden");
}

$("#login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const button = e.currentTarget.querySelector("button");
  button.disabled = true;
  $("#login-error").textContent = "";

  try {
    const result = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: $("#email").value.trim(),
        password: $("#password").value
      })
    });
    token = result.token;
    sessionStorage.setItem("sfl_admin_token", token);
    openApp();
  } catch (err) {
    $("#login-error").textContent = err.message;
  } finally {
    button.disabled = false;
  }
});

$("#logout").addEventListener("click", logout);
$("#refresh-apps").addEventListener("click", () => loadView("applications"));
$("#refresh-customers").addEventListener("click", () => loadView("customers"));
$("#refresh-emis").addEventListener("click", () => loadView("emis"));

document.addEventListener("click", async e => {
  const go = e.target.closest("[data-go]");
  if (go) showView(go.dataset.go);

  const paid = e.target.closest("[data-mark-paid]");
  if (paid) {
    if (!confirm("Mark this EMI as paid? Confirm only after payment has been verified.")) return;
    try {
      await api(`/api/admin/emis/${encodeURIComponent(paid.dataset.markPaid)}/paid`, {
        method: "PATCH", body: JSON.stringify({})
      });
      await loadView("emis");
    } catch (err) { say(err.message, true); }
  }
});

document.addEventListener("change", async e => {
  const select = e.target.closest("[data-status-id]");
  if (!select) return;
  try {
    await api(`/api/admin/applications/${encodeURIComponent(select.dataset.statusId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: select.value })
    });
    say("Application status updated.");
    await loadDashboard();
  } catch (err) {
    say(err.message, true);
    await loadApplications();
  }
});

document.querySelectorAll("[data-view]").forEach(button =>
  button.addEventListener("click", () => showView(button.dataset.view))
);

if (token) {
  // Verify stored session with a protected endpoint before opening the dashboard.
  api("/api/admin/applications").then(openApp).catch(logout);
}
