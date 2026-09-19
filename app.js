const API_BASE = "https://shyam-fincorp.onrender.com";

let currentApplicationId = "";
let currentMobile = "";
let currentLoan = null;
let currentEmiSchedule = [];

// ===============================
// COMMON HELPERS
// ===============================

function showMessage(message, type = "info") {
  const box = document.getElementById("message");

  if (!box) {
    alert(message);
    return;
  }

  box.textContent = message;
  box.className = `message ${type}`;
  box.style.display = "block";
}

function hideMessage() {
  const box = document.getElementById("message");

  if (box) {
    box.style.display = "none";
  }
}

function formatMoney(value) {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  });
}

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-IN");
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
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


// ===============================
// APPLICATION FORM
// ===============================

async function submitApplication(event) {
  if (event) {
    event.preventDefault();
  }

  hideMessage();

  const form = document.getElementById("applicationForm");

  if (!form) {
    showMessage("Application form not found.", "error");
    return;
  }

  const formData = new FormData(form);

  const payload = {};

  formData.forEach((value, key) => {
    payload[key] = value;
  });

  try {
    showMessage("Application submit ho rahi hai...", "info");

    const data = await apiRequest(
      `${API_BASE}/api/applications`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    currentApplicationId =
      data.application_id ||
      data.applicationId ||
      "";

    currentMobile =
      payload.mobile ||
      payload.phone ||
      "";

    showMessage(
      `Application successfully submit ho gayi. Application ID: ${
        currentApplicationId || "generated"
      }`,
      "success"
    );

    if (currentApplicationId) {
      showDocumentUpload(currentApplicationId);
    }

    form.reset();

  } catch (error) {
    console.error(error);

    showMessage(
      error.message || "Application submit nahi ho saki.",
      "error"
    );
  }
}


// ===============================
// DOCUMENT UPLOAD
// ===============================

function showDocumentUpload(applicationId) {
  const section = document.getElementById("documentUploadSection");

  if (!section) return;

  section.style.display = "block";

  const applicationInput =
    document.getElementById("documentApplicationId");

  if (applicationInput) {
    applicationInput.value = applicationId || "";
  }
}

async function uploadDocument(event) {
  if (event) {
    event.preventDefault();
  }

  const fileInput =
    document.getElementById("documentFile");

  const applicationInput =
    document.getElementById("documentApplicationId");

  if (!fileInput || !fileInput.files.length) {
    showMessage("Please select a document.", "error");
    return;
  }

  const file = fileInput.files[0];

  const applicationId =
    applicationInput?.value ||
    currentApplicationId;

  if (!applicationId) {
    showMessage("Application ID missing.", "error");
    return;
  }

  try {
    showMessage("Document upload ho raha hai...", "info");

    // Step 1: signed upload URL
    const uploadData = await apiRequest(
      `${API_BASE}/api/documents/upload-url`,
      {
        method: "POST",
        body: JSON.stringify({
          application_id: applicationId,
          file_name: file.name,
          content_type: file.type || "application/octet-stream"
        })
      }
    );

    const uploadUrl =
      uploadData.upload_url ||
      uploadData.signed_url ||
      uploadData.url;

    if (!uploadUrl) {
      throw new Error("Upload URL nahi mila.");
    }

    // Step 2: upload directly to Supabase
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type":
          file.type || "application/octet-stream"
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error("Document upload failed.");
    }

    // Step 3: record document metadata
    try {
      await apiRequest(
        `${API_BASE}/api/documents/record`,
        {
          method: "POST",
          body: JSON.stringify({
            application_id: applicationId,
            file_name: file.name,
            content_type: file.type,
            file_size: file.size
          })
        }
      );
    } catch (recordError) {
      console.warn(
        "Document metadata record failed:",
        recordError
      );
    }

    showMessage(
      "Document successfully upload ho gaya.",
      "success"
    );

    fileInput.value = "";

  } catch (error) {
    console.error(error);

    showMessage(
      error.message || "Document upload nahi ho saka.",
      "error"
    );
  }
}


// ===============================
// CUSTOMER LOAN LOOKUP
// ===============================

async function lookupLoan(event) {
  if (event) {
    event.preventDefault();
  }

  hideMessage();

  const applicationInput =
    document.getElementById("lookupApplicationId");

  const mobileInput =
    document.getElementById("lookupMobile");

  const applicationId =
    applicationInput?.value?.trim();

  const mobile =
    mobileInput?.value?.trim();

  if (!applicationId) {
    showMessage("Application ID enter karein.", "error");
    return;
  }

  if (!mobile) {
    showMessage("Mobile number enter karein.", "error");
    return;
  }

  currentApplicationId = applicationId;
  currentMobile = mobile;

  try {
    showMessage("Loan details load ho rahi hain...", "info");

    const data = await apiRequest(
      `${API_BASE}/api/customer/loan`,
      {
        method: "POST",
        body: JSON.stringify({
          application_id: applicationId,
          mobile: mobile
        })
      }
    );

    displayLoan(data);

    await loadPaymentHistory();

    showMessage(
      "Loan details successfully load ho gayi.",
      "success"
    );

  } catch (error) {
    console.error(error);

    clearLoanDisplay();

    showMessage(
      error.message ||
      "Loan details not found.",
      "error"
    );
  }
}


// ===============================
// DISPLAY LOAN
// ===============================

function displayLoan(data) {
  currentLoan = data;

  const loan =
    data.loan ||
    data.loan_account ||
    data;

  const schedule =
    data.emi_schedule ||
    data.schedule ||
    loan.emi_schedule ||
    [];

  currentEmiSchedule =
    Array.isArray(schedule)
      ? schedule
      : [];

  const loanDetails =
    document.getElementById("loanDetails");

  if (loanDetails) {
    loanDetails.style.display = "block";
  }

  setText(
    "loanAccountNo",
    loan.loan_account_no ||
    loan.loan_account_number ||
    loan.account_no ||
    "-"
  );

  setText(
    "loanPrincipal",
    formatMoney(
      loan.principal ||
      loan.loan_amount ||
      loan.amount ||
      0
    )
  );

  setText(
    "loanInterestRate",
    `${loan.annual_interest_rate || loan.interest_rate || 0}%`
  );

  setText(
    "loanTenure",
    `${loan.tenure_months || loan.tenure || 0} months`
  );

  setText(
    "loanEmi",
    formatMoney(
      loan.emi ||
      loan.emi_amount ||
      0
    )
  );

  displayPaymentSummary(currentEmiSchedule);

  displayEmiSchedule(currentEmiSchedule);
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function clearLoanDisplay() {
  const loanDetails =
    document.getElementById("loanDetails");

  if (loanDetails) {
    loanDetails.style.display = "none";
  }

  const schedule =
    document.getElementById("emiSchedule");

  if (schedule) {
    schedule.innerHTML = "";
  }

  currentLoan = null;
  currentEmiSchedule = [];
}


// ===============================
// PAYMENT SUMMARY
// ===============================

function displayPaymentSummary(schedule) {
  if (!Array.isArray(schedule)) {
    return;
  }

  let totalDue = 0;
  let totalPaid = 0;
  let totalPending = 0;

  let paidEmis = 0;
  let pendingEmis = 0;

  schedule.forEach((emi) => {
    const due =
      Number(
        emi.total_due ??
        emi.amount_due ??
        emi.emi_amount ??
        emi.amount ??
        0
      );

    const paid =
      Number(
        emi.paid_amount ??
        emi.amount_paid ??
        0
      );

    const pending =
      Math.max(due - paid, 0);

    totalDue += due;
    totalPaid += paid;
    totalPending += pending;

    if (
      pending <= 0 ||
      String(emi.status || "").toLowerCase() === "paid"
    ) {
      paidEmis++;
    } else {
      pendingEmis++;
    }
  });

  setText(
    "totalDue",
    formatMoney(totalDue)
  );

  setText(
    "totalPaid",
    formatMoney(totalPaid)
  );

  setText(
    "totalPending",
    formatMoney(totalPending)
  );

  setText(
    "paidEmis",
    String(paidEmis)
  );

  setText(
    "pendingEmis",
    String(pendingEmis)
  );
}


// ===============================
// EMI SCHEDULE
// ===============================

function displayEmiSchedule(schedule) {
  const container =
    document.getElementById("emiSchedule");

  if (!container) return;

  if (!Array.isArray(schedule) || schedule.length === 0) {
    container.innerHTML =
      "<p>EMI schedule available nahi hai.</p>";

    return;
  }

  let html = `
    <div class="table-wrapper">
      <table class="emi-table">
        <thead>
          <tr>
            <th>EMI No.</th>
            <th>Due Date</th>
            <th>Amount</th>
            <th>Paid</th>
            <th>Pending</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
  `;

  schedule.forEach((emi) => {
    const installmentNo =
      emi.installment_no ??
      emi.emi_no ??
      emi.installment ??
      "-";

    const due =
      Number(
        emi.total_due ??
        emi.amount_due ??
        emi.emi_amount ??
        emi.amount ??
        0
      );

    const paid =
      Number(
        emi.paid_amount ??
        emi.amount_paid ??
        0
      );

    const pending =
      Math.max(due - paid, 0);

    let status =
      String(emi.status || "")
        .toLowerCase();

    if (!status) {
      status =
        pending <= 0
          ? "paid"
          : "pending";
    }

    const isPaid =
      status === "paid" ||
      pending <= 0;

    html += `
      <tr>
        <td>${installmentNo}</td>

        <td>
          ${formatDate(
            emi.due_date ||
            emi.dueDate
          )}
        </td>

        <td>
          ${formatMoney(due)}
        </td>

        <td>
          ${formatMoney(paid)}
        </td>

        <td>
          ${formatMoney(pending)}
        </td>

        <td>
          <span class="emi-status ${status}">
            ${status.toUpperCase()}
          </span>
        </td>

        <td>
          ${
            isPaid
              ? `<span>Paid</span>`
              : `
                <button
                  type="button"
                  class="pay-emi-btn"
                  onclick="payEmi(${Number(installmentNo)})"
                >
                  Pay EMI
                </button>
              `
          }
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}


// ===============================
// GET NEXT PENDING EMI
// ===============================

function getNextPendingInstallment() {
  if (
    !Array.isArray(currentEmiSchedule) ||
    currentEmiSchedule.length === 0
  ) {
    return null;
  }

  for (const emi of currentEmiSchedule) {
    const due =
      Number(
        emi.total_due ??
        emi.amount_due ??
        emi.emi_amount ??
        emi.amount ??
        0
      );

    const paid =
      Number(
        emi.paid_amount ??
        emi.amount_paid ??
        0
      );

    const pending =
      Math.max(due - paid, 0);

    if (pending > 0) {
      return emi;
    }
  }

  return null;
}


// ===============================
// PAY EMI
// ===============================

async function payEmi(installmentNo) {
  if (!currentApplicationId || !currentMobile) {
    showMessage(
      "Pehle loan details lookup karein.",
      "error"
    );

    return;
  }

  if (!installmentNo) {
    showMessage(
      "Installment number missing hai.",
      "error"
    );

    return;
  }

  const paymentMethod =
    prompt(
      "Payment method enter karein:\n\nUPI / Cash / Bank Transfer"
    );

  if (!paymentMethod) {
    return;
  }

  try {
    showMessage(
      "Payment process ho rahi hai...",
      "info"
    );

    const data = await apiRequest(
      `${API_BASE}/api/customer/pay-emi-test`,
      {
        method: "POST",
        body: JSON.stringify({
          application_id:
            currentApplicationId,

          mobile:
            currentMobile,

          installment_no:
            Number(installmentNo),

          payment_method:
            paymentMethod
        })
      }
    );

    showMessage(
      data.message ||
      "EMI payment successfully recorded.",
      "success"
    );

    // Refresh loan details
    await refreshLoan();

  } catch (error) {
    console.error(error);

    showMessage(
      error.message ||
      "Payment process nahi ho saki.",
      "error"
    );
  }
}


// ===============================
// REFRESH LOAN
// ===============================

async function refreshLoan() {
  if (
    !currentApplicationId ||
    !currentMobile
  ) {
    return;
  }

  try {
    const data = await apiRequest(
      `${API_BASE}/api/customer/loan`,
      {
        method: "POST",
        body: JSON.stringify({
          application_id:
            currentApplicationId,

          mobile:
            currentMobile
        })
      }
    );

    displayLoan(data);

    await loadPaymentHistory();

  } catch (error) {
    console.error(error);
  }
}


// ===============================
// PAYMENT HISTORY
// ===============================

async function loadPaymentHistory() {
  if (
    !currentApplicationId ||
    !currentMobile
  ) {
    return;
  }

  const container =
    document.getElementById(
      "paymentHistory"
    );

  try {
    const data = await apiRequest(
      `${API_BASE}/api/customer/payment-history`,
      {
        method: "POST",
        body: JSON.stringify({
          application_id:
            currentApplicationId,

          mobile:
            currentMobile
        })
      }
    );

    const payments =
      data.payments ||
      data.payment_history ||
      data.history ||
      [];

    displayPaymentHistory(
      Array.isArray(payments)
        ? payments
        : []
    );

  } catch (error) {
    console.error(
      "Payment history error:",
      error
    );

    if (container) {
      container.innerHTML =
        "<p>Payment history available nahi hai.</p>";
    }
  }
}

function displayPaymentHistory(payments) {
  const container =
    document.getElementById(
      "paymentHistory"
    );

  if (!container) return;

  if (
    !Array.isArray(payments) ||
    payments.length === 0
  ) {
    container.innerHTML =
      "<p>Abhi koi payment record nahi hai.</p>";

    return;
  }

  let html = `
    <div class="table-wrapper">
      <table class="payment-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Transaction</th>
            <th>EMI No.</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
  `;

  payments.forEach((payment) => {
    const amount =
      Number(
        payment.amount ||
        payment.paid_amount ||
        0
      );

    html += `
      <tr>
        <td>
          ${formatDate(
            payment.payment_date ||
            payment.created_at
          )}
        </td>

        <td>
          ${
            payment.transaction_ref ||
            payment.transaction_id ||
            "-"
          }
        </td>

        <td>
          ${
            payment.installment_no ||
            payment.emi_no ||
            "-"
          }
        </td>

        <td>
          ${formatMoney(amount)}
        </td>

        <td>
          ${
            payment.payment_method ||
            "-"
          }
        </td>

        <td>
          ${
            payment.status ||
            "Recorded"
          }
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}


// ===============================
// ELIGIBILITY CHECK
// ===============================

async function checkEligibility(event) {
  if (event) {
    event.preventDefault();
  }

  const form =
    document.getElementById(
      "eligibilityForm"
    );

  if (!form) return;

  const formData =
    new FormData(form);

  const payload = {};

  formData.forEach((value, key) => {
    payload[key] = value;
  });

  try {
    showMessage(
      "Eligibility check ho rahi hai...",
      "info"
    );

    const data = await apiRequest(
      `${API_BASE}/api/eligibility`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    const result =
      document.getElementById(
        "eligibilityResult"
      );

    if (result) {
      result.style.display = "block";

      result.innerHTML = `
        <h3>
          ${data.eligible ? "Eligible" : "Not Eligible"}
        </h3>

        <p>
          ${
            data.message ||
            "Eligibility result received."
          }
        </p>
      `;
    }

    showMessage(
      data.message ||
      "Eligibility result received.",
      data.eligible
        ? "success"
        : "info"
    );

  } catch (error) {
    console.error(error);

    showMessage(
      error.message ||
      "Eligibility check failed.",
      "error"
    );
  }
}


// ===============================
// CONTACT / INQUIRY
// ===============================

async function submitInquiry(event) {
  if (event) {
    event.preventDefault();
  }

  const form =
    document.getElementById(
      "inquiryForm"
    );

  if (!form) return;

  const formData =
    new FormData(form);

  const payload = {};

  formData.forEach((value, key) => {
    payload[key] = value;
  });

  try {
    showMessage(
      "Inquiry submit ho rahi hai...",
      "info"
    );

    const data = await apiRequest(
      `${API_BASE}/api/inquiries`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    showMessage(
      data.message ||
      "Inquiry successfully submit ho gayi.",
      "success"
    );

    form.reset();

  } catch (error) {
    console.error(error);

    showMessage(
      error.message ||
      "Inquiry submit nahi ho saki.",
      "error"
    );
  }
}


// ===============================
// EVENT LISTENERS
// ===============================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const applicationForm =
      document.getElementById(
        "applicationForm"
      );

    if (applicationForm) {
      applicationForm.addEventListener(
        "submit",
        submitApplication
      );
    }


    const documentForm =
      document.getElementById(
        "documentUploadForm"
      );

    if (documentForm) {
      documentForm.addEventListener(
        "submit",
        uploadDocument
      );
    }


    const lookupForm =
      document.getElementById(
        "loanLookupForm"
      );

    if (lookupForm) {
      lookupForm.addEventListener(
        "submit",
        lookupLoan
      );
    }


    const eligibilityForm =
      document.getElementById(
        "eligibilityForm"
      );

    if (eligibilityForm) {
      eligibilityForm.addEventListener(
        "submit",
        checkEligibility
      );
    }


    const inquiryForm =
      document.getElementById(
        "inquiryForm"
      );

    if (inquiryForm) {
      inquiryForm.addEventListener(
        "submit",
        submitInquiry
      );
    }

  }
);


// ===============================
// MAKE FUNCTIONS AVAILABLE
// ===============================

window.submitApplication =
  submitApplication;

window.uploadDocument =
  uploadDocument;

window.lookupLoan =
  lookupLoan;

window.payEmi =
  payEmi;

window.refreshLoan =
  refreshLoan;

window.loadPaymentHistory =
  loadPaymentHistory;

window.checkEligibility =
  checkEligibility;

window.submitInquiry =
  submitInquiry;
