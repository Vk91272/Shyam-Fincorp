const API_BASE =
  "https://shyam-fincorp.onrender.com";

const TOKEN_KEY = "shyam_admin_token";
const USER_KEY = "shyam_admin_user";

let customersCache = [];
let applicationsCache = [];
let loansCache = [];
let paymentsCache = [];
let inquiriesCache = [];

let currentEMIData = null;
let searchResultsCache = {
  customers: [],
  applications: [],
  loans: []
};


/* ==================================================
   BASIC HELPERS
================================================== */

function $(id) {
  return document.getElementById(id);
}

function money(value) {
  return "₹" +
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function getUser() {
  return localStorage.getItem(USER_KEY) || "Administrator";
}

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer " + getToken()
  };
}

async function api(url, options = {}) {
  const response = await fetch(API_BASE + url, {
    ...options,
    headers: {
      ...adminHeaders(),
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
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


/* ==================================================
   AUTH
================================================== */

function checkCRMAuth() {
  if (!getToken()) {
    window.location.href = "crm-login.html";
    return false;
  }

  return true;
}

function logoutCRM() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  window.location.href = "crm-login.html";
}


/* ==================================================
   ADMIN NAME
================================================== */

function updateAdminName() {
  const username = getUser();

  document
    .querySelectorAll("[data-admin-name]")
    .forEach(el => {
      el.textContent = username;
    });
}


/* ==================================================
   TOAST
================================================== */

function showToast(
  message,
  type = "success"
) {
  let toast = $("crmToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "crmToast";
    toast.className = "crm-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className =
    "crm-toast show " + type;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}


/* ==================================================
   DATE HELPERS
================================================== */

function formatDate(date) {
  if (!date) return "—";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return date;
  }

  return d.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

function todayISO() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function emiStatus(emi) {
  if (emi.status === "paid") {
    return "paid";
  }

  const due = new Date(
    emi.due_date + "T23:59:59"
  );

  const today = new Date();

  if (emi.paid_amount > 0) {
    return "partial";
  }

  if (due < today) {
    return "overdue";
  }

  if (
    emi.due_date === todayISO()
  ) {
    return "today";
  }

  return "upcoming";
}

function emiStatusLabel(emi) {
  const status = emiStatus(emi);

  const labels = {
    paid: "Paid",
    partial: "Partial",
    overdue: "Overdue",
    today: "Due Today",
    upcoming: "Upcoming"
  };

  return labels[status] || status;
}

function outstandingAmount(emi) {
  return Math.max(
    0,
    Number(
      Number(emi.total_due || 0) -
      Number(emi.paid_amount || 0)
    )
  );
}


/* ==================================================
   DASHBOARD
================================================== */

async function loadPremiumCRMDashboard() {
  const results =
    await Promise.allSettled([
      api("/api/admin/customers"),
      api("/api/admin/applications"),
      api("/api/admin/loans"),
      api("/api/admin/payments")
    ]);

  if (
    results[0].status === "fulfilled"
  ) {
    customersCache =
      results[0].value || [];
  }

  if (
    results[1].status === "fulfilled"
  ) {
    applicationsCache =
      results[1].value || [];
  }

  if (
    results[2].status === "fulfilled"
  ) {
    loansCache =
      results[2].value || [];
  }

  if (
    results[3].status === "fulfilled"
  ) {
    paymentsCache =
      results[3].value || [];
  }

  const customers =
    customersCache;

  const applications =
    applicationsCache;

  const loans =
    loansCache;

  const payments =
    paymentsCache;

  setText(
    "crmTotalCustomers",
    customers.length
  );

  setText(
    "crmTotalApplications",
    applications.length
  );

  const pending =
    applications.filter(a =>
      [
        "submitted",
        "under_review"
      ].includes(
        String(a.status)
      )
    ).length;

  setText(
    "crmPendingApplications",
    pending
  );

  const activeLoans =
    loans.filter(l =>
      [
        "active",
        "disbursed"
      ].includes(
        String(l.status)
      )
    ).length;

  setText(
    "crmActiveLoans",
    activeLoans
  );

  const portfolio =
    loans.reduce(
      (sum, loan) =>
        sum +
        Number(
          loan.principal ||
          loan.loan_amount ||
          loan.amount ||
          0
        ),
      0
    );

  setText(
    "crmPortfolioKpi",
    money(portfolio)
  );

  setText(
    "crmPortfolioAmount",
    money(portfolio)
  );

  setText(
    "crmPortfolioActive",
    loans.filter(
      l => l.status === "active"
    ).length
  );

  setText(
    "crmPortfolioDisbursed",
    loans.filter(
      l => l.status === "disbursed"
    ).length
  );

  setText(
    "crmPortfolioClosed",
    loans.filter(
      l => l.status === "closed"
    ).length
  );

  const collection =
    payments.reduce(
      (sum, p) =>
        sum +
        Number(
          p.amount ||
          p.payment_amount ||
          p.paid_amount ||
          0
        ),
      0
    );

  setText(
    "crmCollectionAmount",
    money(collection)
  );

  setText(
    "crmCollectedAmount",
    money(collection)
  );

  setText(
    "crmPaymentCount",
    payments.length
  );

  renderRecentApplications(
    applications.slice(0, 8)
  );
}


/* ==================================================
   TEXT
================================================== */

function setText(id, value) {
  const el = $(id);

  if (el) {
    el.textContent = value;
  }
}


/* ==================================================
   RECENT APPLICATIONS
================================================== */

function renderRecentApplications(
  applications
) {
  const box =
    $("crmRecentApplications");

  if (!box) return;

  if (!applications.length) {
    box.innerHTML =
      `<div class="crm-empty-state">
        No applications found.
      </div>`;

    return;
  }

  box.innerHTML =
    applications.map(app => `
      <div
        class="crm-recent-row"
        onclick='openApplicationDetail(${JSON.stringify(app)})'
      >
        <div>
          <strong>
            ${escapeHTML(
              app.full_name ||
              "Customer"
            )}
          </strong>

          <span>
            ${escapeHTML(
              app.application_id ||
              "—"
            )}
          </span>
        </div>

        <div>
          <small>
            ${formatDate(
              app.created_at
            )}
          </small>

          <span class="crm-status">
            ${escapeHTML(
              app.status ||
              "submitted"
            )}
          </span>
        </div>
      </div>
    `)
    .join("");
}


/* ==================================================
   PAGE NAVIGATION
================================================== */

const pageConfig = {
  overview: {
    title: "Dashboard",
    subtitle:
      "Monitor customers, applications, loans and collections."
  },

  customers: {
    title: "Customers",
    subtitle:
      "Manage registered customers and customer profiles."
  },

  applications: {
    title: "Applications",
    subtitle:
      "Review and manage loan applications."
  },

  loans: {
    title: "Loan Portfolio",
    subtitle:
      "Monitor active, disbursed and closed loans."
  },

  collections: {
    title: "Collections",
    subtitle:
      "Monitor recorded EMI collections."
  },

  emi: {
    title: "EMI Center",
    subtitle:
      "Verify customer payments and manage EMI due dates."
  },

  documents: {
    title: "Documents",
    subtitle:
      "Manage customer loan documents."
  },

  inquiries: {
    title: "Eligibility",
    subtitle:
      "Review preliminary eligibility inquiries."
  },

  followups: {
    title: "Follow-ups",
    subtitle:
      "Track customer follow-ups."
  },

  reports: {
    title: "Reports",
    subtitle:
      "Generate operational reports."
  }
};


function navigateToPage(
  page
) {
  document
    .querySelectorAll(".crm-page")
    .forEach(el =>
      el.classList.remove("active")
    );

  document
    .querySelectorAll(".nav-item")
    .forEach(el =>
      el.classList.remove("active")
    );

  const nav =
    document.querySelector(
      `.nav-item[data-page="${page}"]`
    );

  if (nav) {
    nav.classList.add("active");
  }

  const title =
    pageConfig[page]?.title ||
    "CRM Module";

  const subtitle =
    pageConfig[page]?.subtitle ||
    "Shyam Fincorp Loan Operations";

  setText(
    "pageTitle",
    title
  );

  setText(
    "pageSubtitle",
    subtitle
  );

  if (page === "overview") {
    $("overviewPage")
      ?.classList.add("active");

    loadPremiumCRMDashboard();

    return;
  }

  $("genericPage")
    ?.classList.add("active");

  renderModule(page);
}


/* ==================================================
   MODULES
================================================== */

async function renderModule(
  page
) {
  const title =
    $("genericTitle");

  const text =
    $("genericText");

  const content =
    $("genericContent");

  if (!content) return;

  title.textContent =
    pageConfig[page]?.title ||
    "CRM Module";

  text.textContent =
    pageConfig[page]?.subtitle ||
    "";

  content.innerHTML =
    `<div class="crm-loading">
      Loading...
    </div>`;

  try {
    if (page === "emi") {
      renderEMICenter();
      return;
    }

    if (page === "customers") {
      await renderCustomers();
      return;
    }

    if (page === "applications") {
      await renderApplications();
      return;
    }

    if (page === "loans") {
      await renderLoans();
      return;
    }

    if (page === "collections") {
      await renderCollections();
      return;
    }

    if (page === "inquiries") {
      await renderInquiries();
      return;
    }

    if (page === "reports") {
      renderReports();
      return;
    }

    content.innerHTML =
      `<div class="crm-module-card">
        <h3>${title.textContent}</h3>
        <p>
          This module is ready for CRM operations.
        </p>
      </div>`;

  } catch (error) {
    console.error(error);

    content.innerHTML =
      `<div class="crm-error">
        ${escapeHTML(
          error.message
        )}
      </div>`;
  }
}


/* ==================================================
   EMI CENTER
================================================== */

function renderEMICenter() {
  const content =
    $("genericContent");

  content.innerHTML = `
    <div class="emi-center">

      <div class="emi-search-card">

        <div>
          <span class="crm-eyebrow">
            PAYMENT VERIFICATION
          </span>

          <h3>
            Find Customer EMI
          </h3>

          <p>
            Enter loan account number to view
            complete EMI schedule and verify
            customer payment.
          </p>
        </div>

        <div class="emi-search-row">

          <input
            type="text"
            id="emiLoanSearch"
            placeholder="Enter Loan Account No. e.g. SFLA-12345678"
          >

          <button
            class="primary-btn"
            type="button"
            onclick="searchEMILoan()"
          >
            Search EMI
          </button>

        </div>

      </div>

      <div id="emiResult">
        <div class="crm-empty-state">
          Search a loan account to view EMI schedule.
        </div>
      </div>

    </div>
  `;
}


async function searchEMILoan() {
  const input =
    $("emiLoanSearch");

  const loanNo =
    String(
      input?.value || ""
    ).trim();

  if (!loanNo) {
    showToast(
      "Please enter loan account number",
      "error"
    );

    return;
  }

  const result =
    $("emiResult");

  result.innerHTML =
    `<div class="crm-loading">
      Loading EMI schedule...
    </div>`;

  try {
    /*
      We use the admin loan list first,
      then fetch the customer/application
      information from available CRM data.
    */

    const loans =
      loansCache.length
        ? loansCache
        : await api(
            "/api/admin/loans"
          );

    const loan =
      loans.find(
        l =>
          String(
            l.loan_account_no
          ).toLowerCase() ===
          loanNo.toLowerCase()
      );

    if (!loan) {
      throw new Error(
        "Loan account not found"
      );
    }

    /*
      Current backend customer loan API
      requires application id + mobile.
      We therefore locate the application
      from CRM cache.
    */

    const applications =
      applicationsCache.length
        ? applicationsCache
        : await api(
            "/api/admin/applications"
          );

    const application =
      applications.find(
        a =>
          a.id === loan.application_id ||
          a.application_id ===
            loan.application_id
      );

    if (!application) {
      throw new Error(
        "Linked loan application not found"
      );
    }

    const data =
      await api(
        "/api/customer/loan",
        {
          method: "POST",
          body: JSON.stringify({
            application_id:
              application.application_id,
            mobile:
              application.mobile
          })
        }
      );

    currentEMIData = {
      ...data,
      adminLoan: loan
    };

    renderEMIResult(
      currentEMIData
    );

  } catch (error) {
    console.error(error);

    result.innerHTML =
      `<div class="crm-error">
        ${escapeHTML(
          error.message
        )}
      </div>`;
  }
}


function renderEMIResult(
  data
) {
  const result =
    $("emiResult");

  const loan =
    data.loan || {};

  const schedule =
    data.emi_schedule || [];

  const customer =
    data.customer || {};

  const totalOutstanding =
    schedule.reduce(
      (sum, emi) =>
        sum + outstandingAmount(emi),
      0
    );

  const overdue =
    schedule.filter(
      emi =>
        emiStatus(emi) === "overdue"
    );

  const paid =
    schedule.filter(
      emi =>
        emiStatus(emi) === "paid"
    );

  const nextDue =
    schedule.find(
      emi =>
        emiStatus(emi) !== "paid"
    );

  result.innerHTML = `

    <div class="emi-customer-header">

      <div>
        <span class="crm-eyebrow">
          LOAN ACCOUNT
        </span>

        <h3>
          ${escapeHTML(
            loan.loan_account_no ||
            "—"
          )}
        </h3>

        <p>
          ${escapeHTML(
            customer.full_name ||
            "Customer"
          )}
          •
          ${escapeHTML(
            customer.mobile ||
            "—"
          )}
        </p>
      </div>

      <div class="emi-loan-status">
        ${escapeHTML(
          loan.status ||
          "active"
        )}
      </div>

    </div>


    <div class="emi-summary-grid">

      <div class="emi-summary-card">
        <span>MONTHLY EMI</span>
        <strong>
          ${money(loan.emi)}
        </strong>
      </div>

      <div class="emi-summary-card">
        <span>OUTSTANDING</span>
        <strong>
          ${money(totalOutstanding)}
        </strong>
      </div>

      <div class="emi-summary-card">
        <span>OVERDUE EMI</span>
        <strong>
          ${overdue.length}
        </strong>
      </div>

      <div class="emi-summary-card">
        <span>PAID EMI</span>
        <strong>
          ${paid.length}
        </strong>
      </div>

    </div>


    <div class="emi-next-card">

      <div>
        <span>NEXT EMI DUE</span>

        <strong>
          ${
            nextDue
              ? formatDate(
                  nextDue.due_date
                )
              : "All EMI Paid"
          }
        </strong>
      </div>

      <div>
        <span>AMOUNT</span>

        <strong>
          ${
            nextDue
              ? money(
                  outstandingAmount(
                    nextDue
                  )
                )
              : "₹0"
          }
        </strong>
      </div>

    </div>


    <div class="emi-table-card">

      <div class="crm-panel-header">

        <div>
          <span>REPAYMENT SCHEDULE</span>
          <h2>EMI Schedule</h2>
        </div>

        <span class="emi-admin-note">
          Admin verification required
        </span>

      </div>

      <div class="crm-table-wrap">

        <table class="crm-table emi-table">

          <thead>
            <tr>
              <th>EMI</th>
              <th>Due Date</th>
              <th>EMI Amount</th>
              <th>Paid</th>
              <th>Outstanding</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            ${
              schedule.map(
                emi => {

                  const status =
                    emiStatus(emi);

                  const outstanding =
                    outstandingAmount(
                      emi
                    );

                  return `
                    <tr>

                      <td>
                        <strong>
                          #${emi.installment_no}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          ${formatDate(
                            emi.due_date
                          )}
                        </strong>
                      </td>

                      <td>
                        ${money(
                          emi.total_due
                        )}
                      </td>

                      <td>
                        ${money(
                          emi.paid_amount
                        )}
                      </td>

                      <td>
                        <strong>
                          ${money(
                            outstanding
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          class="emi-status ${status}"
                        >
                          ${emiStatusLabel(
                            emi
                          )}
                        </span>
                      </td>

                      <td>

                        ${
                          status !== "paid"
                            ? `
                              <button
                                class="emi-verify-btn"
                                onclick="openPaymentVerification(${emi.installment_no})"
                              >
                                ✓ Verify Payment
                              </button>
                            `
                            : `
                              <span class="emi-paid-label">
                                ✓ Verified
                              </span>
                            `
                        }

                      </td>

                    </tr>
                  `;
                }
              ).join("")
            }

          </tbody>

        </table>

      </div>

    </div>
  `;
}


/* ==================================================
   PAYMENT VERIFICATION MODAL
================================================== */

function openPaymentVerification(
  installmentNo
) {
  if (!currentEMIData) {
    return;
  }

  const emi =
    currentEMIData.emi_schedule.find(
      e =>
        Number(e.installment_no) ===
        Number(installmentNo)
    );

  if (!emi) {
    showToast(
      "EMI not found",
      "error"
    );

    return;
  }

  const outstanding =
    outstandingAmount(emi);

  if (outstanding <= 0) {
    showToast(
      "This EMI is already paid",
      "error"
    );

    return;
  }

  closeCRMModal();

  const modal =
    document.createElement("div");

  modal.id =
    "paymentVerifyModal";

  modal.className =
    "crm-modal-overlay";

  modal.innerHTML = `

    <div class="crm-modal payment-modal">

      <div class="crm-modal-header">

        <div>
          <span class="crm-eyebrow">
            ADMIN VERIFICATION
          </span>

          <h2>
            Verify EMI Payment
          </h2>
        </div>

        <button
          type="button"
          class="crm-modal-close"
          onclick="closeCRMModal()"
        >
          ×
        </button>

      </div>


      <div class="payment-verification-banner">

        <div>
          <span>
            EMI INSTALLMENT
          </span>

          <strong>
            #${emi.installment_no}
          </strong>
        </div>

        <div>
          <span>
            DUE DATE
          </span>

          <strong>
            ${formatDate(
              emi.due_date
            )}
          </strong>
        </div>

        <div>
          <span>
            OUTSTANDING
          </span>

          <strong>
            ${money(outstanding)}
          </strong>
        </div>

      </div>


      <form
        id="manualPaymentForm"
        class="crm-form-grid"
      >

        <div class="crm-form-group">

          <label>
            Loan Account
          </label>

          <input
            value="${escapeHTML(
              currentEMIData.loan
                .loan_account_no
            )}"
            readonly
          >

        </div>


        <div class="crm-form-group">

          <label>
            Customer
          </label>

          <input
            value="${escapeHTML(
              currentEMIData.customer
                .full_name ||
                ""
            )}"
            readonly
          >

        </div>


        <div class="crm-form-group">

          <label>
            Payment Date
          </label>

          <input
            type="date"
            id="manualPaymentDate"
            value="${todayISO()}"
            required
          >

        </div>


        <div class="crm-form-group">

          <label>
            Payment Amount
          </label>

          <input
            type="number"
            id="manualPaymentAmount"
            value="${outstanding}"
            min="1"
            max="${outstanding}"
            step="0.01"
            required
          >

        </div>


        <div class="crm-form-group">

          <label>
            Payment Mode
          </label>

          <select
            id="manualPaymentMethod"
            required
          >

            <option value="">
              Select payment mode
            </option>

            <option value="UPI">
              UPI
            </option>

            <option value="Bank Transfer">
              Bank Transfer
            </option>

            <option value="Cash">
              Cash
            </option>

            <option value="Cheque">
              Cheque
            </option>

            <option value="Other">
              Other
            </option>

          </select>

        </div>


        <div class="crm-form-group">

          <label>
            UTR / Transaction Reference
          </label>

          <input
            type="text"
            id="manualPaymentReference"
            placeholder="Enter UTR / transaction ID"
          >

        </div>


        <div class="crm-form-group full">

          <label>
            Verification Remarks
          </label>

          <textarea
            id="manualPaymentRemarks"
            rows="3"
            placeholder="Example: UPI payment verified from customer receipt."
          ></textarea>

        </div>


        <div class="payment-security-note">

          🔐
          <span>
            This action is restricted to CRM Admin.
            Payment will be recorded only after
            verification.
          </span>

        </div>


        <div class="crm-modal-actions">

          <button
            type="button"
            class="secondary-btn"
            onclick="closeCRMModal()"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="primary-btn"
          >
            ✓ Verify & Record Payment
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(
    modal
  );

  $("manualPaymentForm")
    .addEventListener(
      "submit",
      submitManualPayment
    );
}


async function submitManualPayment(
  event
) {
  event.preventDefault();

  if (!currentEMIData) {
    return;
  }

  const emi =
    currentEMIData.emi_schedule.find(
      e =>
        Number(e.installment_no) ===
        Number(
          currentEMIData
            .selectedInstallment
        )
    );

  const installmentNo =
    emi
      ? emi.installment_no
      : getSelectedInstallmentFromModal();

  const amount =
    Number(
      $("manualPaymentAmount")
        ?.value || 0
    );

  const outstanding =
    emi
      ? outstandingAmount(emi)
      : amount;

  if (
    !amount ||
    amount <= 0
  ) {
    showToast(
      "Enter valid payment amount",
      "error"
    );

    return;
  }

  if (amount > outstanding) {
    showToast(
      "Payment cannot exceed outstanding amount",
      "error"
    );

    return;
  }

  const button =
    document.querySelector(
      "#manualPaymentForm .primary-btn"
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "Verifying...";
  }

  try {
    const result =
      await api(
        "/api/admin/payments/manual",
        {
          method: "POST",

          body: JSON.stringify({
            loan_account_no:
              currentEMIData.loan
                .loan_account_no,

            installment_no:
              installmentNo,

            amount,

            payment_date:
              $("manualPaymentDate")
                ?.value,

            payment_method:
              $("manualPaymentMethod")
                ?.value,

            transaction_reference:
              $("manualPaymentReference")
                ?.value
                .trim(),

            remarks:
              $("manualPaymentRemarks")
                ?.value
                .trim()
          })
        }
      );

    closeCRMModal();

    showToast(
      result.message ||
        "Payment verified successfully"
    );

    // Refresh EMI schedule
    await searchEMILoan();

    // Refresh dashboard cache
    await loadPremiumCRMDashboard();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
        "Payment verification failed",
      "error"
    );

    if (button) {
      button.disabled = false;
      button.textContent =
        "✓ Verify & Record Payment";
    }
  }
}


/*
  Store selected EMI before modal submit.
*/
const originalOpenPaymentVerification =
  openPaymentVerification;

openPaymentVerification =
  function(installmentNo) {

    if (currentEMIData) {
      currentEMIData
        .selectedInstallment =
        installmentNo;
    }

    originalOpenPaymentVerification(
      installmentNo
    );
  };


function getSelectedInstallmentFromModal() {
  return currentEMIData
    ?.selectedInstallment || 0;
}


function closeCRMModal() {
  document
    .querySelectorAll(
      ".crm-modal-overlay"
    )
    .forEach(el =>
      el.remove()
    );
}


/* ==================================================
   CUSTOMERS
================================================== */

async function renderCustomers() {
  const content =
    $("genericContent");

  if (!customersCache.length) {
    customersCache =
      await api(
        "/api/admin/customers"
      );
  }

  if (!customersCache.length) {
    content.innerHTML =
      `<div class="crm-empty-state">
        No customers found.
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="crm-table-card">

      <div class="crm-panel-header">
        <div>
          <span>CUSTOMER MANAGEMENT</span>
          <h2>All Customers</h2>
        </div>
      </div>

      <div class="crm-table-wrap">

        <table class="crm-table">

          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Created</th>
            </tr>
          </thead>

          <tbody>

            ${customersCache.map(
              customer => `
                <tr
                  onclick='openCustomerDetail(${JSON.stringify(customer)})'
                >

                  <td>
                    <strong>
                      ${escapeHTML(
                        customer.full_name ||
                        "—"
                      )}
                    </strong>
                  </td>

                  <td>
                    ${escapeHTML(
                      customer.mobile ||
                      "—"
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      customer.email ||
                      "—"
                    )}
                  </td>

                  <td>
                    ${formatDate(
                      customer.created_at
                    )}
                  </td>

                </tr>
              `
            ).join("")}

          </tbody>

        </table>

      </div>

    </div>
  `;
}


/* ==================================================
   APPLICATIONS
================================================== */

async function renderApplications() {
  const content =
    $("genericContent");

  if (!applicationsCache.length) {
    applicationsCache =
      await api(
        "/api/admin/applications"
      );
  }

  content.innerHTML = `
    <div class="crm-table-card">

      <div class="crm-panel-header">
        <div>
          <span>APPLICATION PIPELINE</span>
          <h2>Loan Applications</h2>
        </div>
      </div>

      <div class="crm-table-wrap">

        <table class="crm-table">

          <thead>
            <tr>
              <th>Application</th>
              <th>Customer</th>
              <th>Mobile</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>

            ${applicationsCache.map(
              app => `
                <tr
                  onclick='openApplicationDetail(${JSON.stringify(app)})'
                >

                  <td>
                    <strong>
                      ${escapeHTML(
                        app.application_id ||
                        "—"
                      )}
                    </strong>
                  </td>

                  <td>
                    ${escapeHTML(
                      app.full_name ||
                      "—"
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
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
                      ${escapeHTML(
                        app.status ||
                        "submitted"
                      )}
                    </span>
                  </td>

                  <td>
                    ${formatDate(
                      app.created_at
                    )}
                  </td>

                </tr>
              `
            ).join("")}

          </tbody>

        </table>

      </div>

    </div>
  `;
}


/* ==================================================
   LOANS
================================================== */

async function renderLoans() {
  const content =
    $("genericContent");

  if (!loansCache.length) {
    loansCache =
      await api(
        "/api/admin/loans"
      );
  }

  content.innerHTML = `
    <div class="crm-table-card">

      <div class="crm-panel-header">
        <div>
          <span>LOAN PORTFOLIO</span>
          <h2>Loan Accounts</h2>
        </div>
      </div>

      <div class="crm-table-wrap">

        <table class="crm-table">

          <thead>
            <tr>
              <th>Loan Account</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>EMI</th>
              <th>Tenure</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            ${loansCache.map(
              loan => `
                <tr
                  onclick='openLoanDetail(${JSON.stringify(loan)})'
                >

                  <td>
                    <strong>
                      ${escapeHTML(
                        loan.loan_account_no ||
                        "—"
                      )}
                    </strong>
                  </td>

                  <td>
                    ${money(
                      loan.principal
                    )}
                  </td>

                  <td>
                    ${
                      Number(
                        loan.annual_interest_rate ||
                        0
                      )
                    }%
                  </td>

                  <td>
                    ${money(
                      loan.emi
                    )}
                  </td>

                  <td>
                    ${
                      loan.tenure_months ||
                      0
                    } months
                  </td>

                  <td>
                    <span class="crm-status">
                      ${escapeHTML(
                        loan.status ||
                        "active"
                      )}
                    </span>
                  </td>

                </tr>
              `
            ).join("")}

          </tbody>

        </table>

      </div>

    </div>
  `;
}


/* ==================================================
   COLLECTIONS
================================================== */

async function renderCollections() {
  const content =
    $("genericContent");

  if (!paymentsCache.length) {
    paymentsCache =
      await api(
        "/api/admin/payments"
      );
  }

  const total =
    paymentsCache.reduce(
      (sum, p) =>
        sum +
        Number(
          p.amount || 0
        ),
      0
    );

  content.innerHTML = `
    <div class="collection-summary">

      <div>
        <span>TOTAL COLLECTION</span>
        <strong>
          ${money(total)}
        </strong>
      </div>

      <div>
        <span>TRANSACTIONS</span>
        <strong>
          ${paymentsCache.length}
        </strong>
      </div>

    </div>

    <div class="crm-table-card">

      <div class="crm-panel-header">
        <div>
          <span>PAYMENT HISTORY</span>
          <h2>Verified Collections</h2>
        </div>
      </div>

      <div class="crm-table-wrap">

        <table class="crm-table">

          <thead>
            <tr>
              <th>Loan Account</th>
              <th>Amount</th>
              <th>Payment Mode</th>
              <th>Reference</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            ${paymentsCache.map(
              payment => `

                <tr
                  onclick='openPaymentDetail(${JSON.stringify(payment)})'
                >

                  <td>
                    <strong>
                      ${
                        payment.loan_accounts
                          ?.loan_account_no ||
                        "—"
                      }
                    </strong>
                  </td>

                  <td>
                    ${money(
                      payment.amount
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      payment.payment_method ||
                      "—"
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      payment.transaction_reference ||
                      "—"
                    )}
                  </td>

                  <td>
                    ${formatDate(
                      payment.payment_date
                    )}
                  </td>

                  <td>
                    <span class="emi-status paid">
                      ${escapeHTML(
                        payment.status ||
                        "received"
                      )}
                    </span>
                  </td>

                </tr>

              `
            ).join("")}

          </tbody>

        </table>

      </div>

    </div>
  `;
}


/* ==================================================
   INQUIRIES
================================================== */

async function renderInquiries() {
  const content =
    $("genericContent");

  try {
    inquiriesCache =
      await api(
        "/api/admin/inquiries"
      );
  } catch (error) {
    content.innerHTML =
      `<div class="crm-error">
        ${escapeHTML(
          error.message
        )}
      </div>`;

    return;
  }

  content.innerHTML = `
    <div class="crm-table-card">

      <div class="crm-panel-header">
        <div>
          <span>ELIGIBILITY</span>
          <h2>Preliminary Inquiries</h2>
        </div>
      </div>

      <div class="crm-table-wrap">

        <table class="crm-table">

          <thead>
            <tr>
              <th>Inquiry</th>
              <th>Customer</th>
              <th>Income</th>
              <th>Requested</th>
              <th>Estimated EMI</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            ${inquiriesCache.map(
              inquiry => `
                <tr
                  onclick='openInquiryDetail(${JSON.stringify(inquiry)})'
                >

                  <td>
                    <strong>
                      ${escapeHTML(
                        inquiry.inquiry_id ||
                        "—"
                      )}
                    </strong>
                  </td>

                  <td>
                    ${escapeHTML(
                      inquiry.full_name ||
                      "—"
                    )}
                  </td>

                  <td>
                    ${money(
                      inquiry.monthly_income
                    )}
                  </td>

                  <td>
                    ${money(
                      inquiry.requested_amount
                    )}
                  </td>

                  <td>
                    ${money(
                      inquiry.estimated_emi
                    )}
                  </td>

                  <td>
                    <span class="crm-status">
                      ${escapeHTML(
                        inquiry.eligibility_status ||
                        "—"
                      )}
                    </span>
                  </td>

                </tr>
              `
            ).join("")}

          </tbody>

        </table>

      </div>

    </div>
  `;
}


/* ==================================================
   REPORTS
================================================== */

function renderReports() {
  const content =
    $("genericContent");

  const reports = [
    ["applications", "Applications Report"],
    ["customers", "Customers Report"],
    ["loans", "Loan Portfolio Report"],
    ["payments", "Payments Report"],
    ["inquiries", "Eligibility Report"]
  ];

  content.innerHTML = `
    <div class="crm-report-grid">

      ${reports.map(
        ([type, title]) => `
          <div class="crm-report-card">

            <span>REPORT</span>

            <h3>
              ${title}
            </h3>

            <button
              class="primary-btn"
              onclick="downloadReport('${type}')"
            >
              Download CSV
            </button>

          </div>
        `
      ).join("")}

    </div>
  `;
}


async function downloadReport(
  type
) {
  try {
    const result =
      await api(
        `/api/admin/report/${type}`
      );

    const rows =
      result.data || [];

    if (!rows.length) {
      showToast(
        "No data available",
        "error"
      );

      return;
    }

    const headers =
      Object.keys(rows[0]);

    const csv = [
      headers.join(","),
      ...rows.map(row =>
        headers.map(
          key =>
            `"${String(
              row[key] ?? ""
            ).replace(
              /"/g,
              '""'
            )}"`
        ).join(",")
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
      URL.createObjectURL(
        blob
      );

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      `shyam-fincorp-${type}-report.csv`;

    a.click();

    URL.revokeObjectURL(
      url
    );

  } catch (error) {
    showToast(
      error.message,
      "error"
    );
  }
}


/* ==================================================
   DETAIL MODALS
================================================== */

function openCustomerDetail(
  customer
) {
  openSimpleModal(
    "Customer Profile",
    `
      <div class="detail-grid">

        <div>
          <span>Name</span>
          <strong>
            ${escapeHTML(
              customer.full_name ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <span>Mobile</span>
          <strong>
            ${escapeHTML(
              customer.mobile ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <span>Email</span>
          <strong>
            ${escapeHTML(
              customer.email ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <span>Address</span>
          <strong>
            ${escapeHTML(
              customer.address ||
              "—"
            )}
          </strong>
        </div>

      </div>
    `
  );
}


function openApplicationDetail(
  application
) {
  openSimpleModal(
    "Loan Application",
    `
      <div class="detail-grid">

        <div>
          <span>Application ID</span>
          <strong>
            ${escapeHTML(
              application.application_id ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <span>Customer</span>
          <strong>
            ${escapeHTML(
              application.full_name ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <span>Mobile</span>
          <strong>
            ${escapeHTML(
              application.mobile ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <span>Requested Amount</span>
          <strong>
            ${money(
              application.requested_amount
            )}
          </strong>
        </div>

        <div>
          <span>Status</span>
          <strong>
            ${escapeHTML(
              application.status ||
              "—"
            )}
          </strong>
        </div>

      </div>
    `
  );
}


function openLoanDetail(
  loan
) {
  openSimpleModal(
    "Loan Account",
    `
      <div class="detail-grid">

        <div>
          <span>Loan Account</span>
          <strong>
            ${escapeHTML(
              loan.loan_account_no ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <span>Principal</span>
          <strong>
            ${money(
              loan.principal
            )}
          </strong>
        </div>

        <div>
          <span>EMI</span>
          <strong>
            ${money(
              loan.emi
            )}
          </strong>
        </div>

        <div>
          <span>Interest Rate</span>
          <strong>
            ${loan.annual_interest_rate || 0}%
          </strong>
        </div>

        <div>
          <span>Tenure</span>
          <strong>
            ${loan.tenure_months || 0}
            months
          </strong>
        </div>

        <div>
          <span>Status</span>
          <strong>
            ${escapeHTML(
              loan.status ||
              "—"
            )}
          </strong>
        </div>

      </div>
    `
  );
}


function openPaymentDetail(
  payment
) {
  openSimpleModal(
    "Payment Details",
    `
      <div class="detail-grid">

        <div>
          <span>Loan Account</span>
          <strong>
            ${
              payment.loan_accounts
                ?.loan_account_no ||
              "—"
            }
          </strong>
        </div>

        <div>
          <span>Amount</span>
          <strong>
            ${money(
              payment.amount
            )}
          </strong>
        </div>

        <div>
          <span>Payment Mode</span>
          <strong>
            ${escapeHTML(
              payment.payment_method ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <span>Reference</span>
          <strong>
            ${escapeHTML(
              payment.transaction_reference ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <span>Payment Date</span>
          <strong>
            ${formatDate(
              payment.payment_date
            )}
          </strong>
        </div>

        <div>
          <span>Status</span>
          <strong>
            ${escapeHTML(
              payment.status ||
              "received"
            )}
          </strong>
        </div>

      </div>
    `
  );
}


function openInquiryDetail(
  inquiry
) {
  openSimpleModal(
    "Eligibility Inquiry",
    `
      <div class="detail-grid">

        <div>
          <span>Inquiry ID</span>
          <strong>
            ${escapeHTML(
              inquiry.inquiry_id ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <span>Customer</span>
          <strong>
            ${escapeHTML(
              inquiry.full_name ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <span>Mobile</span>
          <strong>
            ${escapeHTML(
              inquiry.mobile ||
              "—"
            )}
          </strong>
        </div>

        <div>
          <span>Monthly Income</span>
          <strong>
            ${money(
              inquiry.monthly_income
            )}
          </strong>
        </div>

        <div>
          <span>Existing EMI</span>
          <strong>
            ${money(
              inquiry.existing_emi
            )}
          </strong>
        </div>

        <div>
          <span>Requested Amount</span>
          <strong>
            ${money(
              inquiry.requested_amount
            )}
          </strong>
        </div>

        <div>
          <span>Estimated EMI</span>
          <strong>
            ${money(
              inquiry.estimated_emi
            )}
          </strong>
        </div>

        <div>
          <span>Eligibility</span>
          <strong>
            ${escapeHTML(
              inquiry.eligibility_status ||
              "—"
            )}
          </strong>
        </div>

      </div>
    `
  );
}


function openSimpleModal(
  title,
  html
) {
  closeCRMModal();

  const modal =
    document.createElement("div");

  modal.className =
    "crm-modal-overlay";

  modal.innerHTML = `

    <div class="crm-modal">

      <div class="crm-modal-header">

        <h2>
          ${escapeHTML(title)}
        </h2>

        <button
          class="crm-modal-close"
          onclick="closeCRMModal()"
        >
          ×
        </button>

      </div>

      ${html}

    </div>
  `;

  document.body.appendChild(
    modal
  );
}


/* ==================================================
   SEARCH
================================================== */

async function globalSearch() {
  const q =
    String(
      $("globalSearch")
        ?.value || ""
    ).trim();

  if (!q) {
    showToast(
      "Enter something to search",
      "error"
    );

    return;
  }

  try {
    const result =
      await api(
        `/api/admin/search?q=${encodeURIComponent(q)}`
      );

    renderSearchResults(
      result
    );

  } catch (error) {
    showToast(
      error.message,
      "error"
    );
  }
}


function renderSearchResults(
  result
) {
  const customers =
    result.customers || [];

  const applications =
    result.applications || [];

  const loans =
    result.loans || [];

  openSimpleModal(
    `Search Results: ${result.query}`,
    `

      <div class="search-result-section">

        <h3>
          Customers (${customers.length})
        </h3>

        ${
          customers.length
            ? customers.map(
                c => `
                  <button
                    class="search-result-row"
                    onclick='openCustomerDetail(${JSON.stringify(c)})'
                  >
                    <strong>
                      ${escapeHTML(
                        c.full_name ||
                        "—"
                      )}
                    </strong>

                    <span>
                      ${escapeHTML(
                        c.mobile ||
                        "—"
                      )}
                    </span>
                  </button>
                `
              ).join("")
            : "<p>No customers found.</p>"
        }

      </div>


      <div class="search-result-section">

        <h3>
          Applications (${applications.length})
        </h3>

        ${
          applications.length
            ? applications.map(
                a => `
                  <button
                    class="search-result-row"
                    onclick='openApplicationDetail(${JSON.stringify(a)})'
                  >
                    <strong>
                      ${escapeHTML(
                        a.application_id ||
                        "—"
                      )}
                    </strong>

                    <span>
                      ${escapeHTML(
                        a.full_name ||
                        "—"
                      )}
                    </span>
                  </button>
                `
              ).join("")
            : "<p>No applications found.</p>"
        }

      </div>


      <div class="search-result-section">

        <h3>
          Loans (${loans.length})
        </h3>

        ${
          loans.length
            ? loans.map(
                l => `
                  <button
                    class="search-result-row"
                    onclick='openLoanDetail(${JSON.stringify(l)})'
                  >
                    <strong>
                      ${escapeHTML(
                        l.loan_account_no ||
                        "—"
                      )}
                    </strong>

                    <span>
                      ${money(
                        l.principal
                      )}
                    </span>
                  </button>
                `
              ).join("")
            : "<p>No loans found.</p>"
        }

      </div>

    `
  );
}


/* ==================================================
   HTML SECURITY
================================================== */

function escapeHTML(
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


/* ==================================================
   INIT
================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    if (!checkCRMAuth()) {
      return;
    }

    updateAdminName();

    document
      .querySelectorAll(
        ".nav-item"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            navigateToPage(
              button.dataset.page
            );
          }
        );

      });


    document
      .querySelectorAll(
        "[data-page-link]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            navigateToPage(
              button.dataset.pageLink
            );
          }
        );

      });


    $("searchButton")
      ?.addEventListener(
        "click",
        globalSearch
      );


    $("globalSearch")
      ?.addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Enter"
          ) {
            globalSearch();
          }

        }
      );


    $("logoutBtn")
      ?.addEventListener(
        "click",
        logoutCRM
      );


    $("mobileMenu")
      ?.addEventListener(
        "click",
        () => {

          document
            .querySelector(
              ".crm-sidebar"
            )
            ?.classList.toggle(
              "open"
            );

        }
      );


    loadPremiumCRMDashboard();

  }
);
