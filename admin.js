const API_BASE = "https://shyam-fincorp.onrender.com";

let adminKey = "";

// -----------------------------
// Helpers
// -----------------------------

function showMessage(elementId, message, type) {
  const element = document.getElementById(elementId);

  if (!element) return;

  element.textContent = message;
  element.className = "message " + type;
}

function formatMoney(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// -----------------------------
// Login
// -----------------------------

document
  .getElementById("loginButton")
  .addEventListener("click", function () {

    const key =
      document.getElementById("adminKey").value.trim();

    if (!key) {
      showMessage(
        "loginMessage",
        "Admin Key डालें।",
        "error"
      );
      return;
    }

    adminKey = key;

    loadApplications();
  });


// -----------------------------
// Load Applications
// -----------------------------

async function loadApplications() {

  showMessage(
    "loginMessage",
    "Admin panel check हो रहा है...",
    "success"
  );

  try {

    const response = await fetch(
      API_BASE + "/api/applications",
      {
        method: "GET",

        headers: {
          "x-admin-key": adminKey
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Admin login failed"
      );
    }

    document
      .getElementById("loginSection")
      .classList.add("hidden");

    document
      .getElementById("adminSection")
      .classList.remove("hidden");

    document.getElementById("adminStatus").textContent =
      "Admin Logged In";

    displayApplications(result);

    // Load eligibility inquiries automatically
    loadInquiries();

  } catch (error) {

    console.error(error);

    adminKey = "";

    showMessage(
      "loginMessage",
      error.message || "Admin login failed",
      "error"
    );
  }
}


// -----------------------------
// Eligibility Inquiries
// -----------------------------

async function loadInquiries() {

  const container =
    document.getElementById("inquiriesList");

  if (!container) return;

  container.innerHTML =
    "<p>Eligibility inquiries load हो रही हैं...</p>";

  try {

    const response = await fetch(
      API_BASE + "/api/admin/inquiries",
      {
        method: "GET",

        headers: {
          "x-admin-key": adminKey
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Eligibility inquiries load नहीं हुईं"
      );
    }

    const inquiries = result.inquiries || [];

    if (!inquiries.length) {

      container.innerHTML = `
        <div class="application-card">
          अभी कोई eligibility inquiry नहीं है।
        </div>
      `;

      return;
    }

    let html = `
      <table>

        <thead>

          <tr>
            <th>Inquiry ID</th>
            <th>Customer</th>
            <th>Mobile</th>
            <th>Loan Amount</th>
            <th>Income</th>
            <th>Tenure</th>
            <th>Estimated EMI</th>
            <th>Rate</th>
            <th>Status</th>
            <th>Date</th>
          </tr>

        </thead>

        <tbody>
    `;

    inquiries.forEach(function (inquiry) {

      let statusClass = "status-blue";

      if (
        inquiry.eligibility_status ===
        "likely_eligible"
      ) {
        statusClass = "status-green";
      }

      if (
        inquiry.eligibility_status ===
        "not_eligible"
      ) {
        statusClass = "status-red";
      }

      let statusText =
        inquiry.eligibility_status || "under_review";

      if (statusText === "likely_eligible") {
        statusText = "Likely Eligible";
      } else if (statusText === "needs_review") {
        statusText = "Needs Review";
      } else if (statusText === "not_eligible") {
        statusText = "Not Eligible";
      }

      html += `

        <tr>

          <td>
            ${escapeHtml(inquiry.inquiry_id)}
          </td>

          <td>
            <strong>
              ${escapeHtml(inquiry.full_name)}
            </strong>

            ${
              inquiry.email
                ? `<br>
                   <small>
                     ${escapeHtml(inquiry.email)}
                   </small>`
                : ""
            }
          </td>

          <td>
            ${escapeHtml(inquiry.mobile)}
          </td>

          <td>
            ${formatMoney(inquiry.requested_amount)}
          </td>

          <td>
            ${formatMoney(inquiry.monthly_income)}
          </td>

          <td>
            ${escapeHtml(inquiry.tenure_months)}
            months
          </td>

          <td>
            ${formatMoney(inquiry.estimated_emi)}
          </td>

          <td>
            ${
              inquiry.estimated_interest_rate
                ? escapeHtml(
                    inquiry.estimated_interest_rate
                  ) + "%"
                : "-"
            }
          </td>

          <td>

            <span class="status ${statusClass}">
              ${escapeHtml(statusText)}
            </span>

            ${
              inquiry.eligibility_reason
                ? `<br>
                   <small>
                     ${escapeHtml(
                       inquiry.eligibility_reason
                     )}
                   </small>`
                : ""
            }

          </td>

          <td>
            ${
              inquiry.created_at
                ? new Date(
                    inquiry.created_at
                  ).toLocaleString("en-IN")
                : "-"
            }
          </td>

        </tr>

      `;
    });

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;

  } catch (error) {

    console.error(error);

    container.innerHTML = `

      <div
        class="message error"
        style="display:block;"
      >
        ${escapeHtml(error.message)}
      </div>

    `;
  }
}


// -----------------------------
// Display Applications
// -----------------------------

function displayApplications(applications) {

  const container =
    document.getElementById("applicationsList");

  if (!applications.length) {

    container.innerHTML = `

      <div class="application-card">
        अभी कोई loan application नहीं है।
      </div>

    `;

    return;
  }

  container.innerHTML = "";

  applications.forEach(function (application) {

    const card =
      document.createElement("div");

    card.className = "application-card";

    card.innerHTML = `

      <h3>
        ${escapeHtml(application.full_name)}
      </h3>

      <p>
        <strong>Application ID:</strong>
        ${escapeHtml(application.application_id)}
      </p>

      <p>
        <strong>Status:</strong>

        <span class="status">
          ${escapeHtml(application.status)}
        </span>
      </p>

      <div class="info-grid">

        <div class="info">
          <small>Mobile</small>
          ${escapeHtml(application.mobile)}
        </div>

        <div class="info">
          <small>Monthly Income</small>
          ${formatMoney(application.monthly_income)}
        </div>

        <div class="info">
          <small>Requested Amount</small>
          ${formatMoney(application.requested_amount)}
        </div>

        <div class="info">
          <small>Tenure</small>
          ${escapeHtml(application.tenure_months)}
          months
        </div>

        <div class="info">
          <small>Email</small>
          ${escapeHtml(application.email || "-")}
        </div>

        <div class="info">
          <small>Address</small>
          ${escapeHtml(application.address)}
        </div>

      </div>


      <div class="loan-form">

        <h3>Create Loan Account</h3>

        <label>
          Principal / Loan Amount
        </label>

        <input
          type="number"
          id="principal-${application.id}"
          value="${application.requested_amount}"
          min="1"
        >

        <label>
          Annual Interest Rate (%)
        </label>

        <input
          type="number"
          id="rate-${application.id}"
          value="12"
          min="0"
          step="0.01"
        >

        <label>
          Tenure (Months)
        </label>

        <input
          type="number"
          id="tenure-${application.id}"
          value="${application.tenure_months}"
          min="1"
          max="120"
        >

        <button
          type="button"
          class="green"
          onclick="createLoan(
            '${application.application_id}',
            '${application.id}'
          )"
        >
          Create Loan Account & Generate EMI
        </button>

        <br>

        <button
          type="button"
          class="gray"
          onclick="updateStatus(
            '${application.application_id}',
            'under_review'
          )"
        >
          Under Review
        </button>

        <button
          type="button"
          onclick="updateStatus(
            '${application.application_id}',
            'approved'
          )"
        >
          Approve
        </button>

        <button
          type="button"
          onclick="updateStatus(
            '${application.application_id}',
            'rejected'
          )"
        >
          Reject
        </button>

      </div>

    `;

    container.appendChild(card);

  });
}


// -----------------------------
// Create Loan Account
// -----------------------------

async function createLoan(
  applicationId,
  databaseId
) {

  const principal =
    Number(
      document.getElementById(
        "principal-" + databaseId
      ).value
    );

  const rate =
    Number(
      document.getElementById(
        "rate-" + databaseId
      ).value
    );

  const tenure =
    Number(
      document.getElementById(
        "tenure-" + databaseId
      ).value
    );

  if (!principal || principal <= 0) {

    alert("Loan amount सही डालें।");

    return;
  }

  if (rate < 0) {

    alert("Interest rate सही डालें।");

    return;
  }

  if (!tenure || tenure <= 0) {

    alert("Tenure सही डालें।");

    return;
  }

  const confirmed = confirm(

    "क्या आप इस application का Loan Account बनाना चाहते हैं?\n\n" +

    "Application ID: " +
    applicationId +

    "\n" +

    "Loan Amount: " +
    formatMoney(principal) +

    "\n" +

    "Interest Rate: " +
    rate +
    "%" +

    "\n" +

    "Tenure: " +
    tenure +
    " months"

  );

  if (!confirmed) {
    return;
  }

  try {

    const response = await fetch(
      API_BASE + "/api/admin/loan-accounts",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey
        },

        body: JSON.stringify({

          application_id: applicationId,

          principal: principal,

          annual_interest_rate: rate,

          tenure_months: tenure

        })
      }
    );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.error ||
        "Loan account create नहीं हुआ"
      );
    }

    alert(

      "Loan Account Successfully Created!\n\n" +

      "Loan Account No.: " +
      result.loan_account_no +

      "\n" +

      "Monthly EMI: " +
      formatMoney(result.emi) +

      "\n" +

      "Tenure: " +
      result.tenure_months +
      " months"

    );

    loadApplications();

  } catch (error) {

    console.error(error);

    alert(
      error.message ||
      "Loan account create करते समय error आया।"
    );
  }
}


// -----------------------------
// Update Application Status
// -----------------------------

async function updateStatus(
  applicationId,
  status
) {

  try {

    const response = await fetch(

      API_BASE +
      "/api/applications/" +
      encodeURIComponent(applicationId) +
      "/status",

      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey
        },

        body: JSON.stringify({
          status: status
        })
      }
    );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.error ||
        "Status update नहीं हुआ"
      );
    }

    showMessage(
      "applicationMessage",
      "Application status updated: " + status,
      "success"
    );

    loadApplications();

  } catch (error) {

    console.error(error);

    showMessage(
      "applicationMessage",
      error.message ||
      "Status update failed",
      "error"
    );
  }
}


// -----------------------------
// Refresh Applications
// -----------------------------

document
  .getElementById("refreshButton")
  .addEventListener(
    "click",
    loadApplications
  );


// -----------------------------
// Refresh Eligibility Inquiries
// -----------------------------

document
  .getElementById("inquiriesButton")
  .addEventListener(
    "click",
    loadInquiries
  );


// -----------------------------
// Payment Records
// -----------------------------

document
  .getElementById("paymentsButton")
  .addEventListener(
    "click",
    loadPayments
  );


async function loadPayments() {

  const container =
    document.getElementById("paymentsList");

  container.innerHTML =
    "<p>Payments load हो रहे हैं...</p>";

  try {

    const response = await fetch(
      API_BASE + "/api/admin/payments",
      {
        method: "GET",

        headers: {
          "x-admin-key": adminKey
        }
      }
    );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.error ||
        "Payments load नहीं हुए"
      );
    }

    if (!result.length) {

      container.innerHTML =
        "<p>अभी कोई payment record नहीं है।";

      return;
    }

    let html = `

      <table>

        <thead>

          <tr>

            <th>Loan Account</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Reference</th>
            <th>Date</th>
            <th>Status</th>

          </tr>

        </thead>

        <tbody>

    `;

    result.forEach(function (payment) {

      html += `

        <tr>

          <td>
            ${escapeHtml(
              payment.loan_accounts?.loan_account_no || "-"
            )}
          </td>

          <td>
            ${formatMoney(payment.amount)}
          </td>

          <td>
            ${escapeHtml(
              payment.payment_method || "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              payment.transaction_reference || "-"
            )}
          </td>

          <td>
            ${
              payment.payment_date
                ? new Date(
                    payment.payment_date
                  ).toLocaleString("en-IN")
                : "-"
            }
          </td>

          <td>
            ${escapeHtml(
              payment.status || "-"
            )}
          </td>

        </tr>

      `;
    });

    html += `

        </tbody>

      </table>

    `;

    container.innerHTML = html;

  } catch (error) {

    console.error(error);

    container.innerHTML = `

      <div
        class="message error"
        style="display:block;"
      >
        ${escapeHtml(error.message)}
      </div>

    `;
  }
}
