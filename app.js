const API_BASE = "https://shyam-fincorp.onrender.com";

let currentLoanData = null;

// -----------------------------
// Common helpers
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

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN");
}

// -----------------------------
// Loan Application
// -----------------------------

const loanForm = document.getElementById("loanForm");

if (loanForm) {
  loanForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    showMessage(
      "applicationMessage",
      "Application submit हो रही है...",
      "success"
    );

    const data = {
      full_name: document.getElementById("full_name").value.trim(),
      mobile: document.getElementById("mobile").value.trim(),
      email: document.getElementById("email").value.trim(),
      monthly_income: Number(
        document.getElementById("monthly_income").value
      ),
      requested_amount: Number(
        document.getElementById("requested_amount").value
      ),
      tenure_months: Number(
        document.getElementById("tenure_months").value
      ),
      address: document.getElementById("address").value.trim()
    };

    try {
      const response = await fetch(
        API_BASE + "/api/applications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Application submit नहीं हुई"
        );
      }

      showMessage(
        "applicationMessage",
        "Loan application successfully submit हो गई। आपका Application ID: " +
          result.application_id,
        "success"
      );

      loanForm.reset();

      document.getElementById("application_id").value =
        result.application_id;

      document.getElementById("lookup_mobile").value =
        data.mobile;

    } catch (error) {
      console.error(error);

      showMessage(
        "applicationMessage",
        error.message || "Server से connection नहीं हो पाया",
        "error"
      );
    }
  });
}

// -----------------------------
// Loan Lookup
// -----------------------------

const loanLookupForm =
  document.getElementById("loanLookupForm");

if (loanLookupForm) {
  loanLookupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const applicationId =
      document.getElementById("application_id").value.trim();

    const mobile =
      document.getElementById("lookup_mobile").value.trim();

    if (!/^[0-9]{10}$/.test(mobile)) {
      showMessage(
        "lookupMessage",
        "Mobile number 10 digits का होना चाहिए।",
        "error"
      );
      return;
    }

    showMessage(
      "lookupMessage",
      "Loan details load हो रही हैं...",
      "success"
    );

    try {
      const response = await fetch(
        API_BASE + "/api/customer/loan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            application_id: applicationId,
            mobile: mobile
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Loan record नहीं मिला"
        );
      }

      currentLoanData = {
        application_id: applicationId,
        mobile: mobile,
        ...result
      };

      displayLoan(result);

      showMessage(
        "lookupMessage",
        "Loan details successfully मिल गईं।",
        "success"
      );

    } catch (error) {
      console.error(error);

      document.getElementById("loanSection").style.display =
        "none";

      showMessage(
        "lookupMessage",
        error.message || "Loan details load नहीं हुईं",
        "error"
      );
    }
  });
}

// -----------------------------
// Display Loan
// -----------------------------

function displayLoan(data) {
  const loanSection =
    document.getElementById("loanSection");

  loanSection.style.display = "block";

  document.getElementById("customerName").textContent =
    data.customer?.full_name || "-";

  document.getElementById("loanAccountNo").textContent =
    data.loan?.loan_account_no || "-";

  document.getElementById("principalAmount").textContent =
    formatMoney(data.loan?.principal);

  document.getElementById("monthlyEmi").textContent =
    formatMoney(data.loan?.emi);

  const tableBody =
    document.getElementById("emiTableBody");

  tableBody.innerHTML = "";

  const schedule = data.emi_schedule || [];

  if (schedule.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;">
          EMI schedule उपलब्ध नहीं है।
        </td>
      </tr>
    `;

    return;
  }

  schedule.forEach(function (emi) {
    const row = document.createElement("tr");

    let statusClass = "pending";

    if (emi.status === "paid") {
      statusClass = "paid";
    } else if (emi.status === "overdue") {
      statusClass = "overdue";
    }

    let actionHtml = "-";

    if (emi.status !== "paid") {
      actionHtml = `
        <button
          type="button"
          class="pay"
          onclick="payEmi(${emi.installment_no})"
          style="margin-top:0;padding:8px 12px;font-size:13px;width:auto;"
        >
          Pay EMI
        </button>
      `;
    }

    row.innerHTML = `
      <td>${emi.installment_no}</td>

      <td>
        ${formatDate(emi.due_date)}
      </td>

      <td>
        ${formatMoney(emi.principal_due)}
      </td>

      <td>
        ${formatMoney(emi.interest_due)}
      </td>

      <td>
        ${formatMoney(emi.total_due)}
      </td>

      <td>
        <span class="status ${statusClass}">
          ${emi.status}
        </span>
      </td>

      <td>
        ${actionHtml}
      </td>
    `;

    tableBody.appendChild(row);
  });

  loanSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// -----------------------------
// Demo EMI Payment
// -----------------------------

async function payEmi(installmentNo) {
  if (!currentLoanData) {
    alert("पहले अपना loan account खोलें।");
    return;
  }

  const confirmPayment = confirm(
    "क्या आप EMI No. " +
      installmentNo +
      " की DEMO payment करना चाहते हैं?\n\n" +
      "यह वास्तविक payment नहीं है।"
  );

  if (!confirmPayment) {
    return;
  }

  try {
    const response = await fetch(
      API_BASE + "/api/customer/pay-emi-test",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          application_id:
            currentLoanData.application_id,

          mobile:
            currentLoanData.mobile,

          installment_no: installmentNo,

          payment_method: "demo"
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Payment failed"
      );
    }

    alert(
      "Demo EMI Payment Successful!\n\n" +
      "EMI No.: " +
      result.installment_no +
      "\n" +
      "Amount: " +
      formatMoney(result.amount) +
      "\n\n" +
      "Transaction Reference:\n" +
      result.transaction_reference
    );

    // Loan details refresh करें
    await refreshLoan();

  } catch (error) {
    console.error(error);

    alert(
      error.message ||
        "Demo payment के दौरान error आया।"
    );
  }
}

// -----------------------------
// Refresh Loan
// -----------------------------

async function refreshLoan() {
  if (!currentLoanData) return;

  try {
    const response = await fetch(
      API_BASE + "/api/customer/loan",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          application_id:
            currentLoanData.application_id,

          mobile:
            currentLoanData.mobile
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Loan refresh failed"
      );
    }

    currentLoanData = {
      application_id:
        currentLoanData.application_id,

      mobile:
        currentLoanData.mobile,

      ...result
    };

    displayLoan(result);

  } catch (error) {
    console.error(error);
  }
}

// -----------------------------
// Payment History
// -----------------------------

const paymentHistoryButton =
  document.getElementById(
    "paymentHistoryButton"
  );

if (paymentHistoryButton) {
  paymentHistoryButton.addEventListener(
    "click",
    async function () {
      if (!currentLoanData) {
        alert(
          "पहले अपना loan account खोलें।"
        );
        return;
      }

      const historyBox =
        document.getElementById(
          "paymentHistory"
        );

      historyBox.classList.remove("hidden");

      historyBox.innerHTML =
        "<p>Payment history load हो रही है...</p>";

      try {
        const response = await fetch(
          API_BASE +
            "/api/customer/payment-history",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              application_id:
                currentLoanData.application_id,

              mobile:
                currentLoanData.mobile
            })
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Payment history नहीं मिली"
          );
        }

        displayPaymentHistory(
          result.payments || []
        );

      } catch (error) {
        console.error(error);

        historyBox.innerHTML = `
          <div class="message error" style="display:block;">
            ${error.message}
          </div>
        `;
      }
    }
  );
}

// -----------------------------
// Display Payment History
// -----------------------------

function displayPaymentHistory(payments) {
  const historyBox =
    document.getElementById(
      "paymentHistory"
    );

  if (!payments.length) {
    historyBox.innerHTML = `
      <div class="message" style="display:block;">
        अभी कोई payment record नहीं है।
      </div>
    `;

    return;
  }

  let html = `
    <h3>Payment History</h3>

    <div style="overflow-x:auto;">
      <table class="emi-table">

        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Reference</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
  `;

  payments.forEach(function (payment) {
    html += `
      <tr>
        <td>
          ${formatDate(payment.payment_date)}
        </td>

        <td>
          ${formatMoney(payment.amount)}
        </td>

        <td>
          ${payment.payment_method || "-"}
        </td>

        <td>
          ${payment.transaction_reference || "-"}
        </td>

        <td>
          <span class="status paid">
            ${payment.status}
          </span>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  historyBox.innerHTML = html;
}
