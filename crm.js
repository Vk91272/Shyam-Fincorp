const API_BASE = "https://shyam-fincorp.onrender.com";

const TOKEN_KEY = "shyam_admin_token";
const USER_KEY = "shyam_admin_user";

let crmCache = {
  customers: [],
  applications: [],
  loans: [],
  payments: [],
  inquiries: []
};


/* =====================================================
   BASIC HELPERS
===================================================== */

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  const n = Number(value || 0);

  return "₹" + n.toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function dateValue(value) {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return escapeHtml(value);
  }

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function shortDate(value) {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return escapeHtml(value);
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getAmount(row) {
  return Number(
    row?.amount ??
    row?.payment_amount ??
    row?.paid_amount ??
    row?.principal ??
    row?.loan_amount ??
    row?.loanAmount ??
    0
  );
}

function getLoanAmount(row) {
  return Number(
    row?.principal ??
    row?.loan_amount ??
    row?.loanAmount ??
    row?.amount ??
    0
  );
}

function showToast(message, type = "success") {
  let toast = document.getElementById("crmToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "crmToast";
    toast.className = "crm-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = "crm-toast " + type;

  setTimeout(() => {
    toast.classList.add("hide");
  }, 2500);
}


/* =====================================================
   AUTH
===================================================== */

function requireLogin() {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    window.location.href = "crm-login.html";
    return false;
  }

  return true;
}

function logoutAdmin() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  window.location.href = "crm-login.html";
}

async function apiRequest(path, options = {}) {

  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    window.location.href = "crm-login.html";
    throw new Error("Admin login required");
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(API_BASE + path, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    window.location.href = "crm-login.html";

    throw new Error("Session expired");
  }

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `Request failed (${response.status})`
    );
  }

  return data;
}


/* =====================================================
   ADMIN NAME
===================================================== */

function loadAdminName() {

  const username =
    localStorage.getItem(USER_KEY) ||
    "Administrator";

  document
    .querySelectorAll("[data-admin-name]")
    .forEach(element => {
      element.textContent = username;
    });
}


/* =====================================================
   PAGE DATA
===================================================== */

const pageData = {

  overview: {
    title: "Dashboard",
    subtitle:
      "Monitor customers, applications, loans and collections."
  },

  customers: {
    title: "Customers",
    subtitle:
      "Manage customer profiles and accounts."
  },

  applications: {
    title: "Applications",
    subtitle:
      "Review and manage loan applications."
  },

  loans: {
    title: "Loan Portfolio",
    subtitle:
      "Monitor active and closed loan accounts."
  },

  collections: {
    title: "Collections",
    subtitle:
      "Track EMI collections and payments."
  },

  emi: {
    title: "EMI Center",
    subtitle:
      "Monitor EMI payments and schedules."
  },

  documents: {
    title: "Documents",
    subtitle:
      "Review customer verification documents."
  },

  inquiries: {
    title: "Eligibility",
    subtitle:
      "Review preliminary eligibility inquiries."
  },

  followups: {
    title: "Follow-ups",
    subtitle:
      "Manage customer follow-ups."
  },

  reports: {
    title: "Reports",
    subtitle:
      "Download CRM reports."
  }
};


/* =====================================================
   PAGE NAVIGATION
===================================================== */

async function showPage(page) {

  const config =
    pageData[page] ||
    pageData.overview;

  const overview =
    $("overviewPage");

  const generic =
    $("genericPage");

  if ($("pageTitle")) {
    $("pageTitle").textContent =
      config.title;
  }

  if ($("pageSubtitle")) {
    $("pageSubtitle").textContent =
      config.subtitle;
  }

  document
    .querySelectorAll(".nav-item")
    .forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.page === page
      );
    });

  if (page === "overview") {

    overview?.classList.add("active");
    generic?.classList.remove("active");

    await loadPremiumCRMDashboard();

  } else {

    overview?.classList.remove("active");
    generic?.classList.add("active");

    await renderPageContent(page);
  }

  document
    .querySelector(".crm-sidebar")
    ?.classList.remove("mobile-open");
}


/* =====================================================
   DASHBOARD
===================================================== */

async function loadPremiumCRMDashboard() {

  const results =
    await Promise.allSettled([

      apiRequest("/api/admin/report/customers"),

      apiRequest("/api/admin/report/applications"),

      apiRequest("/api/admin/report/loans"),

      apiRequest("/api/admin/report/payments")

    ]);


  const customersResult = results[0];
  const applicationsResult = results[1];
  const loansResult = results[2];
  const paymentsResult = results[3];


  const customers =
    customersResult.status === "fulfilled"
      ? customersResult.value.data || []
      : [];

  const applications =
    applicationsResult.status === "fulfilled"
      ? applicationsResult.value.data || []
      : [];

  const loans =
    loansResult.status === "fulfilled"
      ? loansResult.value.data || []
      : [];

  const payments =
    paymentsResult.status === "fulfilled"
      ? paymentsResult.value.data || []
      : [];


  crmCache.customers = customers;
  crmCache.applications = applications;
  crmCache.loans = loans;
  crmCache.payments = payments;


  /* =========================
     CUSTOMER
  ========================== */

  if ($("crmTotalCustomers")) {
    $("crmTotalCustomers").textContent =
      customers.length;
  }


  /* =========================
     APPLICATIONS
  ========================== */

  if ($("crmTotalApplications")) {
    $("crmTotalApplications").textContent =
      applications.length;
  }


  const pending =
    applications.filter(app => {

      const status =
        String(app.status || "")
          .toLowerCase();

      return [
        "submitted",
        "under_review",
        "pending"
      ].includes(status);

    }).length;


  if ($("crmPendingApplications")) {
    $("crmPendingApplications").textContent =
      pending;
  }


  /* =========================
     LOANS
  ========================== */

  const activeLoans =
    loans.filter(loan => {

      const status =
        String(loan.status || "")
          .toLowerCase();

      return [
        "active",
        "disbursed"
      ].includes(status);

    });


  if ($("crmActiveLoans")) {
    $("crmActiveLoans").textContent =
      activeLoans.length;
  }


  /* =========================
     PORTFOLIO
  ========================== */

  const portfolio =
    loans.reduce(
      (sum, loan) =>
        sum + getLoanAmount(loan),
      0
    );


  document
    .querySelectorAll("#crmPortfolioAmount")
    .forEach(element => {
      element.textContent =
        money(portfolio);
    });


  const activeCount =
    loans.filter(loan =>
      String(loan.status || "")
        .toLowerCase() === "active"
    ).length;


  const disbursedCount =
    loans.filter(loan =>
      String(loan.status || "")
        .toLowerCase() === "disbursed"
    ).length;


  const closedCount =
    loans.filter(loan =>
      String(loan.status || "")
        .toLowerCase() === "closed"
    ).length;


  if ($("crmPortfolioActive")) {
    $("crmPortfolioActive").textContent =
      activeCount;
  }

  if ($("crmPortfolioDisbursed")) {
    $("crmPortfolioDisbursed").textContent =
      disbursedCount;
  }

  if ($("crmPortfolioClosed")) {
    $("crmPortfolioClosed").textContent =
      closedCount;
  }


  /* =========================
     PAYMENTS
  ========================== */

  const collection =
    payments.reduce(
      (sum, payment) =>
        sum + Number(
          payment.amount ??
          payment.payment_amount ??
          payment.paid_amount ??
          0
        ),
      0
    );


  if ($("crmCollectionAmount")) {
    $("crmCollectionAmount").textContent =
      money(collection);
  }

  if ($("crmCollectedAmount")) {
    $("crmCollectedAmount").textContent =
      money(collection);
  }

  if ($("crmPaymentCount")) {
    $("crmPaymentCount").textContent =
      payments.length;
  }


  /* =========================
     RECENT APPLICATIONS
  ========================== */

  renderRecentCRMApplications(applications);


  /* =========================
     PAYMENT ERROR
  ========================== */

  if (paymentsResult.status === "rejected") {

    console.error(
      "Payment report error:",
      paymentsResult.reason
    );

    showToast(
      "Payment data load failed. Check backend payments report.",
      "error"
    );
  }
}


/* =====================================================
   RECENT APPLICATIONS
===================================================== */

function renderRecentCRMApplications(applications) {

  const container =
    $("crmRecentApplications");

  if (!container) return;


  const sorted =
    [...applications]
      .sort(
        (a, b) =>
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
      )
      .slice(0, 8);


  if (!sorted.length) {

    container.innerHTML = `
      <div class="crm-empty-state">
        No applications found.
      </div>
    `;

    return;
  }


  container.innerHTML =
    sorted.map(app => {

      const status =
        String(app.status || "submitted")
          .replace(/_/g, " ");


      return `
        <div
          class="crm-recent-row crm-clickable"
          onclick='openCRMRecord("application", ${JSON.stringify(app).replace(/'/g, "&#39;")})'
        >

          <div>
            <strong>
              ${escapeHtml(
                app.application_id ||
                app.id ||
                "—"
              )}
            </strong>

            <small>
              ${escapeHtml(
                app.full_name ||
                "Customer"
              )}
            </small>
          </div>


          <div>
            <strong>
              ${money(
                app.requested_amount
              )}
            </strong>

            <small>
              ${escapeHtml(
                app.mobile || "—"
              )}
            </small>
          </div>


          <span class="crm-status">
            ${escapeHtml(status)}
          </span>

        </div>
      `;

    }).join("");
}


/* =====================================================
   MODULE RENDERER
===================================================== */

async function renderPageContent(page) {

  const title =
    $("genericTitle");

  const text =
    $("genericText");

  const content =
    $("genericContent");


  if (title) {
    title.textContent =
      pageData[page]?.title ||
      "CRM Module";
  }


  if (text) {
    text.textContent =
      pageData[page]?.subtitle ||
      "";
  }


  if (!content) return;


  content.innerHTML = `
    <div class="crm-loading">
      Loading...
    </div>
  `;


  try {

    if (page === "customers") {

      await loadCustomers(content);

    } else if (page === "applications") {

      await loadApplications(content);

    } else if (page === "loans") {

      await loadLoans(content);

    } else if (page === "collections") {

      await loadPayments(content);

    } else if (page === "emi") {

      await loadPayments(content);

    } else if (page === "inquiries") {

      await loadInquiries(content);

    } else if (page === "reports") {

      renderReports(content);

    } else {

      renderComingSoon(content, page);

    }

  } catch (error) {

    console.error(error);

    content.innerHTML = `
      <div class="crm-error-box">
        ${escapeHtml(
          error.message ||
          "Could not load module"
        )}
      </div>
    `;
  }
}


/* =====================================================
   CUSTOMERS
===================================================== */

async function loadCustomers(container) {

  const data =
    await apiRequest(
      "/api/admin/report/customers"
    );


  const customers =
    data.data || [];


  crmCache.customers =
    customers;


  if (!customers.length) {

    container.innerHTML = `
      <div class="crm-empty-state">
        No customers found.
      </div>
    `;

    return;
  }


  container.innerHTML = `

    <div class="crm-module-toolbar">

      <strong>
        ${customers.length} Customers
      </strong>

      <span>
        Click a customer to view details
      </span>

    </div>


    <div class="crm-table-wrap">

      <table class="crm-module-table">

        <thead>
          <tr>
            <th>NAME</th>
            <th>MOBILE</th>
            <th>EMAIL</th>
            <th>CREATED</th>
          </tr>
        </thead>

        <tbody>

          ${customers.map(customer => `

            <tr
              class="crm-table-clickable"
              onclick='openCRMRecord("customer", ${JSON.stringify(customer).replace(/'/g, "&#39;")})'
            >

              <td>
                <strong>
                  ${escapeHtml(
                    customer.full_name ||
                    "—"
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  customer.mobile ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  customer.email ||
                  "—"
                )}
              </td>

              <td>
                ${shortDate(
                  customer.created_at
                )}
              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}


/* =====================================================
   APPLICATIONS
===================================================== */

async function loadApplications(container) {

  const data =
    await apiRequest(
      "/api/admin/report/applications"
    );


  const applications =
    data.data || [];


  crmCache.applications =
    applications;


  if (!applications.length) {

    container.innerHTML = `
      <div class="crm-empty-state">
        No applications found.
      </div>
    `;

    return;
  }


  container.innerHTML = `

    <div class="crm-module-toolbar">

      <strong>
        ${applications.length} Applications
      </strong>

      <span>
        Click an application to view details
      </span>

    </div>


    <div class="crm-table-wrap">

      <table class="crm-module-table">

        <thead>

          <tr>
            <th>APPLICATION ID</th>
            <th>CUSTOMER</th>
            <th>MOBILE</th>
            <th>AMOUNT</th>
            <th>STATUS</th>
            <th>DATE</th>
          </tr>

        </thead>


        <tbody>

          ${applications.map(app => `

            <tr
              class="crm-table-clickable"
              onclick='openCRMRecord("application", ${JSON.stringify(app).replace(/'/g, "&#39;")})'
            >

              <td>
                <strong>
                  ${escapeHtml(
                    app.application_id ||
                    app.id ||
                    "—"
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  app.full_name ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  app.mobile ||
                  "—"
                )}
              </td>

              <td>
                ${money(
                  app.requested_amount
                )}
              </td>

              <td>
                <span class="crm-status">
                  ${escapeHtml(
                    String(
                      app.status ||
                      "submitted"
                    ).replace(
                      /_/g,
                      " "
                    )
                  )}
                </span>
              </td>

              <td>
                ${shortDate(
                  app.created_at
                )}
              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}


/* =====================================================
   LOANS
===================================================== */

async function loadLoans(container) {

  const data =
    await apiRequest(
      "/api/admin/report/loans"
    );


  const loans =
    data.data || [];


  crmCache.loans =
    loans;


  if (!loans.length) {

    container.innerHTML = `
      <div class="crm-empty-state">
        No loan accounts found.
      </div>
    `;

    return;
  }


  container.innerHTML = `

    <div class="crm-module-toolbar">

      <strong>
        ${loans.length} Loan Accounts
      </strong>

      <span>
        Click a loan to view details
      </span>

    </div>


    <div class="crm-table-wrap">

      <table class="crm-module-table">

        <thead>

          <tr>
            <th>LOAN ACCOUNT</th>
            <th>APPLICATION</th>
            <th>PRINCIPAL</th>
            <th>EMI</th>
            <th>STATUS</th>
          </tr>

        </thead>


        <tbody>

          ${loans.map(loan => `

            <tr
              class="crm-table-clickable"
              onclick='openCRMRecord("loan", ${JSON.stringify(loan).replace(/'/g, "&#39;")})'
            >

              <td>
                <strong>
                  ${escapeHtml(
                    loan.loan_account_no ||
                    "—"
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  loan.application_id ||
                  "—"
                )}
              </td>

              <td>
                ${money(
                  loan.principal
                )}
              </td>

              <td>
                ${money(
                  loan.emi
                )}
              </td>

              <td>
                <span class="crm-status">
                  ${escapeHtml(
                    loan.status ||
                    "—"
                  )}
                </span>
              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}


/* =====================================================
   PAYMENTS / COLLECTIONS
===================================================== */

async function loadPayments(container) {

  const result =
    await apiRequest(
      "/api/admin/report/payments"
    );


  const payments =
    result.data || [];


  crmCache.payments =
    payments;


  const total =
    payments.reduce(
      (sum, payment) =>
        sum + Number(
          payment.amount ??
          payment.payment_amount ??
          payment.paid_amount ??
          0
        ),
      0
    );


  if (!payments.length) {

    container.innerHTML = `

      <div class="crm-collection-summary">

        <div>
          <span>Total Collection</span>
          <strong>${money(total)}</strong>
        </div>

        <div>
          <span>Transactions</span>
          <strong>0</strong>
        </div>

      </div>

      <div class="crm-empty-state">
        No payment transactions found.
      </div>
    `;

    return;
  }


  container.innerHTML = `

    <div class="crm-collection-summary">

      <div>
        <span>Total Collection</span>
        <strong>${money(total)}</strong>
      </div>

      <div>
        <span>Transactions</span>
        <strong>${payments.length}</strong>
      </div>

    </div>


    <div class="crm-module-toolbar">

      <strong>
        Payment History
      </strong>

      <span>
        Click a payment to view details
      </span>

    </div>


    <div class="crm-table-wrap">

      <table class="crm-module-table">

        <thead>

          <tr>
            <th>PAYMENT</th>
            <th>LOAN ACCOUNT</th>
            <th>AMOUNT</th>
            <th>DATE</th>
            <th>STATUS</th>
          </tr>

        </thead>


        <tbody>

          ${payments.map(payment => `

            <tr
              class="crm-table-clickable"
              onclick='openCRMRecord("payment", ${JSON.stringify(payment).replace(/'/g, "&#39;")})'
            >

              <td>
                <strong>
                  ${escapeHtml(
                    payment.payment_id ||
                    payment.id ||
                    "Payment"
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  payment.loan_account_no ||
                  payment.loan_id ||
                  payment.loan_account ||
                  "—"
                )}
              </td>

              <td>
                <strong>
                  ${money(
                    payment.amount ??
                    payment.payment_amount ??
                    payment.paid_amount
                  )}
                </strong>
              </td>

              <td>
                ${dateValue(
                  payment.payment_date ||
                  payment.created_at ||
                  payment.paid_at
                )}
              </td>

              <td>
                <span class="crm-status">
                  ${escapeHtml(
                    payment.status ||
                    payment.payment_status ||
                    "paid"
                  )}
                </span>
              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}


/* =====================================================
   INQUIRIES
===================================================== */

async function loadInquiries(container) {

  const result =
    await apiRequest(
      "/api/admin/report/inquiries"
    );


  const inquiries =
    result.data || [];


  crmCache.inquiries =
    inquiries;


  if (!inquiries.length) {

    container.innerHTML = `
      <div class="crm-empty-state">
        No eligibility inquiries found.
      </div>
    `;

    return;
  }


  container.innerHTML = `

    <div class="crm-module-toolbar">

      <strong>
        ${inquiries.length} Inquiries
      </strong>

    </div>


    <div class="crm-table-wrap">

      <table class="crm-module-table">

        <thead>

          <tr>
            <th>INQUIRY</th>
            <th>NAME</th>
            <th>MOBILE</th>
            <th>AMOUNT</th>
            <th>ELIGIBILITY</th>
          </tr>

        </thead>


        <tbody>

          ${inquiries.map(item => `

            <tr
              class="crm-table-clickable"
              onclick='openCRMRecord("inquiry", ${JSON.stringify(item).replace(/'/g, "&#39;")})'
            >

              <td>
                ${escapeHtml(
                  item.inquiry_id ||
                  item.id ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.full_name ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.mobile ||
                  "—"
                )}
              </td>

              <td>
                ${money(
                  item.requested_amount
                )}
              </td>

              <td>
                <span class="crm-status">
                  ${escapeHtml(
                    item.eligibility_status ||
                    "—"
                  )}
                </span>
              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}


/* =====================================================
   REPORTS
===================================================== */

function renderReports(container) {

  const reports = [
    ["customers", "Customers"],
    ["applications", "Applications"],
    ["loans", "Loan Portfolio"],
    ["payments", "Payments"],
    ["inquiries", "Eligibility Inquiries"]
  ];


  container.innerHTML = `

    <div class="report-grid">

      ${reports.map(report => `

        <div class="report-card">

          <div>
            <span>CRM REPORT</span>
            <h3>${report[1]}</h3>
          </div>

          <button
            onclick="downloadCRMReport('${report[0]}')"
          >
            Download CSV
          </button>

        </div>

      `).join("")}

    </div>
  `;
}


async function downloadCRMReport(type) {

  try {

    const result =
      await apiRequest(
        `/api/admin/report/${type}`
      );


    const rows =
      result.data || [];


    if (!rows.length) {

      showToast(
        "No data available for this report.",
        "error"
      );

      return;
    }


    const headers =
      Object.keys(rows[0]);


    const csv = [

      headers.join(","),

      ...rows.map(row =>
        headers.map(header => {

          const value =
            row[header] ?? "";

          return `"${String(value)
            .replace(/"/g, '""')}"`;

        }).join(",")
      )

    ].join("\n");


    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;"
        }
      );


    const url =
      URL.createObjectURL(blob);


    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `shyam-fincorp-${type}-report.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);


    showToast(
      "Report downloaded."
    );

  } catch (error) {

    showToast(
      error.message ||
      "Report download failed.",
      "error"
    );
  }
}


/* =====================================================
   SEARCH
===================================================== */

async function performCRMSearch() {

  const input =
    $("globalSearch");

  const q =
    String(
      input?.value || ""
    ).trim();


  if (!q) {

    showToast(
      "Enter a customer, application or loan.",
      "error"
    );

    return;
  }


  try {

    const data =
      await apiRequest(
        `/api/admin/search?q=${encodeURIComponent(q)}`
      );


    showSearchResults(data);

  } catch (error) {

    showToast(
      error.message ||
      "Search failed.",
      "error"
    );
  }
}


function showSearchResults(data) {

  const customers =
    data.customers || [];

  const applications =
    data.applications || [];

  const loans =
    data.loans || [];


  let modal =
    document.getElementById(
      "crmSearchModal"
    );


  if (!modal) {

    modal =
      document.createElement("div");

    modal.id =
      "crmSearchModal";

    modal.className =
      "crm-modal";

    document.body.appendChild(modal);
  }


  modal.innerHTML = `

    <div
      class="crm-modal-overlay"
      onclick="closeCRMSearchModal()"
    ></div>

    <div class="crm-modal-box">

      <div class="crm-modal-header">

        <div>
          <span>CRM SEARCH</span>
          <h2>
            Search Results
          </h2>
        </div>

        <button
          onclick="closeCRMSearchModal()"
        >
          ×
        </button>

      </div>


      <div class="crm-modal-body">


        <div class="crm-search-section">

          <h3>
            Customers (${customers.length})
          </h3>

          ${
            customers.length
              ? customers.map(item => `
                <div
                  class="crm-search-result-row"
                  onclick='openCRMRecord("customer", ${JSON.stringify(item).replace(/'/g, "&#39;")})'
                >
                  <strong>
                    ${escapeHtml(
                      item.full_name ||
                      "Customer"
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      item.mobile ||
                      "—"
                    )}
                  </span>
                </div>
              `).join("")
              : `<div class="crm-no-result">No customers</div>`
          }

        </div>


        <div class="crm-search-section">

          <h3>
            Applications (${applications.length})
          </h3>

          ${
            applications.length
              ? applications.map(item => `
                <div
                  class="crm-search-result-row"
                  onclick='openCRMRecord("application", ${JSON.stringify(item).replace(/'/g, "&#39;")})'
                >
                  <strong>
                    ${escapeHtml(
                      item.application_id ||
                      item.id ||
                      "Application"
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      item.full_name ||
                      "—"
                    )}
                  </span>
                </div>
              `).join("")
              : `<div class="crm-no-result">No applications</div>`
          }

        </div>


        <div class="crm-search-section">

          <h3>
            Loan Accounts (${loans.length})
          </h3>

          ${
            loans.length
              ? loans.map(item => `
                <div
                  class="crm-search-result-row"
                  onclick='openCRMRecord("loan", ${JSON.stringify(item).replace(/'/g, "&#39;")})'
                >
                  <strong>
                    ${escapeHtml(
                      item.loan_account_no ||
                      "Loan"
                    )}
                  </strong>

                  <span>
                    ${money(
                      item.principal
                    )}
                  </span>
                </div>
              `).join("")
              : `<div class="crm-no-result">No loans</div>`
          }

        </div>


      </div>

    </div>
  `;


  modal.classList.add("show");
}


function closeCRMSearchModal() {

  document
    .getElementById(
      "crmSearchModal"
    )
    ?.classList.remove("show");
}


/* =====================================================
   DETAIL MODAL
===================================================== */

function openCRMRecord(type, record) {

  let modal =
    document.getElementById(
      "crmDetailModal"
    );


  if (!modal) {

    modal =
      document.createElement("div");

    modal.id =
      "crmDetailModal";

    modal.className =
      "crm-modal";

    document.body.appendChild(modal);
  }


  const titleMap = {
    customer: "Customer Details",
    application: "Loan Application",
    loan: "Loan Account",
    payment: "Payment Details",
    inquiry: "Eligibility Inquiry"
  };


  const title =
    titleMap[type] ||
    "CRM Details";


  let fields = [];


  if (type === "customer") {

    fields = [

      ["Customer Name", record.full_name],

      ["Mobile", record.mobile],

      ["Email", record.email],

      ["Customer ID", record.id],

      ["Created", dateValue(record.created_at)]

    ];

  }


  else if (type === "application") {

    fields = [

      ["Application ID", record.application_id],

      ["Customer Name", record.full_name],

      ["Mobile", record.mobile],

      ["Email", record.email],

      ["Monthly Income", money(record.monthly_income)],

      ["Requested Amount", money(record.requested_amount)],

      ["Tenure", record.tenure_months ? `${record.tenure_months} months` : "—"],

      ["Status", record.status],

      ["Address", record.address],

      ["City", record.city],

      ["Pincode", record.pincode],

      ["Created", dateValue(record.created_at)]

    ];

  }


  else if (type === "loan") {

    fields = [

      ["Loan Account", record.loan_account_no],

      ["Application ID", record.application_id],

      ["Customer ID", record.customer_id],

      ["Principal", money(record.principal)],

      ["Interest Rate", record.annual_interest_rate != null
        ? `${record.annual_interest_rate}%`
        : "—"
      ],

      ["Tenure", record.tenure_months
        ? `${record.tenure_months} months`
        : "—"
      ],

      ["EMI", money(record.emi)],

      ["Outstanding", record.outstanding_amount != null
        ? money(record.outstanding_amount)
        : "—"
      ],

      ["Status", record.status],

      ["Disbursed", dateValue(record.disbursed_at)]

    ];

  }


  else if (type === "payment") {

    fields = [

      ["Payment ID", record.payment_id || record.id],

      ["Loan Account",
        record.loan_account_no ||
        record.loan_id ||
        record.loan_account
      ],

      ["Amount",
        money(
          record.amount ??
          record.payment_amount ??
          record.paid_amount
        )
      ],

      ["Payment Date",
        dateValue(
          record.payment_date ||
          record.created_at ||
          record.paid_at
        )
      ],

      ["Payment Method",
        record.payment_method ||
        record.method
      ],

      ["Status",
        record.status ||
        record.payment_status
      ],

      ["Reference",
        record.reference_no ||
        record.transaction_id ||
        record.reference
      ]

    ];

  }


  else if (type === "inquiry") {

    fields = [

      ["Inquiry ID", record.inquiry_id],

      ["Name", record.full_name],

      ["Mobile", record.mobile],

      ["Email", record.email],

      ["Age", record.age],

      ["Employment", record.employment_type],

      ["Monthly Income", money(record.monthly_income)],

      ["Existing EMI", money(record.existing_emi)],

      ["Requested Amount", money(record.requested_amount)],

      ["Tenure", record.tenure_months
        ? `${record.tenure_months} months`
        : "—"
      ],

      ["Estimated Rate",
        record.estimated_interest_rate != null
          ? `${record.estimated_interest_rate}%`
          : "—"
      ],

      ["Estimated EMI",
        money(record.estimated_emi)
      ],

      ["Eligibility",
        record.eligibility_status
      ],

      ["Reason",
        record.eligibility_reason
      ]

    ];

  }


  modal.innerHTML = `

    <div
      class="crm-modal-overlay"
      onclick="closeCRMDetailModal()"
    ></div>


    <div class="crm-modal-box crm-detail-box">


      <div class="crm-modal-header">

        <div>

          <span>
            SHYAM FINCORP CRM
          </span>

          <h2>
            ${escapeHtml(title)}
          </h2>

        </div>


        <button
          onclick="closeCRMDetailModal()"
          class="crm-modal-close"
        >
          ×
        </button>

      </div>


      <div class="crm-detail-grid">

        ${fields.map(field => `

          <div class="crm-detail-item">

            <span>
              ${escapeHtml(field[0])}
            </span>

            <strong>
              ${escapeHtml(
                field[1] ??
                "—"
              )}
            </strong>

          </div>

        `).join("")}

      </div>


    </div>
  `;


  modal.classList.add("show");
}


function closeCRMDetailModal() {

  document
    .getElementById(
      "crmDetailModal"
    )
    ?.classList.remove("show");
}


/* =====================================================
   COMING SOON
===================================================== */

function renderComingSoon(container, page) {

  const title =
    pageData[page]?.title ||
    "CRM Module";


  container.innerHTML = `

    <div class="crm-feature-card">

      <div class="crm-feature-icon">
        ◈
      </div>

      <h3>
        ${escapeHtml(title)}
      </h3>

      <p>
        This module is ready for CRM integration.
      </p>

    </div>
  `;
}


/* =====================================================
   MOBILE MENU
===================================================== */

function toggleMobileMenu() {

  document
    .querySelector(".crm-sidebar")
    ?.classList.toggle(
      "mobile-open"
    );
}


/* =====================================================
   INIT
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    if (!requireLogin()) {
      return;
    }


    loadAdminName();


    document
      .querySelectorAll(".nav-item")
      .forEach(item => {

        item.addEventListener(
          "click",
          () => {

            showPage(
              item.dataset.page
            );

          }
        );

      });


    document
      .querySelectorAll("[data-page-link]")
      .forEach(item => {

        item.addEventListener(
          "click",
          () => {

            showPage(
              item.dataset.pageLink
            );

          }
        );

      });


    $("logoutBtn")
      ?.addEventListener(
        "click",
        logoutAdmin
      );


    $("mobileMenu")
      ?.addEventListener(
        "click",
        toggleMobileMenu
      );


    $("searchButton")
      ?.addEventListener(
        "click",
        performCRMSearch
      );


    $("globalSearch")
      ?.addEventListener(
        "keydown",
        event => {

          if (event.key === "Enter") {
            performCRMSearch();
          }

        }
      );


    $("newApplicationBtn")
      ?.addEventListener(
        "click",
        () => {

          showToast(
            "New application module will be connected next."
          );

        }
      );


    await loadPremiumCRMDashboard();

  }
);
