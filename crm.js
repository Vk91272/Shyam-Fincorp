const API_BASE =
  "https://shyam-fincorp.onrender.com";

const TOKEN_KEY =
  "shyam_admin_token";

const USER_KEY =
  "shyam_admin_user";


/* =====================================================
   HELPERS
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

  return Number(value || 0)
    .toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    });
}


function showToast(message) {

  const old =
    document.querySelector(".crm-toast");

  if (old) {
    old.remove();
  }

  const toast =
    document.createElement("div");

  toast.className =
    "crm-toast";

  toast.textContent =
    message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}


/* =====================================================
   LOGIN
===================================================== */

function requireLogin() {

  const token =
    localStorage.getItem(
      TOKEN_KEY
    );

  if (!token) {

    window.location.href =
      "crm-login.html";

    return false;
  }

  return true;
}


/* =====================================================
   LOGOUT
===================================================== */

function logoutAdmin() {

  localStorage.removeItem(
    TOKEN_KEY
  );

  localStorage.removeItem(
    USER_KEY
  );

  localStorage.removeItem(
    "admin_key"
  );

  window.location.href =
    "crm-login.html";
}


/* =====================================================
   API
===================================================== */

async function apiRequest(
  url,
  options = {}
) {

  const token =
    localStorage.getItem(
      TOKEN_KEY
    );

  const headers = {

    "Content-Type":
      "application/json",

    ...(options.headers || {})

  };


  if (token) {

    headers.Authorization =
      `Bearer ${token}`;

  }


  const response =
    await fetch(
      API_BASE + url,
      {
        ...options,
        headers
      }
    );


  if (
    response.status === 401
  ) {

    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      USER_KEY
    );

    window.location.href =
      "crm-login.html";

    throw new Error(
      "Session expired"
    );

  }


  let data = {};

  try {

    data =
      await response.json();

  } catch {

    data = {};

  }


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Request failed"
    );

  }


  return data;
}


/* =====================================================
   PAGE CONFIG
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

function showPage(page) {

  const data =
    pageData[page] ||
    pageData.overview;


  const overview =
    $("overviewPage");

  const generic =
    $("genericPage");


  if (overview) {

    overview.classList.remove(
      "active"
    );

  }


  if (generic) {

    generic.classList.remove(
      "active"
    );

  }


  if (page === "overview") {

    if (overview) {

      overview.classList.add(
        "active"
      );

    }


    loadPremiumCRMDashboard();

  } else {

    if (generic) {

      generic.classList.add(
        "active"
      );

    }

    renderPageContent(page);

  }


  if ($("pageTitle")) {

    $("pageTitle").textContent =
      data.title;

  }


  if ($("pageSubtitle")) {

    $("pageSubtitle").textContent =
      data.subtitle;

  }


  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });


  closeMobileMenu();

}


/* =====================================================
   MODULE CONTENT
===================================================== */

async function renderPageContent(page) {

  const container =
    $("genericContent");


  if (!container) {
    return;
  }


  container.innerHTML = `
    <div class="crm-feature-card">
      <p>Loading...</p>
    </div>
  `;


  try {

    if (page === "customers") {

      await loadCustomers(
        container
      );

    }

    else if (
      page === "applications"
    ) {

      await loadApplications(
        container
      );

    }

    else if (
      page === "loans"
    ) {

      await loadLoans(
        container
      );

    }

    else if (
      page === "inquiries"
    ) {

      await loadInquiries(
        container
      );

    }

    else if (
      page === "reports"
    ) {

      renderReports(
        container
      );

    }

    else {

      renderComingSoon(
        container,
        page
      );

    }

  } catch (error) {

    container.innerHTML = `
      <div class="crm-feature-card">

        <h3>
          Unable to load data
        </h3>

        <p class="error-text">
          ${escapeHtml(
            error.message
          )}
        </p>

      </div>
    `;

  }

}


/* =====================================================
   PREMIUM DASHBOARD
===================================================== */

async function loadPremiumCRMDashboard() {

  try {

    const [

      customersResponse,

      applicationsResponse,

      loansResponse,

      paymentsResponse

    ] = await Promise.all([

      apiRequest(
        "/api/admin/report/customers"
      ),

      apiRequest(
        "/api/admin/report/applications"
      ),

      apiRequest(
        "/api/admin/report/loans"
      ),

      apiRequest(
        "/api/admin/report/payments"
      )

    ]);


    const customers =
      customersResponse.data ||
      [];


    const applications =
      applicationsResponse.data ||
      [];


    const loans =
      loansResponse.data ||
      [];


    const payments =
      paymentsResponse.data ||
      [];


    /* CUSTOMERS */

    setCRMText(
      "crmTotalCustomers",
      customers.length
    );


    /* APPLICATIONS */

    setCRMText(
      "crmTotalApplications",
      applications.length
    );


    const pending =
      applications.filter(
        app => {

          const status =
            String(
              app.status || ""
            )
            .toLowerCase();

          return (
            status === "submitted" ||
            status === "under_review"
          );

        }
      );


    setCRMText(
      "crmPendingApplications",
      pending.length
    );


    /* LOANS */

    const active =
      loans.filter(
        loan => {

          const status =
            String(
              loan.status || ""
            )
            .toLowerCase();

          return (
            status === "active" ||
            status === "disbursed"
          );

        }
      );


    const disbursed =
      loans.filter(
        loan => {

          return String(
            loan.status || ""
          )
          .toLowerCase()
          === "disbursed";

        }
      );


    const closed =
      loans.filter(
        loan => {

          return String(
            loan.status || ""
          )
          .toLowerCase()
          === "closed";

        }
      );


    setCRMText(
      "crmActiveLoans",
      active.length
    );


    setCRMText(
      "crmPortfolioActive",
      active.length
    );


    setCRMText(
      "crmPortfolioDisbursed",
      disbursed.length
    );


    setCRMText(
      "crmPortfolioClosed",
      closed.length
    );


    /* PORTFOLIO */

    const portfolio =
      loans.reduce(
        (total, loan) => {

          return total +
            Number(
              loan.principal ??
              loan.loan_amount ??
              loan.loanAmount ??
              loan.amount ??
              0
            );

        },
        0
      );


    setCRMText(
      "crmPortfolioAmount",
      money(portfolio)
    );


    /* COLLECTION */

    const collection =
      payments.reduce(
        (total, payment) => {

          return total +
            Number(
              payment.amount ??
              payment.payment_amount ??
              payment.paid_amount ??
              0
            );

        },
        0
      );


    setCRMText(
      "crmCollectionAmount",
      money(collection)
    );


    setCRMText(
      "crmCollectedAmount",
      money(collection)
    );


    setCRMText(
      "crmPaymentCount",
      payments.length
    );


    /* RECENT APPLICATIONS */

    const recent =
      [...applications]
        .sort(
          (a, b) =>
            new Date(
              b.created_at || 0
            ) -
            new Date(
              a.created_at || 0
            )
        )
        .slice(0, 6);


    renderRecentCRMApplications(
      recent
    );


  } catch (error) {

    console.error(
      "Dashboard error:",
      error
    );


    if ($("crmRecentApplications")) {

      $("crmRecentApplications")
        .innerHTML = `
          <div class="crm-empty-state">

            Dashboard data could not
            be loaded.

            <br>

            <small>
              ${escapeHtml(
                error.message
              )}
            </small>

          </div>
        `;

    }

  }

}


/* =====================================================
   RECENT APPLICATIONS
===================================================== */

function renderRecentCRMApplications(
  applications
) {

  const container =
    $("crmRecentApplications");


  if (!container) {
    return;
  }


  if (!applications.length) {

    container.innerHTML = `
      <div class="crm-empty-state">
        No loan applications found.
      </div>
    `;

    return;
  }


  container.innerHTML =
    applications
      .map(app => {

        const id =
          app.application_id ||
          "-";


        const name =
          app.full_name ||
          "Customer";


        const amount =
          money(
            app.requested_amount || 0
          );


        const status =
          String(
            app.status ||
            "submitted"
          )
          .replace(
            /_/g,
            " "
          )
          .toUpperCase();


        return `

          <div class="crm-recent-row">

            <strong>
              ${escapeHtml(id)}
            </strong>

            <span>
              ${escapeHtml(name)}
            </span>

            <span>
              ${amount}
            </span>

            <span class="crm-status">
              ${escapeHtml(status)}
            </span>

          </div>

        `;

      })
      .join("");

}


/* =====================================================
   CUSTOMERS
===================================================== */

async function loadCustomers(
  container
) {

  const data =
    await apiRequest(
      "/api/admin/report/customers"
    );


  const customers =
    data.data || [];


  if (!customers.length) {

    container.innerHTML = `
      <div class="crm-feature-card">
        <h3>No customers found</h3>
        <p>
          Customer records will appear here.
        </p>
      </div>
    `;

    return;
  }


  let html = `
    <div class="crm-feature-card">

      <h3>
        Customer Management
      </h3>

      <div style="overflow:auto">

        <table class="crm-module-table">

          <thead>

            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Email</th>
            </tr>

          </thead>

          <tbody>
  `;


  customers
    .slice(0, 100)
    .forEach(item => {

      html += `

        <tr>

          <td>
            ${escapeHtml(
              item.full_name ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              item.mobile ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              item.email ||
              "-"
            )}
          </td>

        </tr>

      `;

    });


  html += `
          </tbody>

        </table>

      </div>

    </div>
  `;


  container.innerHTML =
    html;

}


/* =====================================================
   APPLICATIONS
===================================================== */

async function loadApplications(
  container
) {

  const data =
    await apiRequest(
      "/api/admin/report/applications"
    );


  const applications =
    data.data || [];


  let html = `

    <div class="crm-feature-card">

      <h3>
        Loan Applications
      </h3>

      <div style="overflow:auto">

        <table class="crm-module-table">

          <thead>

            <tr>
              <th>Application ID</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>
  `;


  applications
    .slice(0, 100)
    .forEach(item => {

      html += `

        <tr>

          <td>
            ${escapeHtml(
              item.application_id ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              item.full_name ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              item.mobile ||
              "-"
            )}
          </td>

          <td>
            ${money(
              item.requested_amount || 0
            )}
          </td>

          <td>
            ${escapeHtml(
              item.status ||
              "-"
            )}
          </td>

        </tr>

      `;

    });


  html += `
          </tbody>

        </table>

      </div>

    </div>
  `;


  container.innerHTML =
    html;

}


/* =====================================================
   LOANS
===================================================== */

async function loadLoans(
  container
) {

  const data =
    await apiRequest(
      "/api/admin/report/loans"
    );


  const loans =
    data.data || [];


  let html = `

    <div class="crm-feature-card">

      <h3>
        Loan Portfolio
      </h3>

      <div style="overflow:auto">

        <table class="crm-module-table">

          <thead>

            <tr>
              <th>Loan Account</th>
              <th>Application</th>
              <th>Status</th>
              <th>Principal</th>
            </tr>

          </thead>

          <tbody>
  `;


  loans
    .slice(0, 100)
    .forEach(item => {

      html += `

        <tr>

          <td>
            ${escapeHtml(
              item.loan_account_no ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              item.application_id ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              item.status ||
              "-"
            )}
          </td>

          <td>
            ${money(
              item.principal ??
              item.loan_amount ??
              item.amount ??
              0
            )}
          </td>

        </tr>

      `;

    });


  html += `
          </tbody>

        </table>

      </div>

    </div>
  `;


  container.innerHTML =
    html;

}


/* =====================================================
   INQUIRIES
===================================================== */

async function loadInquiries(
  container
) {

  const data =
    await apiRequest(
      "/api/admin/inquiries"
    );


  const inquiries =
    data.data ||
    data.inquiries ||
    [];


  let html = `

    <div class="crm-feature-card">

      <h3>
        Eligibility Inquiries
      </h3>

      <div style="overflow:auto">

        <table class="crm-module-table">

          <thead>

            <tr>
              <th>Inquiry ID</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Requested</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>
  `;


  inquiries
    .slice(0, 100)
    .forEach(item => {

      html += `

        <tr>

          <td>
            ${escapeHtml(
              item.inquiry_id ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              item.full_name ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              item.mobile ||
              "-"
            )}
          </td>

          <td>
            ${money(
              item.requested_amount || 0
            )}
          </td>

          <td>
            ${escapeHtml(
              item.eligibility_status ||
              "-"
            )}
          </td>

        </tr>

      `;

    });


  html += `
          </tbody>

        </table>

      </div>

    </div>
  `;


  container.innerHTML =
    html;

}


/* =====================================================
   REPORTS
===================================================== */

function renderReports(
  container
) {

  const reports = [

    [
      "applications",
      "Loan Applications",
      "Complete loan application report."
    ],

    [
      "customers",
      "Customers",
      "Customer master data."
    ],

    [
      "loans",
      "Loan Portfolio",
      "Loan account and portfolio report."
    ],

    [
      "payments",
      "EMI Collections",
      "Payment and collection report."
    ],

    [
      "inquiries",
      "Eligibility Inquiries",
      "Preliminary eligibility report."
    ]

  ];


  container.innerHTML = `

    <div class="report-grid">

      ${reports.map(
        report => `

          <div class="report-card">

            <div class="report-icon">
              ▥
            </div>

            <h3>
              ${report[1]}
            </h3>

            <p>
              ${report[2]}
            </p>

            <button
              class="primary-btn"
              onclick="
                downloadReport('${report[0]}')
              "
            >
              Download CSV
            </button>

          </div>

        `
      ).join("")}

    </div>

  `;

}


/* =====================================================
   DOWNLOAD REPORT
===================================================== */

async function downloadReport(
  type
) {

  try {

    showToast(
      "Preparing report..."
    );


    const result =
      await apiRequest(
        `/api/admin/report/${type}`
      );


    const rows =
      result.data || [];


    if (!rows.length) {

      showToast(
        "No data available"
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
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    link.href = url;

    link.download =
      `shyam-fincorp-${type}-report.csv`;


    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url
    );


    showToast(
      "Report downloaded"
    );


  } catch (error) {

    showToast(
      error.message
    );

  }

}


/* =====================================================
   CSV
===================================================== */

function convertToCSV(rows) {

  if (!rows.length) {
    return "";
  }


  const columns =
    Object.keys(
      rows[0]
    );


  const header =
    columns.join(",");


  const body =
    rows
      .map(row => {

        return columns
          .map(column => {

            let value =
              row[column];

            if (
              value === null ||
              value === undefined
            ) {

              value = "";

            }


            return `"${String(value)
              .replace(/"/g, '""')}"`;

          })
          .join(",");

      })
      .join("\n");


  return (
    header +
    "\n" +
    body
  );

}


/* =====================================================
   SEARCH
===================================================== */

async function performCRMSearch() {

  const input =
    $("globalSearch");


  const query =
    input?.value.trim();


  if (!query) {

    showToast(
      "Enter customer, loan or application"
    );

    return;
  }


  try {

    showToast(
      "Searching..."
    );


    const data =
      await apiRequest(
        `/api/admin/search?q=${encodeURIComponent(
          query
        )}`
      );


    showSearchResults(
      data
    );


  } catch (error) {

    showToast(
      error.message
    );

  }

}


/* =====================================================
   SEARCH RESULTS
===================================================== */

function showSearchResults(data) {

  let panel =
    $("crmSearchResults");


  if (!panel) {

    panel =
      document.createElement(
        "div"
      );

    panel.id =
      "crmSearchResults";

    panel.className =
      "search-results-panel";


    document.body.appendChild(
      panel
    );

  }


  const customers =
    data.customers || [];


  const applications =
    data.applications || [];


  const loans =
    data.loans || [];


  let html = `

    <div class="search-results-header">

      <div>

        <span class="eyebrow">
          CRM SEARCH
        </span>

        <h3>
          Search Results
        </h3>

      </div>

      <button
        class="close-results"
        onclick="
          document
            .getElementById(
              'crmSearchResults'
            )
            ?.remove()
        "
      >
        ×
      </button>

    </div>

  `;


  if (
    !customers.length &&
    !applications.length &&
    !loans.length
  ) {

    html += `
      <div class="empty-search">
        No matching records found.
      </div>
    `;

  }


  if (customers.length) {

    html += `
      <div class="search-section">

        <h4>
          Customers
          <span>
            ${customers.length}
          </span>
        </h4>
    `;


    customers.forEach(item => {

      html += `

        <div class="search-result-row">

          <div>

            <strong>
              ${escapeHtml(
                item.full_name ||
                "-"
              )}
            </strong>

            <small>
              ${escapeHtml(
                item.mobile ||
                "-"
              )}
            </small>

          </div>

          <span class="result-badge">
            Customer
          </span>

        </div>

      `;

    });


    html += `</div>`;

  }


  if (applications.length) {

    html += `
      <div class="search-section">

        <h4>
          Applications
          <span>
            ${applications.length}
          </span>
        </h4>
    `;


    applications.forEach(item => {

      html += `

        <div class="search-result-row">

          <div>

            <strong>
              ${escapeHtml(
                item.application_id ||
                "-"
              )}
            </strong>

            <small>
              ${escapeHtml(
                item.full_name ||
                "-"
              )}
              •
              ${escapeHtml(
                item.mobile ||
                "-"
              )}
            </small>

          </div>

          <span class="result-badge">
            Application
          </span>

        </div>

      `;

    });


    html += `</div>`;

  }


  if (loans.length) {

    html += `
      <div class="search-section">

        <h4>
          Loan Accounts
          <span>
            ${loans.length}
          </span>
        </h4>
    `;


    loans.forEach(item => {

      html += `

        <div class="search-result-row">

          <div>

            <strong>
              ${escapeHtml(
                item.loan_account_no ||
                "-"
              )}
            </strong>

            <small>
              Application:
              ${escapeHtml(
                item.application_id ||
                "-"
              )}
            </small>

          </div>

          <span class="result-badge">
            Loan
          </span>

        </div>

      `;

    });


    html += `</div>`;

  }


  panel.innerHTML =
    html;

}


/* =====================================================
   COMING SOON
===================================================== */

function renderComingSoon(
  container,
  page
) {

  container.innerHTML = `

    <div class="crm-feature-card">

      <h3>
        ${escapeHtml(
          pageData[page]?.title ||
          "CRM Module"
        )}
      </h3>

      <p>
        This CRM module is connected to
        the Shyam Fincorp operations console.
      </p>

    </div>

  `;

}


/* =====================================================
   MOBILE MENU
===================================================== */

function openMobileMenu() {

  const sidebar =
    document.querySelector(
      ".crm-sidebar"
    );


  sidebar?.classList.toggle(
    "open"
  );

}


function closeMobileMenu() {

  const sidebar =
    document.querySelector(
      ".crm-sidebar"
    );


  sidebar?.classList.remove(
    "open"
  );

}


/* =====================================================
   INITIALIZATION
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  async function() {

    if (!requireLogin()) {
      return;
    }


    /* ADMIN NAME */

    const username =
      localStorage.getItem(
        USER_KEY
      );


    document
      .querySelectorAll(
        "[data-admin-name]"
      )
      .forEach(element => {

        if (username) {

          element.textContent =
            username;

        }

      });


    /* NAVIGATION */

    document
      .querySelectorAll(
        ".nav-item"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          function() {

            showPage(
              this.dataset.page
            );

          }
        );

      });


    /* DASHBOARD LINKS */

    document
      .querySelectorAll(
        "[data-page-link]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          function() {

            showPage(
              this.dataset.pageLink
            );

          }
        );

      });


    /* LOGOUT */

    $("logoutBtn")
      ?.addEventListener(
        "click",
        logoutAdmin
      );


    /* MOBILE */

    $("mobileMenu")
      ?.addEventListener(
        "click",
        openMobileMenu
      );


    /* SEARCH BUTTON */

    $("searchButton")
      ?.addEventListener(
        "click",
        performCRMSearch
      );


    /* SEARCH ENTER */

    $("globalSearch")
      ?.addEventListener(
        "keydown",
        function(event) {

          if (
            event.key === "Enter"
          ) {

            performCRMSearch();

          }

        }
      );


    /* NEW APPLICATION */

    $("newApplicationBtn")
      ?.addEventListener(
        "click",
        function() {

          showToast(
            "New application module ready"
          );

        }
      );


    /* LOAD DASHBOARD */

    await loadPremiumCRMDashboard();

  }
);
