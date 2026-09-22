const API_BASE =
  "https://shyam-fincorp.onrender.com";


const TOKEN_KEY =
  "shyam_admin_token";

const USER_KEY =
  "shyam_admin_user";


/* =========================================
   BASIC HELPERS
========================================= */

function $(id) {
  return document.getElementById(id);
}


function showToast(message) {

  const oldToast =
    document.querySelector(".crm-toast");

  if (oldToast) {
    oldToast.remove();
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


/* =========================================
   LOGIN CHECK
========================================= */

function requireLogin() {

  const token =
    localStorage.getItem(TOKEN_KEY);

  if (!token) {

    window.location.href =
      "crm-login.html";

    return false;
  }

  return true;
}


/* =========================================
   LOGOUT
========================================= */

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


/* =========================================
   API REQUEST
========================================= */

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


/* =========================================
   PAGE CONFIG
========================================= */

const pageData = {

  overview: {
    title: "Dashboard",
    subtitle:
      "Welcome back. Here's what's happening today."
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
      "Track collections and overdue accounts."
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
    title: "Eligibility Inquiries",
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


/* =========================================
   PAGE NAVIGATION
========================================= */

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

  } else {

    if (generic) {

      generic.classList.add(
        "active"
      );
    }

    renderPageContent(page);
  }


  const title =
    $("pageTitle");

  const subtitle =
    $("pageSubtitle");


  if (title) {

    title.textContent =
      data.title;
  }


  if (subtitle) {

    subtitle.textContent =
      data.subtitle;
  }


  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.classList.remove(
        "active"
      );


      if (
        button.dataset.page === page
      ) {

        button.classList.add(
          "active"
        );
      }

    });


  closeMobileMenu();
}


/* =========================================
   RENDER CRM MODULE
========================================= */

async function renderPageContent(
  page
) {

  const title =
    $("genericTitle");

  const text =
    $("genericText");

  const container =
    $("genericContent");


  if (!container) {
    return;
  }


  container.innerHTML =
    `<div class="crm-feature-card">
      Loading...
    </div>`;


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

    container.innerHTML =
      `<div class="crm-feature-card">
        <h3>Unable to load data</h3>
        <p>${escapeHtml(
          error.message
        )}</p>
      </div>`;
  }
}


/* =========================================
   CUSTOMERS
========================================= */

async function loadCustomers(
  container
) {

  const data =
    await apiRequest(
      "/api/admin/search?q=a"
    );


  const customers =
    data.customers || [];


  if (!customers.length) {

    container.innerHTML =
      `<div class="crm-feature-card">
        <h3>No customers found</h3>
        <p>
          Customer records will appear here
          when available.
        </p>
      </div>`;

    return;
  }


  container.innerHTML =
    createCustomerTable(
      customers
    );
}


/* =========================================
   APPLICATIONS
========================================= */

async function loadApplications(
  container
) {

  const data =
    await apiRequest(
      "/api/admin/report/applications"
    );


  const applications =
    data.data || [];


  if (!applications.length) {

    container.innerHTML =
      `<div class="crm-feature-card">
        <h3>No applications found</h3>
        <p>
          Loan applications will appear here.
        </p>
      </div>`;

    return;
  }


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
    .slice(0, 50)
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
            ₹${Number(
              item.requested_amount ||
              0
            ).toLocaleString("en-IN")}
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


/* =========================================
   LOANS
========================================= */

async function loadLoans(
  container
) {

  const data =
    await apiRequest(
      "/api/admin/report/loans"
    );


  const loans =
    data.data || [];


  if (!loans.length) {

    container.innerHTML =
      `<div class="crm-feature-card">

        <h3>
          No loan accounts found
        </h3>

        <p>
          Active loan accounts will appear here.
        </p>

      </div>`;

    return;
  }


  let html = `
    <div class="crm-feature-card">

      <h3>
        Loan Accounts
      </h3>

      <div style="overflow:auto">

      <table class="crm-module-table">

        <thead>

          <tr>
            <th>Loan Account</th>
            <th>Application</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>

        </thead>

        <tbody>
  `;


  loans
    .slice(0, 50)
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
            ₹${Number(
              item.loan_amount ||
              item.principal_amount ||
              0
            ).toLocaleString("en-IN")}
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


/* =========================================
   INQUIRIES
========================================= */

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


  if (!inquiries.length) {

    container.innerHTML =
      `<div class="crm-feature-card">

        <h3>
          No inquiries found
        </h3>

        <p>
          Eligibility inquiries will appear here.
        </p>

      </div>`;

    return;
  }


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
    .slice(0, 50)
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
            ₹${Number(
              item.requested_amount ||
              0
            ).toLocaleString("en-IN")}
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


/* =========================================
   REPORTS
========================================= */

function renderReports(
  container
) {

  const reports = [

    {
      type: "applications",
      title: "Applications",
      text:
        "Download loan application report."
    },

    {
      type: "customers",
      title: "Customers",
      text:
        "Download customer report."
    },

    {
      type: "loans",
      title: "Loans",
      text:
        "Download loan portfolio report."
    },

    {
      type: "payments",
      title: "Payments",
      text:
        "Download payment collection report."
    },

    {
      type: "inquiries",
      title: "Inquiries",
      text:
        "Download eligibility inquiry report."
    }

  ];


  let html =
    `<div class="report-grid">`;


  reports.forEach(report => {

    html += `

      <div class="report-card">

        <h3>
          ${report.title}
        </h3>

        <p>
          ${report.text}
        </p>

        <button
          class="primary-btn"
          onclick="downloadReport('${report.type}')"
        >
          Download CSV
        </button>

      </div>

    `;
  });


  html +=
    `</div>`;


  container.innerHTML =
    html;
}


/* =========================================
   DOWNLOAD REPORT
========================================= */

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


/* =========================================
   CSV CONVERTER
========================================= */

function convertToCSV(
  rows
) {

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
    rows.map(row => {

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


          value =
            String(value)
              .replace(
                /"/g,
                '""'
              );


          return `"${value}"`;

        })
        .join(",");

    }).join("\n");


  return (
    header +
    "\n" +
    body
  );
}


/* =========================================
   SEARCH
========================================= */

async function performCRMSearch() {

  const input =
    $("globalSearch");


  if (!input) {
    return;
  }


  const query =
    input.value.trim();


  if (!query) {

    showToast(
      "Search customer, loan or application"
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


/* =========================================
   SEARCH RESULTS
========================================= */

function showSearchResults(
  data
) {

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
      "crm-results";


    const content =
      document.querySelector(
        ".crm-content"
      );


    if (content) {

      content.prepend(
        panel
      );
    }
  }


  const customers =
    data.customers || [];

  const applications =
    data.applications || [];

  const loans =
    data.loans || [];


  let html = "";


  customers.forEach(item => {

    html += `
      <div class="crm-result-item">

        <strong>
          Customer:
          ${escapeHtml(
            item.full_name ||
            "-"
          )}
        </strong>

        <small>
          Mobile:
          ${escapeHtml(
            item.mobile ||
            "-"
          )}
        </small>

      </div>
    `;
  });


  applications.forEach(item => {

    html += `
      <div class="crm-result-item">

        <strong>
          Application:
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
          |
          ${escapeHtml(
            item.mobile ||
            "-"
          )}
        </small>

      </div>
    `;
  });


  loans.forEach(item => {

    html += `
      <div class="crm-result-item">

        <strong>
          Loan:
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
    `;
  });


  if (!html) {

    html =
      `<div class="crm-feature-card">
        <h3>No results found</h3>
        <p>
          No customer, application or loan matched your search.
        </p>
      </div>`;
  }


  panel.innerHTML =
    html;
}


/* =========================================
   COMING SOON MODULES
========================================= */

function renderComingSoon(
  container,
  page
) {

  const title =
    pageData[page]?.title ||
    "CRM Module";


  container.innerHTML = `

    <div class="crm-feature-card">

      <h3>
        ${title}
      </h3>

      <p>
        This module is connected to the CRM structure
        and can be expanded with live data.
      </p>

    </div>

  `;
}


/* =========================================
   CUSTOMER TABLE
========================================= */

function createCustomerTable(
  customers
) {

  let html = `

    <div class="crm-feature-card">

      <h3>
        Customers
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
    .slice(0, 50)
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


  return html;
}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(
  value
) {

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


/* =========================================
   MOBILE MENU
========================================= */

function closeMobileMenu() {

  const sidebar =
    document.querySelector(
      ".crm-sidebar"
    );


  if (sidebar) {

    sidebar.classList.remove(
      "mobile-open"
    );
  }
}


function openMobileMenu() {

  const sidebar =
    document.querySelector(
      ".crm-sidebar"
    );


  if (sidebar) {

    sidebar.classList.toggle(
      "mobile-open"
    );
  }
}


/* =========================================
   LOAD CRM
========================================= */

async function loadCRMData() {

  if (!requireLogin()) {
    return;
  }


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


  try {

    await apiRequest(
      "/api/admin/inquiries"
    );

  } catch (error) {

    console.log(
      "CRM data check:",
      error.message
    );
  }
}


/* =========================================
   EVENT LISTENERS
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    if (!requireLogin()) {
      return;
    }


    /* Navigation */

    document
      .querySelectorAll(
        ".nav-item"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            showPage(
              button.dataset.page
            );

          }
        );

      });


    /* Dashboard buttons */

    document
      .querySelectorAll(
        "[data-page-link]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            showPage(
              button.dataset.pageLink
            );

          }
        );

      });


    /* Logout */

    const logoutBtn =
      $("logoutBtn");


    if (logoutBtn) {

      logoutBtn.addEventListener(
        "click",
        logoutAdmin
      );
    }


    /* Mobile menu */

    const mobileMenu =
      $("mobileMenu");


    if (mobileMenu) {

      mobileMenu.addEventListener(
        "click",
        openMobileMenu
      );
    }


    /* Search Enter */

    const searchInput =
      $("globalSearch");


    if (searchInput) {

      searchInput.addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Enter"
          ) {

            performCRMSearch();
          }

        }
      );
    }


    /* New application */

    const newApplicationBtn =
      $("newApplicationBtn");


    if (
      newApplicationBtn
    ) {

      newApplicationBtn.addEventListener(
        "click",
        () => {

          showToast(
            "New application module ready"
          );

        }
      );
    }


    loadCRMData();

  }
);
// =====================================================
// SHYAM FINCORP PREMIUM CRM DASHBOARD
// =====================================================

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
      customersResponse ||
      [];

    const applications =
      applicationsResponse.data ||
      applicationsResponse ||
      [];

    const loans =
      loansResponse.data ||
      loansResponse ||
      [];

    const payments =
      paymentsResponse.data ||
      paymentsResponse ||
      [];


    // -----------------------------------------------
    // CUSTOMERS
    // -----------------------------------------------

    setCRMText(
      "crmTotalCustomers",
      customers.length
    );


    // -----------------------------------------------
    // APPLICATIONS
    // -----------------------------------------------

    setCRMText(
      "crmTotalApplications",
      applications.length
    );


    const pendingApplications =
      applications.filter(function(app) {

        return [
          "submitted",
          "under_review"
        ].includes(
          String(app.status || "")
            .toLowerCase()
        );

      });


    setCRMText(
      "crmPendingApplications",
      pendingApplications.length
    );


    // -----------------------------------------------
    // LOANS
    // -----------------------------------------------

    const activeLoans =
      loans.filter(function(loan) {

        return [
          "active",
          "disbursed"
        ].includes(
          String(loan.status || "")
            .toLowerCase()
        );

      });


    setCRMText(
      "crmActiveLoans",
      activeLoans.length
    );


    const closedLoans =
      loans.filter(function(loan) {

        return String(
          loan.status || ""
        ).toLowerCase() === "closed";

      });


    const disbursedLoans =
      loans.filter(function(loan) {

        return String(
          loan.status || ""
        ).toLowerCase() === "disbursed";

      });


    setCRMText(
      "crmPortfolioActive",
      activeLoans.length
    );

    setCRMText(
      "crmPortfolioClosed",
      closedLoans.length
    );

    setCRMText(
      "crmPortfolioDisbursed",
      disbursedLoans.length
    );


    // -----------------------------------------------
    // PORTFOLIO AMOUNT
    // -----------------------------------------------

    const portfolio =
      loans.reduce(function(total, loan) {

        return total +
          Number(
            loan.principal ||
            loan.loan_amount ||
            loan.amount ||
            0
          );

      }, 0);


    setCRMText(
      "crmPortfolioAmount",
      formatCRMAmount(portfolio)
    );


    setCRMText(
      "crmOutstandingAmount",
      formatCRMAmount(portfolio)
    );


    // -----------------------------------------------
    // PAYMENTS
    // -----------------------------------------------

    const collection =
      payments.reduce(function(total, payment) {

        return total +
          Number(
            payment.amount ||
            payment.payment_amount ||
            0
          );

      }, 0);


    setCRMText(
      "crmCollectionAmount",
      formatCRMAmount(collection)
    );


    setCRMText(
      "crmCollectedAmount",
      formatCRMAmount(collection)
    );


    setCRMText(
      "crmPaymentCount",
      payments.length
    );


    // -----------------------------------------------
    // RECENT APPLICATIONS
    // -----------------------------------------------

    renderRecentCRMApplications(
      applications.slice(0, 6)
    );


  } catch (error) {

    console.error(
      "CRM dashboard error:",
      error
    );

  }

}


// =====================================================
// HELPERS
// =====================================================

function setCRMText(id, value) {

  const element =
    document.getElementById(id);

  if (element) {
    element.textContent = value;
  }

}


function formatCRMAmount(value) {

  const amount =
    Number(value || 0);

  return amount.toLocaleString(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }
  );

}


// =====================================================
// RECENT APPLICATIONS
// =====================================================

function renderRecentCRMApplications(
  applications
) {

  const container =
    document.getElementById(
      "crmRecentApplications"
    );

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
    applications.map(function(app) {

      const applicationId =
        app.application_id ||
        "-";

      const name =
        app.full_name ||
        "Customer";

      const amount =
        formatCRMAmount(
          app.requested_amount || 0
        );

      const status =
        String(
          app.status || "submitted"
        )
        .replace(/_/g, " ")
        .toUpperCase();


      return `

        <div class="crm-recent-row">

          <strong>
            ${escapeHtml(
              applicationId
            )}
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

    }).join("");

}


// =====================================================
// LOAD DASHBOARD
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    if (
      document.querySelector(
        ".crm-dashboard"
      )
    ) {

      loadPremiumCRMDashboard();

    }

  }
);
