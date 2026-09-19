const API_BASE = "https://shyam-fincorp.onrender.com";

let currentApplicationId = "";
let currentMobile = "";
let currentLoan = null;
let currentEmiSchedule = [];
let currentPayments = [];

/* =========================
   COMMON HELPERS
========================= */

function showMessage(message, type = "info") {
  let box = document.getElementById("message");

  if (!box) {
    box = document.createElement("div");
    box.id = "message";
    box.className = "message";

    const main = document.querySelector("main");

    if (main) {
      main.prepend(box);
    } else {
      document.body.prepend(box);
    }
  }

  box.textContent = message;
  box.className = `message ${type}`;
  box.style.display = "block";

  setTimeout(() => {
    if (box) {
      box.style.display = "none";
    }
  }, 6000);
}

function hideMessage() {
  const box = document.getElementById("message");

  if (box) {
    box.style.display = "none";
  }
}

function formatMoney(value) {
  const amount = Number(value || 0);

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatNumber(value) {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

async function apiRequest(url, options = {}) {
  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : {
          "Content-Type": "application/json"
        }),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value ?? "-";
  }
}

function showElement(id, display = "block") {
  const element = document.getElementById(id);

  if (element) {
    element.style.display = display;
  }
}

function hideElement(id) {
  const element = document.getElementById(id);

  if (element) {
    element.style.display = "none";
  }
}

/* =========================
   ELIGIBILITY STEPS
========================= */

function showEligibilityStep(step) {
  const steps = [1, 2, 3];

  steps.forEach((number) => {
    const section = document.getElementById(
      `eligibilityStep${number}`
    );

    if (section) {
      section.style.display =
        number === step ? "block" : "none";
    }

    const indicator = document.getElementById(
      `step${number}Indicator`
    );

    if (indicator) {
      indicator.classList.toggle(
        "active",
        number === step
      );

      indicator.classList.toggle(
        "completed",
        number < step
      );
    }
  });

  const progress =
    document.getElementById("eligibilityProgress");

  if (progress) {
    progress.style.width =
      step === 1
        ? "0%"
        : step === 2
        ? "50%"
        : "100%";
  }
}

function validateEligibilityStep1() {
  const name =
    document.getElementById("eligibilityName");

  const mobile =
    document.getElementById("eligibilityMobile");

  if (!name || !mobile) {
    return false;
  }

  const fullName = name.value.trim();
  const phone = mobile.value.trim();

  if (fullName.length < 2) {
    showMessage(
      "Please enter your full name.",
      "error"
    );

    name.focus();

    return false;
  }

  if (!/^\d{10}$/.test(phone)) {
    showMessage(
      "Please enter a valid 10-digit mobile number.",
      "error"
    );

    mobile.focus();

    return false;
  }

  return true;
}

function goToEligibilityStep2() {
  if (validateEligibilityStep1()) {
    showEligibilityStep(2);
  }
}

function goToEligibilityStep1() {
  showEligibilityStep(1);
}

/* =========================
   LOAN APPLICATION
========================= */

async function submitApplication(event) {
  if (event) {
    event.preventDefault();
  }

  const form =
    document.getElementById("loanApplicationForm");

  if (!form) {
    showMessage(
      "Loan application form not found.",
      "error"
    );

    return;
  }

  const formData = new FormData(form);

  const payload =
    Object.fromEntries(formData.entries());

  if (payload.mobile) {
    payload.mobile = payload.mobile.trim();
  }

  if (payload.full_name) {
    payload.full_name =
      payload.full_name.trim();
  }

  try {
    showMessage(
      "Application submit ho rahi hai...",
      "info"
    );

    const data = await apiRequest(
      `${API_BASE}/api/applications`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    const applicationId =
      data.application_id ||
      data.application?.application_id ||
      data.id ||
      "";

    currentApplicationId = applicationId;
    currentMobile = payload.mobile || "";

    if (applicationId) {
      const applicationIdInput =
        document.getElementById(
          "documentApplicationId"
        );

      if (applicationIdInput) {
        applicationIdInput.value =
          applicationId;
      }

      showElement(
        "documentUploadSection"
      );

      showMessage(
        `Application submit ho gayi. Application ID: ${applicationId}`,
        "success"
      );
    } else {
      showMessage(
        "Application submit ho gayi, lekin Application ID nahi mili.",
        "success"
      );
    }

    form.reset();
  } catch (error) {
    console.error(
      "submitApplication:",
      error
    );

    showMessage(
      error.message,
      "error"
    );
  }
}

/* =========================
   DOCUMENT UPLOAD
========================= */

async function uploadSingleDocument(
  applicationId,
  file,
  documentType
) {
  const uploadInfo =
    await apiRequest(
      `${API_BASE}/api/documents/upload-url`,
      {
        method: "POST",
        body: JSON.stringify({
          application_id: applicationId,
          file_name: file.name,
          content_type:
            file.type ||
            "application/octet-stream"
        })
      }
    );

  const uploadUrl =
    uploadInfo.upload_url ||
    uploadInfo.url ||
    uploadInfo.signed_url;

  if (!uploadUrl) {
    throw new Error(
      `${documentType}: upload URL nahi mili.`
    );
  }

  const uploadResponse =
    await fetch(uploadUrl, {
      method: "PUT",

      headers: {
        "Content-Type":
          file.type ||
          "application/octet-stream"
      },

      body: file
    });

  if (!uploadResponse.ok) {
    throw new Error(
      `${documentType}: file upload failed.`
    );
  }

  try {
    await apiRequest(
      `${API_BASE}/api/documents/record`,
      {
        method: "POST",

        body: JSON.stringify({
          application_id:
            applicationId,

          document_type:
            documentType,

          file_name:
            file.name,

          file_path:
            uploadInfo.file_path ||
            uploadInfo.path ||
            uploadInfo.object_path ||
            ""
        })
      }
    );
  } catch (recordError) {
    console.warn(
      "Document record:",
      recordError
    );
  }

  return true;
}

async function uploadDocument() {
  const applicationIdInput =
    document.getElementById(
      "documentApplicationId"
    );

  const applicationId =
    applicationIdInput?.value.trim() ||
    currentApplicationId;

  if (!applicationId) {
    showMessage(
      "Pehle loan application submit karein.",
      "error"
    );

    return;
  }

  const documents = [
    {
      id: "identityProof",
      type: "identity_proof",
      label: "Identity Proof"
    },

    {
      id: "panCard",
      type: "pan_card",
      label: "PAN Card"
    },

    {
      id: "addressProof",
      type: "address_proof",
      label: "Address Proof"
    },

    {
      id: "incomeProof",
      type: "income_proof",
      label: "Income Proof"
    },

    {
      id: "applicantPhoto",
      type: "applicant_photo",
      label: "Applicant Photo"
    }
  ];

  const selectedDocuments =
    documents
      .map((document) => ({
        ...document,

        file:
          document.getElementById(
            document.id
          )?.files?.[0] || null
      }))
      .filter(
        (document) => document.file
      );

  if (selectedDocuments.length === 0) {
    showMessage(
      "Kam se kam ek document select karein.",
      "error"
    );

    return;
  }

  const button =
    document.getElementById(
      "uploadDocumentsButton"
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "Uploading...";
  }

  const statusBox =
    document.getElementById(
      "documentUploadStatus"
    );

  if (statusBox) {
    statusBox.innerHTML = "";
  }

  try {
    let successCount = 0;

    for (
      const document of selectedDocuments
    ) {
      if (statusBox) {
        const item =
          document.createElement("div");

        item.textContent =
          `${document.label}: uploading...`;

        item.dataset.documentType =
          document.type;

        statusBox.appendChild(item);
      }

      await uploadSingleDocument(
        applicationId,
        document.file,
        document.type
      );

      successCount++;

      if (statusBox) {
        const item =
          statusBox.querySelector(
            `[data-document-type="${document.type}"]`
          );

        if (item) {
          item.textContent =
            `${document.label}: uploaded successfully`;
        }
      }
    }

    const message =
      document.getElementById(
        "documentUploadMessage"
      );

    if (message) {
      message.textContent =
        `${successCount} document(s) successfully uploaded.`;

      message.style.display =
        "block";
    }

    showMessage(
      `${successCount} document(s) successfully upload ho gaye.`,
      "success"
    );
  } catch (error) {
    console.error(
      "uploadDocument:",
      error
    );

    const message =
      document.getElementById(
        "documentUploadMessage"
      );

    if (message) {
      message.textContent =
        error.message;

      message.style.display =
        "block";
    }

    showMessage(
      error.message,
      "error"
    );
  } finally {
    if (button) {
      button.disabled = false;

      button.textContent =
        "Upload Documents";
    }
  }
}

/* =========================
   CUSTOMER LOAN LOOKUP
========================= */

async function lookupLoan(event) {
  if (event) {
    event.preventDefault();
  }

  const applicationIdInput =
    document.getElementById(
      "lookupApplicationId"
    );

  const mobileInput =
    document.getElementById(
      "lookupMobile"
    );

  const message =
    document.getElementById(
      "lookupMessage"
    );

  if (
    !applicationIdInput ||
    !mobileInput
  ) {
    showMessage(
      "Loan lookup form not found.",
      "error"
    );

    return;
  }

  const applicationId =
    applicationIdInput.value.trim();

  const mobile =
    mobileInput.value.trim();

  if (!applicationId) {
    if (message) {
      message.textContent =
        "Application ID enter karein.";
    }

    showMessage(
      "Application ID enter karein.",
      "error"
    );

    return;
  }

  if (!/^\d{10}$/.test(mobile)) {
    if (message) {
      message.textContent =
        "Valid 10-digit mobile number enter karein.";
    }

    showMessage(
      "Valid 10-digit mobile number enter karein.",
      "error"
    );

    return;
  }

  try {
    if (message) {
      message.textContent =
        "Loan details load ho rahi hain...";
    }

    const data =
      await apiRequest(
        `${API_BASE}/api/customer/loan?application_id=${encodeURIComponent(
          applicationId
        )}&mobile=${encodeURIComponent(
          mobile
        )}`
      );

    currentApplicationId =
      applicationId;

    currentMobile = mobile;

    currentLoan =
      data.loan || data;

    displayLoan(data);

    await loadPaymentHistory(false);

    if (message) {
      message.textContent =
        "Loan details successfully loaded.";
    }

    showMessage(
      "Loan details successfully load ho gayi.",
      "success"
    );
  } catch (error) {
    console.error(
      "lookupLoan:",
      error
    );

    if (message) {
      message.textContent =
        error.message;
    }

    hideElement(
      "loanSummarySection"
    );

    hideElement(
      "paymentSummarySection"
    );

    hideElement(
      "emiScheduleSection"
    );

    hideElement(
      "paymentSection"
    );

    hideElement(
      "paymentHistorySection"
    );

    showMessage(
      error.message,
      "error"
    );
  }
}

function getLoanObject(data) {
  return (
    data.loan ||
    data.loan_account ||
    data.account ||
    data
  );
}

function getScheduleFromData(data) {
  const loan =
    getLoanObject(data);

  return (
    data.emi_schedule ||
    data.schedule ||
    data.emiSchedule ||
    loan?.emi_schedule ||
    []
  );
}

/* =========================
   LOAN DISPLAY
========================= */

function displayLoan(data) {
  const loan =
    getLoanObject(data);

  if (!loan) {
    showMessage(
      "Loan details nahi mili.",
      "error"
    );

    return;
  }

  currentLoan = loan;

  const accountNumber =
    loan.loan_account_number ||
    loan.account_number ||
    loan.loanAccountNumber ||
    "-";

  const principal =
    loan.principal ??
    loan.loan_amount ??
    loan.amount ??
    0;

  const rate =
    loan.interest_rate ??
    loan.rate ??
    loan.interestRate ??
    0;

  const tenure =
    loan.tenure_months ??
    loan.tenure ??
    loan.tenureMonths ??
    0;

  const emi =
    loan.emi_amount ??
    loan.emi ??
    loan.monthly_emi ??
    0;

  const status =
    loan.status ||
    loan.loan_status ||
    "Active";

  setText(
    "loanAccountNo",
    accountNumber
  );

  setText(
    "loanPrincipal",
    formatNumber(principal)
  );

  setText(
    "loanRate",
    rate
  );

  setText(
    "loanTenure",
    tenure
  );

  setText(
    "loanEmi",
    formatNumber(emi)
  );

  setText(
    "loanStatus",
    status
  );

  showElement(
    "loanSummarySection"
  );

  currentEmiSchedule =
    getScheduleFromData(data);

  displayEmiSchedule(
    currentEmiSchedule
  );

  displayPaymentSummary(
    currentEmiSchedule,
    currentPayments
  );

  showElement(
    "paymentSection"
  );

  showElement(
    "paymentHistorySection"
  );
}

/* =========================
   PAYMENT SUMMARY
========================= */

function displayPaymentSummary(
  schedule = [],
  payments = []
) {
  const rows =
    Array.isArray(schedule)
      ? schedule
      : [];

  const paymentRows =
    Array.isArray(payments)
      ? payments
      : [];

  let totalPayable = 0;
  let schedulePaid = 0;
  let paidCount = 0;
  let pendingCount = 0;

  rows.forEach((emi) => {
    const due =
      Number(
        emi.total_due ??
          emi.emi_amount ??
          emi.emi ??
          emi.total ??
          0
      );

    const paid =
      Number(
        emi.paid_amount ??
          emi.amount_paid ??
          emi.paid ??
          0
      );

    totalPayable += due;

    schedulePaid += paid;

    const status =
      String(
        emi.status || ""
      ).toLowerCase();

    if (
      status === "paid" ||
      (paid >= due && due > 0)
    ) {
      paidCount++;
    } else {
      pendingCount++;
    }
  });

  const paymentPaid =
    paymentRows.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount ??
            payment.paid_amount ??
            payment.payment_amount ??
            0
        ),
      0
    );

  const totalPaid =
    schedulePaid > 0
      ? schedulePaid
      : paymentPaid;

  const totalPending =
    Math.max(
      totalPayable - totalPaid,
      0
    );

  setText(
    "totalPayableAmount",
    formatNumber(totalPayable)
  );

  setText(
    "totalPaidAmount",
    formatNumber(totalPaid)
  );

  setText(
    "totalPendingAmount",
    formatNumber(totalPending)
  );

  setText(
    "paidEmiCount",
    paidCount
  );

  setText(
    "pendingEmiCount",
    pendingCount
  );

  const progress =
    totalPayable > 0
      ? Math.min(
          (totalPaid /
            totalPayable) *
            100,
          100
        )
      : 0;

  const progressBar =
    document.getElementById(
      "paymentProgress"
    );

  if (progressBar) {
    if (
      progressBar.tagName ===
      "PROGRESS"
    ) {
      progressBar.value =
        progress;
    } else {
      progressBar.style.width =
        `${progress}%`;

      progressBar.textContent =
        `${Math.round(progress)}%`;
    }
  }

  showElement(
    "paymentSummarySection"
  );
}

/* =========================
   EMI SCHEDULE
========================= */

function displayEmiSchedule(
  schedule = []
) {
  const body =
    document.getElementById(
      "emiTableBody"
    );

  if (!body) {
    return;
  }

  body.innerHTML = "";

  if (
    !Array.isArray(schedule) ||
    schedule.length === 0
  ) {
    const row =
      document.createElement("tr");

    row.innerHTML =
      '<td colspan="7">EMI schedule available nahi hai.</td>';

    body.appendChild(row);

    showElement(
      "emiScheduleSection"
    );

    return;
  }

  schedule.forEach(
    (emi, index) => {
      const installmentNo =
        emi.installment_no ??
        emi.installment_number ??
        emi.emi_number ??
        index + 1;

      const dueDate =
        emi.due_date ??
        emi.dueDate ??
        emi.payment_date;

      const principal =
        emi.principal_amount ??
        emi.principal ??
        0;

      const interest =
        emi.interest_amount ??
        emi.interest ??
        0;

      const total =
        emi.total_due ??
        emi.emi_amount ??
        emi.emi ??
        emi.total ??
        Number(principal) +
          Number(interest);

      const paid =
        emi.paid_amount ??
        emi.amount_paid ??
        emi.paid ??
        0;

      const rawStatus =
        String(
          emi.status ||
            (Number(paid) >=
              Number(total) &&
            Number(total) > 0
              ? "Paid"
              : "Pending")
        );

      const isPaid =
        rawStatus.toLowerCase() ===
          "paid" ||
        (Number(paid) >=
          Number(total) &&
          Number(total) > 0);

      const row =
        document.createElement("tr");

      const actionHtml = isPaid
        ? `<span class="status-paid">${rawStatus}</span>`
        : `
          <button
            type="button"
            class="pay-emi-button"
            onclick="payEmi(${Number(
              installmentNo
            )})"
          >
            Pay EMI
          </button>
          <span>${rawStatus}</span>
        `;

      row.innerHTML = `
        <td>${installmentNo}</td>
        <td>${formatDate(dueDate)}</td>
        <td>${formatMoney(principal)}</td>
        <td>${formatMoney(interest)}</td>
        <td>${formatMoney(total)}</td>
        <td>${formatMoney(paid)}</td>
        <td>${actionHtml}</td>
      `;

      body.appendChild(row);
    }
  );

  showElement(
    "emiScheduleSection"
  );
}

/* =========================
   PAYMENT
========================= */

function getNextPendingEmi() {
  if (
    !Array.isArray(
      currentEmiSchedule
    )
  ) {
    return null;
  }

  return (
    currentEmiSchedule.find(
      (emi) => {
        const total =
          Number(
            emi.total_due ??
              emi.emi_amount ??
              emi.emi ??
              emi.total ??
              0
          );

        const paid =
          Number(
            emi.paid_amount ??
              emi.amount_paid ??
              emi.paid ??
              0
          );

        const status =
          String(
            emi.status || ""
          ).toLowerCase();

        return (
          status !== "paid" &&
          paid < total
        );
      }
    ) || null
  );
}

async function payEmi(
  installmentNo
) {
  if (
    !currentApplicationId ||
    !currentMobile
  ) {
    showMessage(
      "Pehle apni loan details lookup karein.",
      "error"
    );

    return;
  }

  const emi =
    currentEmiSchedule.find(
      (item, index) =>
        Number(
          item.installment_no ??
            item.installment_number ??
            item.emi_number ??
            index + 1
        ) ===
        Number(installmentNo)
    );

  const amount =
    Number(
      emi?.total_due ??
        emi?.emi_amount ??
        emi?.emi ??
        emi?.total ??
        0
    );

  const confirmed =
    window.confirm(
      `EMI ${installmentNo} ke liye ${formatMoney(
        amount
      )} ka test payment karna hai?`
    );

  if (!confirmed) {
    return;
  }

  try {
    showMessage(
      "Payment process ho rahi hai...",
      "info"
    );

    const data =
      await apiRequest(
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
              "test"
          })
        }
      );

    showMessage(
      data.message ||
        "EMI payment successfully recorded.",
      "success"
    );

    await refreshLoan();
  } catch (error) {
    console.error(
      "payEmi:",
      error
    );

    showMessage(
      error.message,
      "error"
    );
  }
}

async function handlePaymentForm(
  event
) {
  if (event) {
    event.preventDefault();
  }

  const amountInput =
    document.getElementById(
      "paymentAmount"
    );

  const methodInput =
    document.getElementById(
      "paymentMethod"
    );

  const message =
    document.getElementById(
      "paymentMessage"
    );

  if (
    !currentApplicationId ||
    !currentMobile
  ) {
    if (message) {
      message.textContent =
        "Pehle loan details lookup karein.";
    }

    showMessage(
      "Pehle loan details lookup karein.",
      "error"
    );

    return;
  }

  const nextEmi =
    getNextPendingEmi();

  if (!nextEmi) {
    if (message) {
      message.textContent =
        "Koi pending EMI nahi hai.";
    }

    showMessage(
      "Koi pending EMI nahi hai.",
      "success"
    );

    return;
  }

  const installmentNo =
    nextEmi.installment_no ??
    nextEmi.installment_number ??
    nextEmi.emi_number;

  const amount =
    Number(
      nextEmi.total_due ??
        nextEmi.emi_amount ??
        nextEmi.emi ??
        nextEmi.total ??
        0
    );

  if (amountInput) {
    amountInput.value =
      amount;
  }

  const paymentMethod =
    methodInput?.value ||
    "test";

  try {
    if (message) {
      message.textContent =
        "Payment process ho rahi hai...";
    }

    const data =
      await apiRequest(
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

    if (message) {
      message.textContent =
        data.message ||
        "Payment successfully recorded.";
    }

    showMessage(
      data.message ||
        "Payment successfully recorded.",
      "success"
    );

    await refreshLoan();
  } catch (error) {
    console.error(
      "handlePaymentForm:",
      error
    );

    if (message) {
      message.textContent =
        error.message;
    }

    showMessage(
      error.message,
      "error"
    );
  }
}

/* =========================
   PAYMENT HISTORY
========================= */

async function loadPaymentHistory(
  showStatus = true
) {
  if (
    !currentApplicationId ||
    !currentMobile
  ) {
    return;
  }

  try {
    if (showStatus) {
      showMessage(
        "Payment history load ho rahi hai...",
        "info"
      );
    }

    const data =
      await apiRequest(
        `${API_BASE}/api/customer/payment-history?application_id=${encodeURIComponent(
          currentApplicationId
        )}&mobile=${encodeURIComponent(
          currentMobile
        )}`
      );

    currentPayments =
      data.payments ||
      data.payment_history ||
      data.history ||
      [];

    displayPaymentHistory(
      currentPayments
    );

    displayPaymentSummary(
      currentEmiSchedule,
      currentPayments
    );

    if (showStatus) {
      showMessage(
        "Payment history loaded.",
        "success"
      );
    }
  } catch (error) {
    console.error(
      "loadPaymentHistory:",
      error
    );

    currentPayments = [];

    displayPaymentHistory([]);

    if (showStatus) {
      showMessage(
        error.message,
        "error"
      );
    }
  }
}

function displayPaymentHistory(
  payments = []
) {
  const body =
    document.getElementById(
      "paymentHistoryBody"
    );

  if (!body) {
    return;
  }

  body.innerHTML = "";

  if (
    !Array.isArray(payments) ||
    payments.length === 0
  ) {
    const row =
      document.createElement("tr");

    row.innerHTML =
      '<td colspan="5">Payment history available nahi hai.</td>';

    body.appendChild(row);

    showElement(
      "paymentHistorySection"
    );

    return;
  }

  payments.forEach(
    (payment) => {
      const row =
        document.createElement("tr");

      const transactionId =
        payment.transaction_ref ||
        payment.transaction_id ||
        payment.reference ||
        "-";

      const installmentNo =
        payment.installment_no ??
        payment.installment_number ??
        "-";

      const amount =
        payment.amount ??
        payment.paid_amount ??
        payment.payment_amount ??
        0;

      const method =
        payment.payment_method ||
        payment.method ||
        "-";

      const date =
        payment.paid_at ||
        payment.payment_date ||
        payment.created_at;

      row.innerHTML = `
        <td>${installmentNo}</td>
        <td>${formatMoney(amount)}</td>
        <td>${method}</td>
        <td>${formatDate(date)}</td>
        <td>${transactionId}</td>
      `;

      body.appendChild(row);
    }
  );

  showElement(
    "paymentHistorySection"
  );
}

/* =========================
   REFRESH LOAN
========================= */

async function refreshLoan() {
  if (
    !currentApplicationId ||
    !currentMobile
  ) {
    showMessage(
      "Pehle Application ID aur mobile number se loan lookup karein.",
      "error"
    );

    return;
  }

  try {
    const data =
      await apiRequest(
        `${API_BASE}/api/customer/loan?application_id=${encodeURIComponent(
          currentApplicationId
        )}&mobile=${encodeURIComponent(
          currentMobile
        )}`
      );

    currentLoan =
      getLoanObject(data);

    currentEmiSchedule =
      getScheduleFromData(data);

    displayLoan(data);

    await loadPaymentHistory(false);

    showMessage(
      "Loan details refresh ho gayi.",
      "success"
    );
  } catch (error) {
    console.error(
      "refreshLoan:",
      error
    );

    showMessage(
      error.message,
      "error"
    );
  }
}

/* =========================
   ELIGIBILITY CHECK
========================= */

async function checkEligibility(
  event
) {
  if (event) {
    event.preventDefault();
  }

  const nameInput =
    document.getElementById(
      "eligibilityName"
    );

  const mobileInput =
    document.getElementById(
      "eligibilityMobile"
    );

  const amountInput =
    document.getElementById(
      "requestedAmount"
    );

  const incomeInput =
    document.getElementById(
      "monthlyIncome"
    );

  const tenureInput =
    document.getElementById(
      "eligibilityTenure"
    );

  const result =
    document.getElementById(
      "eligibilityResult"
    );

  if (
    !nameInput ||
    !mobileInput ||
    !amountInput ||
    !incomeInput ||
    !tenureInput
  ) {
    showMessage(
      "Eligibility form fields nahi mile.",
      "error"
    );

    return;
  }

  const name =
    nameInput.value.trim();

  const mobile =
    mobileInput.value.trim();

  const requestedAmount =
    Number(
      amountInput.value
    );

  const monthlyIncome =
    Number(
      incomeInput.value
    );

  const tenureMonths =
    Number(
      tenureInput.value
    );

  if (name.length < 2) {
    showMessage(
      "Please enter your full name.",
      "error"
    );

    return;
  }

  if (
    !/^\d{10}$/.test(mobile)
  ) {
    showMessage(
      "Please enter a valid 10-digit mobile number.",
      "error"
    );

    return;
  }

  if (
    !Number.isFinite(
      requestedAmount
    ) ||
    requestedAmount <= 0
  ) {
    showMessage(
      "Please enter a valid requested loan amount.",
      "error"
    );

    return;
  }

  if (
    !Number.isFinite(
      monthlyIncome
    ) ||
    monthlyIncome < 0
  ) {
    showMessage(
      "Please enter a valid monthly income.",
      "error"
    );

    return;
  }

  if (
    !Number.isFinite(
      tenureMonths
    ) ||
    tenureMonths < 1 ||
    tenureMonths > 120
  ) {
    showMessage(
      "Tenure 1 se 120 months ke beech honi chahiye.",
      "error"
    );

    return;
  }

  try {
    showMessage(
      "Eligibility check ho raha hai...",
      "info"
    );

    const payload = {
      full_name: name,

      mobile: mobile,

      age: 30,

      employment_type:
        "other",

      existing_emi: 0,

      monthly_income:
        monthlyIncome,

      requested_amount:
        requestedAmount,

      tenure_months:
        tenureMonths
    };

    const data =
      await apiRequest(
        `${API_BASE}/api/eligibility`,
        {
          method: "POST",

          body: JSON.stringify(
            payload
          )
        }
      );

    const isEligible =
      data.eligible === true ||
      data.eligibility_status ===
        "likely_eligible";

    const needsReview =
      data.eligibility_status ===
      "needs_review";

    const title =
      document.getElementById(
        "eligibilityTitle"
      );

    const message =
      document.getElementById(
        "eligibilityMessage"
      );

    const estimatedEmi =
      document.getElementById(
        "estimatedEmi"
      );

    const estimatedRate =
      document.getElementById(
        "estimatedRate"
      );

    const inquiryId =
      document.getElementById(
        "inquiryId"
      );

    if (title) {
      title.textContent =
        isEligible
          ? "Preliminary Eligibility: Likely Eligible"
          : needsReview
          ? "Preliminary Eligibility: Review Required"
          : "Preliminary Eligibility: Not Eligible";
    }

    if (message) {
      message.textContent =
        data.message ||
        data.eligibility_reason ||
        "Preliminary eligibility result received.";
    }

    if (estimatedEmi) {
      estimatedEmi.textContent =
        formatNumber(
          data.estimated_emi ??
            data.estimatedEmi ??
            0
        );
    }

    if (estimatedRate) {
      estimatedRate.textContent =
        data.estimated_rate ??
        data.estimatedRate ??
        12;
    }

    if (inquiryId) {
      inquiryId.textContent =
        data.inquiry_id ||
        data.inquiryId ||
        "-";
    }

    if (result) {
      result.style.display =
        "block";
    }

    showEligibilityStep(3);

    showMessage(
      "Preliminary eligibility result mil gaya.",
      "success"
    );
  } catch (error) {
    console.error(
      "checkEligibility:",
      error
    );

    if (result) {
      result.style.display =
        "block";
    }

    const message =
      document.getElementById(
        "eligibilityMessage"
      );

    if (message) {
      message.textContent =
        error.message;
    }

    showMessage(
      error.message,
      "error"
    );
  }
}

/* =========================
   OPTIONAL INQUIRY
========================= */

async function submitInquiry(
  event
) {
  if (event) {
    event.preventDefault();
  }

  const form =
    document.getElementById(
      "inquiryForm"
    );

  if (!form) {
    showMessage(
      "Inquiry form available nahi hai.",
      "error"
    );

    return;
  }

  try {
    showMessage(
      "Inquiry submit ho rahi hai...",
      "info"
    );

    const formData =
      new FormData(form);

    const payload =
      Object.fromEntries(
        formData.entries()
      );

    const data =
      await apiRequest(
        `${API_BASE}/api/inquiries`,
        {
          method: "POST",

          body: JSON.stringify(
            payload
          )
        }
      );

    showMessage(
      data.message ||
        "Inquiry successfully submit ho gayi.",
      "success"
    );

    form.reset();
  } catch (error) {
    console.error(
      "submitInquiry:",
      error
    );

    showMessage(
      error.message,
      "error"
    );
  }
}

/* =========================
   EVENT LISTENERS
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const nextStep1 =
      document.getElementById(
        "nextStep1"
      );

    if (nextStep1) {
      nextStep1.addEventListener(
        "click",
        goToEligibilityStep2
      );
    }

    const backStep2 =
      document.getElementById(
        "backStep2"
      );

    if (backStep2) {
      backStep2.addEventListener(
        "click",
        goToEligibilityStep1
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

    const applicationForm =
      document.getElementById(
        "loanApplicationForm"
      );

    if (applicationForm) {
      applicationForm.addEventListener(
        "submit",
        submitApplication
      );
    }

    const uploadButton =
      document.getElementById(
        "uploadDocumentsButton"
      );

    if (uploadButton) {
      uploadButton.addEventListener(
        "click",
        uploadDocument
      );
    }

    const lookupForm =
      document.getElementById(
        "lookupForm"
      );

    if (lookupForm) {
      lookupForm.addEventListener(
        "submit",
        lookupLoan
      );
    }

    const paymentForm =
      document.getElementById(
        "paymentForm"
      );

    if (paymentForm) {
      paymentForm.addEventListener(
        "submit",
        handlePaymentForm
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

    if (
      document.getElementById(
        "eligibilityStep1"
      )
    ) {
      showEligibilityStep(1);
    }
  }
);

/* =========================
   GLOBAL FUNCTIONS
========================= */

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

window.goToEligibilityStep2 =
  goToEligibilityStep2;

window.goToEligibilityStep1 =
  goToEligibilityStep1;
