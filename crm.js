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
  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }
  );
}


function showToast(message) {

  document
    .querySelectorAll(".crm-toast")
    .forEach(el => el.remove());

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


function formatDate(value) {

  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}


function getPaymentAmount(payment) {

  return Number(
    payment.amount ??
    payment.payment_amount ??
    payment.paid_amount ??
    payment.emi_amount ??
    payment.paidAmount ??
    0
  );
}


function getLoanAmount(loan) {

  return Number(
    loan.principal ??
    loan.loan_amount ??
    loan.loanAmount ??
    loan.amount ??
    0
  );
}


function getLoanAccount(loan) {

  return (
    loan.loan_account_no ||
    loan.loan_account_number ||
    loan.account_number ||
    loan.loanAccountNumber ||
    "-"
  );
}


/* =====================================================
   LOGIN
===================================================== */

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


/* =====================================================
   LOGOUT
===================================================== */

function logoutAdmin() {

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("admin_key");

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
    localStorage.getItem(TOKEN_KEY);

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
    overview.classList.remove("active");
  }

  if (generic) {
    generic.classList.remove("active");
  }

  if (page === "overview") {

    if (overview) {
      overview.classList.add("active");
    }

    loadPremiumCRMDashboard();

  } else {

    if (generic) {
      generic.classList.add("active");
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

      await loadCustomers(container);

    } else if (page === "applications") {

      await loadApplications(container);

    } else if (page === "loans") {

      await loadLoans(container);

    } else if (page === "collections") {

      await loadCollections(container);

    } else if (page === "emi") {

      await loadCollections(container);

    } else if (page === "inquiries") {

      await loadInquiries(container);

    } else if (page === "reports") {

      renderReports(container);

    } else {

      renderComingSoon(
        container,
        page
      );

    }

  } catch (error) {

    container.innerHTML = `
      <div class="crm-feature-card">
        <h3>Unable to load data</h3>

        <p class="error-text">
          ${escapeHtml(error.message)}
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
      customersResponse.data || [];

    const applications =
      applicationsResponse.data || [];

    const loans =
      loansResponse.data || [];

    const payments =
      paymentsResponse.data || [];


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
      applications.filter(app => {

        const status =
          String(
            app.status || ""
          ).toLowerCase();

        return (
          status === "submitted" ||
          status === "under_review"
        );
      });


    setCRMText(
      "crmPendingApplications",
      pending.length
    );


    /* LOANS */

    const active =
      loans.filter(loan => {

        const status =
          String(
            loan.status || ""
          ).toLowerCase();

        return (
          status === "active" ||
          status === "disbursed"
        );
      });


    const disbursed =
      loans.filter(loan => {

        return String(
          loan.status || ""
        ).toLowerCase()
        === "disbursed";

      });


    const closed =
      loans.filter(loan => {

        return String(
          loan.status || ""
        ).toLowerCase()
        === "closed";

      });


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


    /* LOAN PORTFOLIO */

    const portfolio =
      loans.reduce(
        (total, loan) => {

          return (
            total +
            getLoanAmount(loan)
          );

        },
        0
      );


    setCRMText(
      "crmPortfolioAmount",
      money(portfolio)
    );


    /* PAYMENTS */

    const collection =
      payments.reduce(
        (total, payment) => {

          return (
            total +
            getPaymentAmount(payment)
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
        .slice(0, 8);


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
            Dashboard data could not be loaded.
            <br>
            <small>
              ${escapeHtml(error.message)}
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
          app.application_id || "-";

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
          <div
            class="crm-recent-row"
            onclick="openApplicationDetails(
              '${escapeHtml(id)}'
            )"
            style="cursor:pointer"
          >

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

      <div class="crm-panel-header">
        <div>
          <span class="eyebrow">
            CUSTOMER MANAGEMENT
          </span>

          <h3>
            All Customers
          </h3>
        </div>

        <strong>
          ${customers.length}
        </strong>
      </div>

      <div style="overflow:auto">

        <table class="crm-module-table">

          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
  `;


  customers
    .slice(0, 100)
    .forEach(item => {

      const mobile =
        item.mobile || "";


      html += `
        <tr>

          <td>
            <strong>
              ${escapeHtml(
                item.full_name || "-"
              )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              mobile || "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              item.email || "-"
            )}
          </td>

          <td>

            <button
              class="outline-btn"
              type="button"
              onclick="
                openCustomerDetails(
                  '${escapeHtml(mobile)}'
                )
              "
            >
              View Details
            </button>

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

      <div class="crm-panel-header">
        <div>
          <span class="eyebrow">
            LOAN OPERATIONS
          </span>

          <h3>
            Loan Applications
          </h3>
        </div>

        <strong>
          ${applications.length}
        </strong>
      </div>

      <div style="overflow:auto">

        <table class="crm-module-table">

          <thead>
            <tr>
              <th>Application ID</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
  `;


  applications
    .slice(0, 100)
    .forEach(item => {

      const applicationId =
        item.application_id || "";


      html += `
        <tr>

          <td>
            <strong>
              ${escapeHtml(
                applicationId || "-"
              )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              item.full_name || "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              item.mobile || "-"
            )}
          </td>

          <td>
            ${money(
              item.requested_amount || 0
            )}
          </td>

          <td>
            ${escapeHtml(
              item.status || "-"
            )}
          </td>

          <td>

            <button
              class="outline-btn"
              type="button"
              onclick="
                openApplicationDetails(
                  '${escapeHtml(
                    applicationId
                  )}'
                )
              "
            >
              View
            </button>

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

      <div class="crm-panel-header">

        <div>
          <span class="eyebrow">
            LOAN PORTFOLIO
          </span>

          <h3>
            Loan Accounts
          </h3>
        </div>

        <strong>
          ${loans.length}
        </strong>

      </div>

      <div style="overflow:auto">

        <table class="crm-module-table">

          <thead>
            <tr>
              <th>Loan Account</th>
              <th>Application</th>
              <th>Status</th>
              <th>Principal</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
  `;


  loans
    .slice(0, 100)
    .forEach(item => {

      const account =
        getLoanAccount(item);


      html += `
        <tr>

          <td>
            <strong>
              ${escapeHtml(account)}
            </strong>
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
              getLoanAmount(item)
            )}
          </td>

          <td>

            <button
              class="outline-btn"
              type="button"
              onclick="
                openLoanDetails(
                  '${escapeHtml(account)}'
                )
              "
            >
              View Loan
            </button>

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
   COLLECTIONS / PAYMENTS
===================================================== */

async function loadCollections(
  container
) {

  const data =
    await apiRequest(
      "/api/admin/report/payments"
    );

  const payments =
    data.data || [];


  const total =
    payments.reduce(
      (sum, payment) =>
        sum +
        getPaymentAmount(payment),
      0
    );


  let html = `
    <div class="crm-feature-card">

      <div class="crm-panel-header">

        <div>
          <span class="eyebrow">
            EMI COLLECTION CENTER
          </span>

          <h3>
            Payment History
          </h3>

          <p>
            Total collected:
            <strong>
              ${money(total)}
            </strong>
          </p>
        </div>

        <strong>
          ${payments.length}
        </strong>

      </div>

      <div style="overflow:auto">

        <table class="crm-module-table">

          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Loan Account</th>
              <th>Amount</th>
              <th>Payment Date</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
  `;


  if (!payments.length) {

    html += `
      <tr>
        <td colspan="5">
          No payments found.
        </td>
      </tr>
    `;

  } else {

    payments
      .slice(0, 200)
      .forEach(payment => {

        html += `
          <tr>

            <td>
              ${escapeHtml(
                payment.payment_id ||
                payment.id ||
                "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                payment.loan_account_no ||
                payment.loan_account_number ||
                payment.account_number ||
                payment.loan_id ||
                "-"
              )}
            </td>

            <td>
              <strong>
                ${money(
                  getPaymentAmount(payment)
                )}
              </strong>
            </td>

            <td>
              ${formatDate(
                payment.payment_date ||
                payment.created_at ||
                payment.paid_at
              )}
            </td>

            <td>
              ${escapeHtml(
                payment.status ||
                "PAID"
              )}
            </td>

          </tr>
        `;
      });
  }


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
   CUSTOMER DETAILS
===================================================== */

async function openCustomerDetails(
  mobile
) {

  if (!mobile) {
    showToast(
      "Customer mobile not available"
    );
    return;
  }


  try {

    showToast(
      "Loading customer details..."
    );


    const result =
      await apiRequest(
        `/api/admin/search?q=${encodeURIComponent(
          mobile
        )}`
      );


    const customers =
      result.customers || [];

    const applications =
      result.applications || [];

    const loans =
      result.loans || [];


    const customer =
      customers.find(
        item =>
          String(item.mobile) ===
          String(mobile)
      ) ||
      customers[0] ||
      {};


    await showCustomerDetailPanel(
      customer,
      applications,
      loans
    );


  } catch (error) {

    showToast(
      error.message
    );
  }
}


/* =====================================================
   APPLICATION DETAILS
===================================================== */

async function openApplicationDetails(
  applicationId
) {

  if (!applicationId) {
    showToast(
      "Application ID not available"
    );
    return;
  }


  try {

    showToast(
      "Loading application..."
    );


    const result =
      await apiRequest(
        `/api/admin/search?q=${encodeURIComponent(
          applicationId
        )}`
      );


    const applications =
      result.applications || [];

    const loans =
      result.loans || [];


    const application =
      applications.find(
        item =>
          String(
            item.application_id
          ) ===
          String(applicationId)
      ) ||
      applications[0] ||
      {};


    const loan =
      loans[0] ||
      null;


    showDetailPanel(
      `
        <div class="detail-head">

          <div>
            <span class="eyebrow">
              LOAN APPLICATION
            </span>

            <h2>
              ${escapeHtml(
                application.application_id ||
                applicationId
              )}
            </h2>
          </div>

          <button
            class="close-results"
            onclick="closeDetailPanel()"
          >
            ×
          </button>

        </div>


        <div class="detail-grid">

          ${detailCard(
            "Customer",
            application.full_name || "-"
          )}

          ${detailCard(
            "Mobile",
            application.mobile || "-"
          )}

          ${detailCard(
            "Email",
            application.email || "-"
          )}

          ${detailCard(
            "Requested Amount",
            money(
              application.requested_amount || 0
            )
          )}

          ${detailCard(
            "Monthly Income",
            money(
              application.monthly_income || 0
            )
          )}

          ${detailCard(
            "Tenure",
            application.tenure_months
              ? application.tenure_months +
                " Months"
              : "-"
          )}

          ${detailCard(
            "Status",
            application.status || "-"
          )}

          ${detailCard(
            "Created",
            formatDate(
              application.created_at
            )
          )}

        </div>


        ${
          loan
            ? `
              <div class="detail-section">

                <h3>
                  Linked Loan
                </h3>

                <div class="detail-grid">

                  ${detailCard(
                    "Loan Account",
                    getLoanAccount(loan)
                  )}

                  ${detailCard(
                    "Principal",
                    money(
                      getLoanAmount(loan)
                    )
                  )}

                  ${detailCard(
                    "EMI",
                    money(
                      loan.emi ||
                      loan.emi_amount ||
                      0
                    )
                  )}

                  ${detailCard(
                    "Interest Rate",
                    (
                      loan.annual_interest_rate ||
                      loan.interest_rate ||
                      0
                    ) + "%"
                  )}

                  ${detailCard(
                    "Status",
                    loan.status || "-"
                  )}

                </div>

              </div>
            `
            : ""
        }

      `
    );


  } catch (error) {

    showToast(
      error.message
    );
  }
}


/* =====================================================
   LOAN DETAILS
===================================================== */

async function openLoanDetails(
  loanAccount
) {

  if (!loanAccount) {
    showToast(
      "Loan account not available"
    );
    return;
  }


  try {

    showToast(
      "Loading loan details..."
    );


    const result =
      await apiRequest(
        `/api/admin/search?q=${encodeURIComponent(
          loanAccount
        )}`
      );


    const loans =
      result.loans || [];

    const applications =
      result.applications || [];


    const loan =
      loans.find(
        item =>
          String(
            getLoanAccount(item)
          ) ===
          String(loanAccount)
      ) ||
      loans[0] ||
      {};


    const application =
      applications[0] ||
      {};


    const paymentResponse =
      await apiRequest(
        "/api/admin/report/payments"
      );


    const allPayments =
      paymentResponse.data || [];


    const payments =
      allPayments.filter(
        payment => {

          const account =
            payment.loan_account_no ||
            payment.loan_account_number ||
            payment.account_number ||
            "";

          return String(account) ===
            String(loanAccount);

        }
      );


    const collected =
      payments.reduce(
        (sum, payment) =>
          sum +
          getPaymentAmount(payment),
        0
      );


    showDetailPanel(

      `
        <div class="detail-head">

          <div>

            <span class="eyebrow">
              LOAN ACCOUNT
            </span>

            <h2>
              ${escapeHtml(
                loanAccount
              )}
            </h2>

          </div>

          <button
            class="close-results"
            onclick="closeDetailPanel()"
          >
            ×
          </button>

        </div>


        <div class="detail-grid">

          ${detailCard(
            "Customer",
            application.full_name ||
            loan.customer_name ||
            "-"
          )}

          ${detailCard(
            "Application",
            application.application_id ||
            loan.application_id ||
            "-"
          )}

          ${detailCard(
            "Principal",
            money(
              getLoanAmount(loan)
            )
          )}

          ${detailCard(
            "EMI",
            money(
              loan.emi ||
              loan.emi_amount ||
              loan.monthly_emi ||
              0
            )
          )}

          ${detailCard(
            "Interest",
            (
              loan.annual_interest_rate ||
              loan.interest_rate ||
              0
            ) + "%"
          )}

          ${detailCard(
            "Tenure",
            loan.tenure_months
              ? loan.tenure_months +
                " Months"
              : "-"
          )}

          ${detailCard(
            "Status",
            loan.status || "-"
          )}

          ${detailCard(
            "Collected",
            money(collected)
          )}

        </div>


        <div class="detail-section">

          <div class="detail-section-head">

            <h3>
              Payment History
            </h3>

            <strong>
              ${payments.length}
              Payments
            </strong>

          </div>


          ${
            payments.length
              ? `
                <div class="detail-payments">

                  ${payments
                    .slice(0, 50)
                    .map(payment => {

                      return `
                        <div class="detail-payment-row">

                          <span>
                            ${formatDate(
                              payment.payment_date ||
                              payment.created_at
                            )}
                          </span>

                          <strong>
                            ${money(
                              getPaymentAmount(
                                payment
                              )
                            )}
                          </strong>

                          <span>
                            ${escapeHtml(
                              payment.status ||
                              "PAID"
                            )}
                          </span>

                        </div>
                      `;

                    })
                    .join("")}

                </div>
              `
              : `
                <div class="crm-empty-state">
                  No payment records found for this loan.
                </div>
              `
          }

        </div>
      `
    );


  } catch (error) {

    showToast(
      error.message
    );
  }
}


/* =====================================================
   CUSTOMER DETAIL PANEL
===================================================== */

async function showCustomerDetailPanel(
  customer,
  applications,
  loans
) {

  const mobile =
    customer.mobile || "-";


  const customerApplications =
    applications.filter(
      app =>
        String(app.mobile || "") ===
        String(mobile)
    );


  const customerLoans =
    loans.filter(
      loan =>
        customerApplications.some(
          app =>
            String(
              app.id || ""
            ) ===
            String(
              loan.application_id || ""
            )
        )
    );


  showDetailPanel(

    `
      <div class="detail-head">

        <div>

          <span class="eyebrow">
            CUSTOMER PROFILE
          </span>

          <h2>
            ${escapeHtml(
              customer.full_name ||
              "Customer"
            )}
          </h2>

        </div>

        <button
          class="close-results"
          onclick="closeDetailPanel()"
        >
          ×
        </button>

      </div>


      <div class="detail-grid">

        ${detailCard(
          "Full Name",
          customer.full_name || "-"
        )}

        ${detailCard(
          "Mobile",
          customer.mobile || "-"
        )}

        ${detailCard(
          "Email",
          customer.email || "-"
        )}

        ${detailCard(
          "Customer ID",
          customer.id || "-"
        )}

        ${detailCard(
          "Applications",
          customerApplications.length
        )}

        ${detailCard(
          "Loan Accounts",
          customerLoans.length
        )}

      </div>


      <div class="detail-section">

        <div class="detail-section-head">

          <h3>
            Loan Applications
          </h3>

        </div>


        ${
          customerApplications.length
            ? `
              <div class="detail-list">

                ${customerApplications
                  .map(app => {

                    return `
                      <div
                        class="detail-list-row"
                        onclick="
                          openApplicationDetails(
                            '${escapeHtml(
                              app.application_id || ""
                            )}'
                          )
                        "
                      >

                        <div>
                          <strong>
                            ${escapeHtml(
                              app.application_id ||
                              "-"
                            )}
                          </strong>

                          <small>
                            ${escapeHtml(
                              app.status ||
                              "-"
                            )}
                          </small>
                        </div>

                        <strong>
                          ${money(
                            app.requested_amount ||
                            0
                          )}
                        </strong>

                      </div>
                    `;

                  })
                  .join("")}

              </div>
            `
            : `
              <div class="crm-empty-state">
                No applications found.
              </div>
            `
        }

      </div>
    `
  );
}


/* =====================================================
   DETAIL CARD
===================================================== */

function detailCard(
  label,
  value
) {

  return `
    <div class="detail-card">

      <span>
        ${escapeHtml(label)}
      </span>

      <strong>
        ${escapeHtml(value)}
      </strong>

    </div>
  `;
}


/* =====================================================
   DETAIL PANEL
===================================================== */

function showDetailPanel(
  content
) {

  closeDetailPanel();


  const panel =
    document.createElement("div");

  panel.id =
    "crmDetailPanel";

  panel.className =
    "crm-detail-overlay";


  panel.innerHTML = `

    <div class="crm-detail-modal">

      ${content}

    </div>

  `;


  document.body.appendChild(
    panel
  );
}


function closeDetailPanel() {

  $("crmDetailPanel")
    ?.remove();
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
              item.requested_amount ||
              0
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
      "Loan account report."
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
              type="button"
              onclick="
                downloadReport(
                  '${report[0]}'
                )
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
      URL.createObjectURL(blob);


    const link =
      document.createElement("a");


    link.href =
      url;

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
    Object.keys(rows[0]);


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
              .replace(
                /"/g,
                '""'
              )}"`;

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

function showSearchResults(
  data
) {

  let panel =
    $("crmSearchResults");


  if (!panel) {

    panel =
      document.createElement("div");

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


  /* CUSTOMERS */

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

      const mobile =
        item.mobile || "";


      html += `

        <div
          class="search-result-row"
          onclick="
            openCustomerDetails(
              '${escapeHtml(mobile)}'
            )
          "
          style="cursor:pointer"
        >

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
              •
              ${escapeHtml(
                item.email ||
                ""
              )}
            </small>

          </div>

          <span class="result-badge">
            View Customer
          </span>

        </div>
      `;
    });


    html += `</div>`;
  }


  /* APPLICATIONS */

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

      const id =
        item.application_id || "";


      html += `

        <div
          class="search-result-row"
          onclick="
            openApplicationDetails(
              '${escapeHtml(id)}'
            )
          "
          style="cursor:pointer"
        >

          <div>

            <strong>
              ${escapeHtml(
                id || "-"
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
            View Application
          </span>

        </div>
      `;
    });


    html += `</div>`;
  }


  /* LOANS */

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

      const account =
        getLoanAccount(item);


      html += `

        <div
          class="search-result-row"
          onclick="
            openLoanDetails(
              '${escapeHtml(account)}'
            )
          "
          style="cursor:pointer"
        >

          <div>

            <strong>
              ${escapeHtml(
                account
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
            View Loan
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


    /* SEARCH */

    $("searchButton")
      ?.addEventListener(
        "click",
        performCRMSearch
      );


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


    /* DASHBOARD */

    await loadPremiumCRMDashboard();

  }
);
