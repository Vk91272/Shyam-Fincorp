const API_BASE = "https://shyam-fincorp.onrender.com";

const TOKEN_KEY = "shyam_admin_token";
const USER_KEY = "shyam_admin_user";

function $(id) {
  return document.getElementById(id);
}

/* =========================================================
   PAGE DATA
========================================================= */

const pageData = {
  overview: {
    title: "Business Overview",
    subtitle: "Complete lending operations at a glance."
  },

  customers: {
    title: "Customer Management",
    subtitle: "Search and manage customer profiles."
  },

  applications: {
    title: "Loan Applications",
    subtitle: "Review customer loan applications."
  },

  loans: {
    title: "Loan Portfolio",
    subtitle: "Monitor active and closed loan accounts."
  },

  collections: {
    title: "Collection Center",
    subtitle: "Monitor EMI collections and repayment."
  },

  emi: {
    title: "EMI Center",
    subtitle: "Track today's dues and overdue EMIs."
  },

  documents: {
    title: "Document Verification",
    subtitle: "Review KYC and income documents."
  },

  inquiries: {
    title: "Eligibility Inquiries",
    subtitle: "Review preliminary eligibility inquiries."
  },

  followups: {
    title: "Customer Follow-ups",
    subtitle: "Manage customer communication."
  },

  reports: {
    title: "Reports & Analytics",
    subtitle: "Generate and download business reports."
  }
};


/* =========================================================
   AUTH
========================================================= */

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function isLoggedIn() {
  return Boolean(getToken());
}

function authHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = "crm-login.html";
    return false;
  }

  return true;
}


/* =========================================================
   ADMIN LOGIN
========================================================= */

async function adminLogin(username, password) {

  try {

    const response = await fetch(
      `${API_BASE}/api/admin/login`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          username,
          password
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {

      throw new Error(
        data.error ||
        "Invalid username or password"
      );
    }

    if (!data.token) {

      throw new Error(
        "Login token was not received"
      );
    }

    localStorage.setItem(
      TOKEN_KEY,
      data.token
    );

    localStorage.setItem(
      USER_KEY,
      username
    );

    return {
      success: true
    };

  } catch (error) {

    console.error(
      "Admin login error:",
      error
    );

    return {
      success: false,
      error: error.message
    };
  }
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

  const confirmLogout =
    confirm(
      "Do you want to logout from Shyam Fincorp CRM?"
    );

  if (!confirmLogout) {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(
    "shyam_admin_authenticated"
  );

  window.location.href =
    "crm-login.html";
}


/* =========================================================
   API REQUEST HELPER
========================================================= */

async function apiRequest(
  url,
  options = {}
) {

  const response =
    await fetch(
      url,
      {
        ...options,

        headers: {
          ...authHeaders(),
          ...(options.headers || {})
        }
      }
    );

  if (response.status === 401) {

    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      USER_KEY
    );

    window.location.href =
      "crm-login.html";

    throw new Error(
      "CRM session expired"
    );
  }

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data.error ||
      "Request failed"
    );
  }

  return data;
}


/* =========================================================
   CRM PAGE NAVIGATION
========================================================= */

function openCRMPage(page) {

  document
    .querySelectorAll(".crm-nav")
    .forEach((button) => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });

  const overview =
    $("overviewPage");

  const generic =
    $("genericPage");

  if (!overview || !generic) {
    return;
  }

  if (page === "overview") {

    overview.classList.add(
      "active"
    );

    generic.classList.remove(
      "active"
    );

  } else {

    overview.classList.remove(
      "active"
    );

    generic.classList.add(
      "active"
    );

    const data =
      pageData[page] ||
      pageData.overview;

    $("genericTitle").textContent =
      data.title;

    $("genericText").textContent =
      data.subtitle;

    renderPageContent(page);
  }

  const data =
    pageData[page] ||
    pageData.overview;

  $("pageTitle").textContent =
    data.title;

  $("pageSubtitle").textContent =
    data.subtitle;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   GENERIC PAGE CONTENT
========================================================= */

function renderPageContent(page) {

  const container =
    $("genericContent");

  if (!container) {
    return;
  }

  if (page === "customers") {

    container.innerHTML = `
      <div class="crm-feature-card">
        <div class="feature-icon">👥</div>
        <h3>Customer Intelligence</h3>
        <p>
          Search customers by name or mobile number
          using the live CRM database.
        </p>
        <button
          class="crm-action-btn"
          onclick="focusGlobalSearch()">
          Search Customer
        </button>
      </div>
    `;

    return;
  }


  if (page === "applications") {

    container.innerHTML = `
      <div class="crm-feature-card">
        <div class="feature-icon">📄</div>
        <h3>Application Management</h3>
        <p>
          Search application ID, customer name
          or mobile number.
        </p>
        <button
          class="crm-action-btn"
          onclick="focusGlobalSearch()">
          Find Application
        </button>
      </div>
    `;

    return;
  }


  if (page === "loans") {

    container.innerHTML = `
      <div class="crm-feature-card">
        <div class="feature-icon">💰</div>
        <h3>Loan Portfolio</h3>
        <p>
          Search loan accounts and monitor
          portfolio information.
        </p>
        <button
          class="crm-action-btn"
          onclick="focusGlobalSearch()">
          Search Loan
        </button>
      </div>
    `;

    return;
  }


  if (page === "reports") {

    container.innerHTML = `
      <div class="report-grid">

        <div class="report-card">
          <div class="report-icon">📄</div>
          <h3>Applications Report</h3>
          <p>Download complete loan application data.</p>
          <button onclick="downloadReport('applications')">
            Download CSV
          </button>
        </div>

        <div class="report-card">
          <div class="report-icon">👥</div>
          <h3>Customers Report</h3>
          <p>Download customer database report.</p>
          <button onclick="downloadReport('customers')">
            Download CSV
          </button>
        </div>

        <div class="report-card">
          <div class="report-icon">💰</div>
          <h3>Loans Report</h3>
          <p>Download loan portfolio report.</p>
          <button onclick="downloadReport('loans')">
            Download CSV
          </button>
        </div>

        <div class="report-card">
          <div class="report-icon">💳</div>
          <h3>Payments Report</h3>
          <p>Download EMI payment records.</p>
          <button onclick="downloadReport('payments')">
            Download CSV
          </button>
        </div>

        <div class="report-card">
          <div class="report-icon">🔎</div>
          <h3>Inquiry Report</h3>
          <p>Download eligibility inquiries.</p>
          <button onclick="downloadReport('inquiries')">
            Download CSV
          </button>
        </div>

      </div>
    `;

    return;
  }


  if (page === "inquiries") {

    container.innerHTML = `
      <div class="crm-feature-card">
        <div class="feature-icon">🔎</div>
        <h3>Eligibility Inquiry Center</h3>
        <p>
          Review preliminary eligibility inquiries
          received from customers.
        </p>

        <button
          class="crm-action-btn"
          onclick="loadInquiries()">
          Load Latest Inquiries
        </button>

        <div
          id="inquiryResults"
          class="crm-results">
        </div>
      </div>
    `;

    return;
  }


  if (page === "documents") {

    container.innerHTML = `
      <div class="crm-feature-card">
        <div class="feature-icon">📁</div>
        <h3>Document Verification</h3>
        <p>
          Manage KYC, identity, address and
          income verification workflows.
        </p>
      </div>
    `;

    return;
  }


  if (page === "collections") {

    container.innerHTML = `
      <div class="crm-feature-card">
        <div class="feature-icon">📥</div>
        <h3>Collection Center</h3>
        <p>
          Track collections, repayment activity
          and outstanding amounts.
        </p>
      </div>
    `;

    return;
  }


  if (page === "emi") {

    container.innerHTML = `
      <div class="crm-feature-card">
        <div class="feature-icon">📅</div>
        <h3>EMI Command Center</h3>
        <p>
          Monitor upcoming EMI dues,
          payments and overdue accounts.
        </p>
      </div>
    `;

    return;
  }


  if (page === "followups") {

    container.innerHTML = `
      <div class="crm-feature-card">
        <div class="feature-icon">📞</div>
        <h3>Customer Follow-ups</h3>
        <p>
          Organize customer callbacks,
          reminders and communication.
        </p>
      </div>
    `;

    return;
  }
}


/* =========================================================
   GLOBAL SEARCH
========================================================= */

function focusGlobalSearch() {

  const input =
    $("globalSearch");

  if (!input) {
    return;
  }

  input.focus();

  input.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}


async function performCRMSearch() {

  const input =
    $("globalSearch");

  if (!input) {
    return;
  }

  const value =
    input.value.trim();

  if (!value) {
    return;
  }

  const searchButton =
    $("searchButton");

  if (searchButton) {
    searchButton.disabled = true;
    searchButton.textContent =
      "Searching...";
  }

  try {

    const data =
      await apiRequest(
        `${API_BASE}/api/admin/search?q=${encodeURIComponent(value)}`
      );

    showSearchResults(data);

  } catch (error) {

    showCRMToast(
      error.message,
      "error"
    );

  } finally {

    if (searchButton) {
      searchButton.disabled = false;
      searchButton.textContent =
        "Search";
    }
  }
}


/* =========================================================
   SEARCH RESULTS
========================================================= */

function showSearchResults(data) {

  let html = `
    <div class="search-results-panel">

      <div class="search-results-header">
        <div>
          <span class="eyebrow">CRM SEARCH</span>
          <h3>Search Results</h3>
        </div>

        <button
          onclick="closeSearchResults()"
          class="close-results">
          ×
        </button>
      </div>
  `;


  const customers =
    data.customers || [];

  const applications =
    data.applications || [];

  const loans =
    data.loans || [];


  html += `
    <div class="search-section">
      <h4>
        👥 Customers
        <span>${customers.length}</span>
      </h4>
  `;

  if (!customers.length) {

    html += `
      <p class="empty-search">
        No customers found.
      </p>
    `;

  } else {

    customers.forEach(
      (customer) => {

        html += `
          <div class="search-result-row">

            <div>
              <strong>
                ${escapeHTML(
                  customer.full_name ||
                  "Unnamed Customer"
                )}
              </strong>

              <small>
                ${escapeHTML(
                  customer.mobile ||
                  "-"
                )}
              </small>
            </div>

            <span class="result-badge">
              Customer
            </span>

          </div>
        `;
      }
    );
  }

  html += `</div>`;


  html += `
    <div class="search-section">
      <h4>
        📄 Applications
        <span>${applications.length}</span>
      </h4>
  `;

  if (!applications.length) {

    html += `
      <p class="empty-search">
        No applications found.
      </p>
    `;

  } else {

    applications.forEach(
      (application) => {

        html += `
          <div class="search-result-row">

            <div>

              <strong>
                ${escapeHTML(
                  application.application_id ||
                  "-"
                )}
              </strong>

              <small>
                ${escapeHTML(
                  application.full_name ||
                  "-"
                )}
                ·
                ${escapeHTML(
                  application.mobile ||
                  "-"
                )}
              </small>

            </div>

            <span class="result-badge">
              ${escapeHTML(
                application.status ||
                "submitted"
              )}
            </span>

          </div>
        `;
      }
    );
  }

  html += `</div>`;


  html += `
    <div class="search-section">
      <h4>
        💰 Loans
        <span>${loans.length}</span>
      </h4>
  `;

  if (!loans.length) {

    html += `
      <p class="empty-search">
        No loans found.
      </p>
    `;

  } else {

    loans.forEach(
      (loan) => {

        html += `
          <div class="search-result-row">

            <div>

              <strong>
                ${escapeHTML(
                  loan.loan_account_no ||
                  "-"
                )}
              </strong>

              <small>
                ${escapeHTML(
                  loan.status ||
                  "-"
                )}
              </small>

            </div>

            <span class="result-badge">
              Loan
            </span>

          </div>
        `;
      }
    );
  }

  html += `
      </div>
    </div>
  `;


  let existing =
    $("searchResults");

  if (!existing) {

    existing =
      document.createElement("div");

    existing.id =
      "searchResults";

    document.body.appendChild(
      existing
    );
  }

  existing.innerHTML =
    html;
}


function closeSearchResults() {

  const results =
    $("searchResults");

  if (results) {
    results.innerHTML = "";
  }
}


/* =========================================================
   INQUIRIES
========================================================= */

async function loadInquiries() {

  const resultBox =
    $("inquiryResults");

  if (!resultBox) {
    return;
  }

  resultBox.innerHTML =
    "<p>Loading inquiries...</p>";

  try {

    const data =
      await apiRequest(
        `${API_BASE}/api/admin/inquiries`
      );

    const inquiries =
      data.data ||
      data.inquiries ||
      [];

    if (!inquiries.length) {

      resultBox.innerHTML =
        "<p>No inquiries found.</p>";

      return;
    }

    resultBox.innerHTML =
      inquiries
        .slice(0, 20)
        .map(
          (item) => `
            <div class="crm-result-item">

              <strong>
                ${escapeHTML(
                  item.inquiry_id ||
                  "-"
                )}
              </strong>

              <span>
                ${escapeHTML(
                  item.full_name ||
                  "-"
                )}
              </span>

              <span>
                ${escapeHTML(
                  item.mobile ||
                  "-"
                )}
              </span>

              <span>
                ${escapeHTML(
                  item.eligibility_status ||
                  "-"
                )}
              </span>

            </div>
          `
        )
        .join("");

  } catch (error) {

    resultBox.innerHTML = `
      <p class="error-text">
        ${escapeHTML(
          error.message
        )}
      </p>
    `;
  }
}


/* =========================================================
   REPORT DOWNLOAD
========================================================= */

async function downloadReport(type) {

  try {

    showCRMToast(
      "Preparing report...",
      "info"
    );

    const data =
      await apiRequest(
        `${API_BASE}/api/admin/report/${type}`
      );

    const rows =
      data.data || [];

    if (!rows.length) {

      showCRMToast(
        "No data available for this report.",
        "error"
      );

      return;
    }

    const csv =
      convertToCSV(rows);

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
      `shyam-fincorp-${type}-report-${formatDateForFile()}.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    showCRMToast(
      "Report downloaded successfully.",
      "success"
    );

  } catch (error) {

    showCRMToast(
      error.message,
      "error"
    );
  }
}


function convertToCSV(rows) {

  const columns =
    Array.from(
      new Set(
        rows.flatMap(
          (row) =>
            Object.keys(row)
        )
      )
    );

  const header =
    columns
      .map(csvEscape)
      .join(",");

  const body =
    rows
      .map(
        (row) =>
          columns
            .map(
              (column) =>
                csvEscape(
                  row[column]
                )
            )
            .join(",")
      )
      .join("\n");

  return `${header}\n${body}`;
}


function csvEscape(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const stringValue =
    String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {

    return `"${stringValue.replace(
      /"/g,
      '""'
    )}"`;
  }

  return stringValue;
}


function formatDateForFile() {

  const date =
    new Date();

  return date
    .toISOString()
    .slice(0, 10);
}


/* =========================================================
   TOAST
========================================================= */

function showCRMToast(
  message,
  type = "info"
) {

  let toast =
    $("crmToast");

  if (!toast) {

    toast =
      document.createElement(
        "div"
      );

    toast.id =
      "crmToast";

    document.body.appendChild(
      toast
    );
  }

  toast.className =
    `crm-toast ${type}`;

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  setTimeout(() => {

    toast.classList.remove(
      "show"
    );

  }, 3200);
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

  document
    .querySelectorAll(".crm-nav")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          openCRMPage(
            button.dataset.page
          );

        }
      );

    });


  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach((button) => {

      if (
        button.classList.contains(
          "crm-nav"
        )
      ) {
        return;
      }

      button.addEventListener(
        "click",
        () => {

          openCRMPage(
            button.dataset.page
          );

        }
      );

    });
}


/* =========================================================
   REFRESH
========================================================= */

function setupRefresh() {

  const button =
    $("refreshBtn");

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    async () => {

      const oldText =
        button.textContent;

      button.textContent =
        "↻ Refreshing...";

      button.disabled =
        true;

      try {

        await loadCRMData();

        showCRMToast(
          "CRM refreshed successfully.",
          "success"
        );

      } catch (error) {

        showCRMToast(
          "Refresh failed.",
          "error"
        );

      } finally {

        setTimeout(() => {

          button.textContent =
            oldText;

          button.disabled =
            false;

        }, 500);
      }
    }
  );
}


/* =========================================================
   GLOBAL SEARCH EVENTS
========================================================= */

function setupSearch() {

  const input =
    $("globalSearch");

  if (!input) {
    return;
  }

  input.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        performCRMSearch();
      }

    }
  );
}


/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {

  const button =
    $("mobileMenu");

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    () => {

      const sidebar =
        document.querySelector(
          ".crm-sidebar"
        );

      if (sidebar) {

        sidebar.classList.toggle(
          "open"
        );
      }
    }
  );
}


/* =========================================================
   NEW APPLICATION
========================================================= */

function setupNewApplication() {

  const button =
    $("newApplicationBtn");

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    () => {

      window.location.href =
        "index.html#apply";

    }
  );
}


/* =========================================================
   LOGOUT BUTTON
========================================================= */

function setupLogout() {

  const button =
    $("logoutBtn");

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    logout
  );
}


/* =========================================================
   LIVE CRM DATA
========================================================= */

async function loadCRMData() {

  if (!isLoggedIn()) {
    return;
  }

  try {

    const data =
      await apiRequest(
        `${API_BASE}/api/admin/inquiries`
      );

    console.log(
      "Live CRM inquiry data:",
      data
    );

  } catch (error) {

    console.log(
      "CRM data loading:",
      error.message
    );
  }
}


/* =========================================================
   ADMIN PROFILE
========================================================= */

function loadAdminProfile() {

  const username =
    localStorage.getItem(
      USER_KEY
    ) || "Admin";

  document
    .querySelectorAll(
      "[data-admin-name]"
    )
    .forEach(
      (element) => {

        element.textContent =
          username;

      }
    );
}


/* =========================================================
   INITIALIZE CRM
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    if (!requireLogin()) {
      return;
    }

    loadAdminProfile();

    setupNavigation();

    setupRefresh();

    setupSearch();

    setupMobileMenu();

    setupNewApplication();

    setupLogout();

    openCRMPage(
      "overview"
    );

    loadCRMData();

  }
);
