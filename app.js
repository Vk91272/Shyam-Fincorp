const API_BASE = "https://shyam-fincorp.onrender.com";

let currentApplicationId = "";
let currentMobile = "";
let currentLoan = null;
let currentEmiSchedule = [];
let currentPayments = [];


/* =========================
   COMMON HELPERS
========================= */

function showMessage(elementId, message, type = "error") {
  let element = document.getElementById(elementId);

  if (!element) {
    element = document.createElement("div");
    element.id = elementId;
    element.className = "message";

    document.body.appendChild(element);
  }

  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = "block";
}


function hideMessage(elementId) {
  const element = document.getElementById(elementId);

  if (element) {
    element.style.display = "none";
  }
}


function formatMoney(value) {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 0
  });
}


function formatNumber(value) {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 0
  });
}


function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}


function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value ?? "-";
  }
}


function showElement(id) {
  const element = document.getElementById(id);

  if (element) {
    element.style.display = "";
  }
}


function hideElement(id) {
  const element = document.getElementById(id);

  if (element) {
    element.style.display = "none";
  }
}


async function apiRequest(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
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


/* =========================
   ELIGIBILITY STEPS
========================= */

function showEligibilityStep(stepNumber) {
  const steps = [
    "eligibilityStep1",
    "eligibilityStep2",
    "eligibilityStep3"
  ];

  steps.forEach((id, index) => {
    const element = document.getElementById(id);

    if (!element) return;

    if (index + 1 === stepNumber) {
      element.classList.add("active");
    } else {
      element.classList.remove("active");
    }
  });


  for (let i = 1; i <= 3; i++) {
    const indicator = document.getElementById(
      `stepIndicator${i}`
    );

    if (!indicator) continue;

    indicator.classList.toggle(
      "active",
      i <= stepNumber
    );
  }


  const progressBar = document.getElementById("progressBar");

  if (progressBar) {
    const width =
      stepNumber === 1
        ? "0%"
        : stepNumber === 2
          ? "50%"
          : "100%";

    progressBar.style.width = width;
  }
}


function validateEligibilityStep1() {
  const name =
    document.getElementById("eligibilityName")?.value.trim();

  const mobile =
    document.getElementById("eligibilityMobile")?.value.trim();

  const age =
    Number(document.getElementById("eligibilityAge")?.value);

  const employment =
    document.getElementById("employmentType")?.value;


  if (!name) {
    alert("Please enter your full name.");
    return false;
  }


  if (!/^\d{10}$/.test(mobile)) {
    alert("Please enter a valid 10 digit mobile number.");
    return false;
  }


  if (!age || age < 18 || age > 80) {
    alert("Age must be between 18 and 80 years.");
    return false;
  }


  if (!employment) {
    alert("Please select your employment type.");
    return false;
  }


  return true;
}


function goToEligibilityStep2() {
  if (!validateEligibilityStep1()) {
    return;
  }

  showEligibilityStep(2);
}


function goToEligibilityStep1() {
  showEligibilityStep(1);
}


/* =========================
   LOAN APPLICATION
========================= */

async function submitApplication(event) {
  event.preventDefault();

  const form = document.getElementById("loanApplicationForm");

  if (!form) return;


  const formData = new FormData(form);

  const payload = {
    full_name:
      formData.get("full_name")?.toString().trim(),

    mobile:
      formData.get("mobile")?.toString().trim(),

    email:
      formData.get("email")?.toString().trim(),

    monthly_income:
      Number(formData.get("monthly_income") || 0),

    employment_type:
      formData.get("employment_type")?.toString().trim(),

    requested_amount:
      Number(formData.get("requested_amount") || 0),

    tenure_months:
      Number(formData.get("tenure_months") || 0),

    address:
      formData.get("address")?.toString().trim()
  };


  if (!/^\d{10}$/.test(payload.mobile)) {
    showMessage(
      "applicationResult",
      "Please enter a valid 10 digit mobile number.",
      "error"
    );
    return;
  }


  if (!payload.employment_type) {
    showMessage(
      "applicationResult",
      "Please select your employment type.",
      "error"
    );
    return;
  }


  try {

    showMessage(
      "applicationResult",
      "Submitting application...",
      "info"
    );


    const data = await apiRequest(
      "/api/applications",
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );


    currentApplicationId =
      data.application_id ||
      data.applicationId ||
      data.id ||
      "";


    currentMobile = payload.mobile;


    const result =
      document.getElementById("applicationResult");


    if (result) {
      result.style.display = "block";

      result.innerHTML = `
        <strong>Application Submitted Successfully!</strong>
        <br><br>
        Application ID:
        <strong>${currentApplicationId || "-"}</strong>
        <br><br>
        Please keep this Application ID safe.
      `;
    }


    const documentId =
      document.getElementById("documentApplicationId");

    if (documentId) {
      documentId.value = currentApplicationId;
    }


    showElement("documentUploadSection");

    document.getElementById(
      "documentUploadSection"
    )?.scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {

    showMessage(
      "applicationResult",
      error.message,
      "error"
    );
  }
}


/* =========================
   DOCUMENT UPLOAD
========================= */

async function uploadDocuments() {

  const applicationId =
    document.getElementById(
      "documentApplicationId"
    )?.value.trim();


  if (!applicationId) {
    showMessage(
      "documentUploadMessage",
      "Application ID is missing.",
      "error"
    );
    return;
  }


  const files = [
    {
      id: "identityProof",
      type: "identity_proof"
    },
    {
      id: "panCard",
      type: "pan_card"
    },
    {
      id: "addressProof",
      type: "address_proof"
    },
    {
      id: "incomeProof",
      type: "income_proof"
    },
    {
      id: "applicantPhoto",
      type: "applicant_photo"
    }
  ];


  const selectedFiles = [];


  for (const item of files) {

    const input =
      document.getElementById(item.id);

    const file =
      input?.files?.[0];


    if (file) {
      selectedFiles.push({
        ...item,
        file
      });
    }
  }


  if (selectedFiles.length === 0) {
    showMessage(
      "documentUploadMessage",
      "Please select at least one document.",
      "error"
    );
    return;
  }


  try {

    showMessage(
      "documentUploadMessage",
      "Preparing document upload...",
      "info"
    );


    for (const item of selectedFiles) {

      if (item.file.size > 5 * 1024 * 1024) {
        throw new Error(
          `${item.file.name} is larger than 5 MB.`
        );
      }


      const uploadData =
        await apiRequest(
          "/api/documents/upload-url",
          {
            method: "POST",
            body: JSON.stringify({
              application_id: applicationId,
              document_type: item.type,
              file_name: item.file.name,
              content_type: item.file.type
            })
          }
        );


      const uploadUrl =
        uploadData.upload_url ||
        uploadData.uploadUrl ||
        uploadData.url;


      if (!uploadUrl) {
        throw new Error(
          "Upload URL was not returned by server."
        );
      }


      const uploadResponse =
        await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": item.file.type
          },
          body: item.file
        });


      if (!uploadResponse.ok) {
        throw new Error(
          `Failed to upload ${item.file.name}.`
        );
      }


      await apiRequest(
        "/api/documents/record",
        {
          method: "POST",
          body: JSON.stringify({
            application_id: applicationId,
            document_type: item.type,
            file_name: item.file.name,
            file_path:
              uploadData.file_path ||
              uploadData.path ||
              uploadData.object_path
          })
        }
      );
    }


    showMessage(
      "documentUploadMessage",
      "Documents uploaded successfully.",
      "success"
    );


    const status =
      document.getElementById(
        "documentUploadStatus"
      );


    if (status) {
      status.style.display = "block";

      status.textContent =
        "All selected documents have been uploaded successfully.";
    }


  } catch (error) {

    showMessage(
      "documentUploadMessage",
      error.message,
      "error"
    );
  }
}


/* =========================
   CUSTOMER LOAN LOOKUP
========================= */

async function lookupLoan(event) {
  event.preventDefault();


  const mobile =
    document.getElementById(
      "lookupMobile"
    )?.value.trim();


  const applicationId =
    document.getElementById(
      "lookupApplicationId"
    )?.value.trim();


  if (!/^\d{10}$/.test(mobile)) {
    showMessage(
      "lookupMessage",
      "Please enter a valid 10 digit mobile number.",
      "error"
    );
    return;
  }


  if (!applicationId) {
    showMessage(
      "lookupMessage",
      "Please enter your Application ID.",
      "error"
    );
    return;
  }


  try {

    showMessage(
      "lookupMessage",
      "Loading your loan details...",
      "info"
    );


    const data =
      await apiRequest(
        "/api/customer/loan",
        {
          method: "POST",
          body: JSON.stringify({
            mobile,
            application_id: applicationId
          })
        }
      );


    currentMobile = mobile;
    currentApplicationId = applicationId;


    currentLoan =
      getLoanObject(data);


    currentEmiSchedule =
      getScheduleFromData(data);


    displayLoan(currentLoan);

    displayPaymentSummary(
      currentLoan,
      currentEmiSchedule
    );

    displayEmiSchedule(
      currentEmiSchedule
    );


    await loadPaymentHistory();


    hideMessage("lookupMessage");


    document.getElementById(
      "loanSummarySection"
    )?.scrollIntoView({
      behavior: "smooth"
    });


  } catch (error) {

    showMessage(
      "lookupMessage",
      error.message,
      "error"
    );
  }
}


/* =========================
   LOAN DATA HELPERS
========================= */

function getLoanObject(data) {

  return (
    data.loan ||
    data.loan_account ||
    data.loanAccount ||
    data.account ||
    data
  );
}


function getScheduleFromData(data) {

  return (
    data.emi_schedule ||
    data.emiSchedule ||
    data.schedule ||
    data.emis ||
    []
  );
}


/* =========================
   DISPLAY LOAN
========================= */

function displayLoan(loan) {

  if (!loan) return;


  showElement("loanSummarySection");


  setText(
    "loanAccountNo",
    loan.account_number ||
    loan.loan_account_number ||
    loan.accountNo ||
    loan.loan_account ||
    "-"
  );


  setText(
    "loanPrincipal",
    formatNumber(
      loan.principal ||
      loan.loan_amount ||
      loan.amount ||
      0
    )
  );


  setText(
    "loanRate",
    loan.interest_rate ??
    loan.rate ??
    0
  );


  setText(
    "loanTenure",
    loan.tenure_months ??
    loan.tenure ??
    0
  );


  setText(
    "loanEmi",
    formatNumber(
      loan.emi ||
      loan.monthly_emi ||
      0
    )
  );


  setText(
    "loanStatus",
    loan.status ||
    "Active"
  );
}


/* =========================
   PAYMENT SUMMARY
========================= */

function displayPaymentSummary(
  loan,
  schedule
) {

  if (!loan) return;


  showElement("paymentSummarySection");


  const emiList =
    Array.isArray(schedule)
      ? schedule
      : [];


  let totalPayable = 0;
  let totalPaid = 0;
  let paidCount = 0;
  let pendingCount = 0;


  emiList.forEach((emi) => {

    const total =
      Number(
        emi.total ||
        emi.emi_amount ||
        emi.amount ||
        emi.total_amount ||
        0
      );


    const paid =
      Number(
        emi.paid_amount ||
        emi.paid ||
        0
      );


    totalPayable += total;
    totalPaid += paid;


    const status =
      String(
        emi.status || ""
      ).toLowerCase();


    if (
      status === "paid" ||
      paid >= total
    ) {
      paidCount++;
    } else {
      pendingCount++;
    }

  });


  const totalPending =
    Math.max(
      0,
      totalPayable - totalPaid
    );


  const progress =
    totalPayable > 0
      ? Math.round(
          (totalPaid / totalPayable) * 100
        )
      : 0;


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


  setText(
    "paymentProgress",
    progress
  );
}


/* =========================
   EMI SCHEDULE
========================= */

function displayEmiSchedule(schedule) {

  const tbody =
    document.getElementById(
      "emiTableBody"
    );


  if (!tbody) return;


  tbody.innerHTML = "";


  if (!Array.isArray(schedule) ||
      schedule.length === 0) {

    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          No EMI schedule found.
        </td>
      </tr>
    `;

    showElement("emiScheduleSection");
    return;
  }


  showElement("emiScheduleSection");


  schedule.forEach((emi, index) => {

    const row =
      document.createElement("tr");


    const emiNumber =
      emi.emi_number ||
      emi.installment_number ||
      emi.installment_no ||
      index + 1;


    const dueDate =
      emi.due_date ||
      emi.dueDate ||
      emi.payment_date;


    const principal =
      Number(
        emi.principal ||
        emi.principal_amount ||
        0
      );


    const interest =
      Number(
        emi.interest ||
        emi.interest_amount ||
        0
      );


    const total =
      Number(
        emi.total ||
        emi.emi_amount ||
        emi.amount ||
        emi.total_amount ||
        principal + interest
      );


    const paid =
      Number(
        emi.paid_amount ||
        emi.paid ||
        0
      );


    const status =
      String(
        emi.status || ""
      ).toLowerCase();


    const isPaid =
      status === "paid" ||
      paid >= total;


    row.innerHTML = `
      <td>${emiNumber}</td>

      <td>${formatDate(dueDate)}</td>

      <td>₹${formatNumber(principal)}</td>

      <td>₹${formatNumber(interest)}</td>

      <td>₹${formatNumber(total)}</td>

      <td>₹${formatNumber(paid)}</td>

      <td>
        ${
          isPaid
            ? `<strong>Paid</strong>`
            : `<button
                 type="button"
                 class="primary-btn"
                 onclick="payEmi(${emiNumber}, ${total})"
               >
                 Pay EMI
               </button>`
        }
      </td>
    `;


    tbody.appendChild(row);
  });
}


/* =========================
   NEXT PENDING EMI
========================= */

function getNextPendingEmi() {

  if (!Array.isArray(currentEmiSchedule)) {
    return null;
  }


  return currentEmiSchedule.find(
    (emi) => {

      const total =
        Number(
          emi.total ||
          emi.emi_amount ||
          emi.amount ||
          emi.total_amount ||
          0
        );


      const paid =
        Number(
          emi.paid_amount ||
          emi.paid ||
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
  ) || null;
}


/* =========================
   PAY EMI
========================= */

async function payEmi(
  emiNumber,
  amount
) {

  const paymentSection =
    document.getElementById(
      "paymentSection"
    );


  if (paymentSection) {
    paymentSection.style.display = "block";
  }


  const paymentAmount =
    document.getElementById(
      "paymentAmount"
    );


  if (paymentAmount) {
    paymentAmount.value =
      Number(amount || 0);
  }


  paymentSection?.scrollIntoView({
    behavior: "smooth"
  });
}


/* =========================
   PAYMENT FORM
========================= */

async function handlePaymentForm(event) {

  event.preventDefault();


  const amount =
    Number(
      document.getElementById(
        "paymentAmount"
      )?.value || 0
    );


  const method =
    document.getElementById(
      "paymentMethod"
    )?.value || "demo";


  if (!currentLoan) {

    showMessage(
      "paymentMessage",
      "Please view your loan first.",
      "error"
    );

    return;
  }


  if (!amount || amount <= 0) {

    showMessage(
      "paymentMessage",
      "Please enter a valid payment amount.",
      "error"
    );

    return;
  }


  const nextEmi =
    getNextPendingEmi();


  if (!nextEmi) {

    showMessage(
      "paymentMessage",
      "No pending EMI found.",
      "info"
    );

    return;
  }


  const emiNumber =
    nextEmi.emi_number ||
    nextEmi.installment_number ||
    nextEmi.installment_no;


  try {

    showMessage(
      "paymentMessage",
      "Processing demo payment...",
      "info"
    );


    await apiRequest(
      "/api/customer/pay-emi-test",
      {
        method: "POST",
        body: JSON.stringify({
          mobile: currentMobile,
          application_id: currentApplicationId,
          emi_number: emiNumber,
          amount,
          payment_method: method
        })
      }
    );


    showMessage(
      "paymentMessage",
      "EMI payment recorded successfully.",
      "success"
    );


    await refreshLoan();


  } catch (error) {

    showMessage(
      "paymentMessage",
      error.message,
      "error"
    );
  }
}


/* =========================
   PAYMENT HISTORY
========================= */

async function loadPaymentHistory() {

  if (!currentMobile ||
      !currentApplicationId) {
    return;
  }


  try {

    const data =
      await apiRequest(
        "/api/customer/payment-history",
        {
          method: "POST",
          body: JSON.stringify({
            mobile: currentMobile,
            application_id: currentApplicationId
          })
        }
      );


    currentPayments =
      data.payments ||
      data.payment_history ||
      data.history ||
      [];


    displayPaymentHistory(
      currentPayments
    );


  } catch (error) {

    console.error(
      "Payment history error:",
      error
    );
  }
}


function displayPaymentHistory(payments) {

  const tbody =
    document.getElementById(
      "paymentHistoryBody"
    );


  if (!tbody) return;


  tbody.innerHTML = "";


  if (!Array.isArray(payments) ||
      payments.length === 0) {

    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          No payment history found.
        </td>
      </tr>
    `;

    showElement("paymentHistorySection");
    return;
  }


  showElement("paymentHistorySection");


  payments.forEach((payment) => {

    const row =
      document.createElement("tr");


    row.innerHTML = `
      <td>
        ${formatDate(
          payment.created_at ||
          payment.payment_date ||
          payment.date
        )}
      </td>

      <td>
        ₹${formatNumber(
          payment.amount ||
          payment.payment_amount ||
          0
        )}
      </td>

      <td>
        ${payment.payment_method ||
          payment.method ||
          "-"}
      </td>

      <td>
        ${payment.transaction_reference ||
          payment.transaction_ref ||
          payment.reference ||
          "-"}
      </td>

      <td>
        ${payment.status || "-"}
      </td>
    `;


    tbody.appendChild(row);
  });
}


/* =========================
   REFRESH LOAN
========================= */

async function refreshLoan() {

  if (!currentMobile ||
      !currentApplicationId) {
    return;
  }


  try {

    const data =
      await apiRequest(
        "/api/customer/loan",
        {
          method: "POST",
          body: JSON.stringify({
            mobile: currentMobile,
            application_id: currentApplicationId
          })
        }
      );


    currentLoan =
      getLoanObject(data);


    currentEmiSchedule =
      getScheduleFromData(data);


    displayLoan(currentLoan);


    displayPaymentSummary(
      currentLoan,
      currentEmiSchedule
    );


    displayEmiSchedule(
      currentEmiSchedule
    );


    await loadPaymentHistory();

  } catch (error) {

    console.error(
      "Refresh loan error:",
      error
    );
  }
}


/* =========================
   CHECK ELIGIBILITY
========================= */

async function checkEligibility(event) {

  event.preventDefault();


  const fullName =
    document.getElementById(
      "eligibilityName"
    )?.value.trim();


  const mobile =
    document.getElementById(
      "eligibilityMobile"
    )?.value.trim();


  const age =
    Number(
      document.getElementById(
        "eligibilityAge"
      )?.value
    );


  const employmentType =
    document.getElementById(
      "employmentType"
    )?.value;


  const requestedAmount =
    Number(
      document.getElementById(
        "requestedAmount"
      )?.value
    );


  const monthlyIncome =
    Number(
      document.getElementById(
        "monthlyIncome"
      )?.value
    );


  const existingEmi =
    Number(
      document.getElementById(
        "existingEmi"
      )?.value || 0
    );


  const tenureMonths =
    Number(
      document.getElementById(
        "eligibilityTenure"
      )?.value
    );


  if (!fullName) {
    alert("Please enter your full name.");
    return;
  }


  if (!/^\d{10}$/.test(mobile)) {
    alert("Please enter a valid 10 digit mobile number.");
    return;
  }


  if (!age || age < 18 || age > 80) {
    alert("Age must be between 18 and 80.");
    return;
  }


  if (!employmentType) {
    alert("Please select employment type.");
    return;
  }


  if (!requestedAmount || requestedAmount <= 0) {
    alert("Please enter a valid loan amount.");
    return;
  }


  if (!monthlyIncome || monthlyIncome <= 0) {
    alert("Please enter your monthly income.");
    return;
  }


  if (existingEmi < 0) {
    alert("Existing EMI cannot be negative.");
    return;
  }


  if (!tenureMonths || tenureMonths <= 0) {
    alert("Please select loan tenure.");
    return;
  }


  const button =
    document.getElementById(
      "eligibilityButton"
    );


  if (button) {
    button.disabled = true;
    button.textContent =
      "Checking...";
  }


  try {

    const data =
      await apiRequest(
        "/api/eligibility",
        {
          method: "POST",

          body: JSON.stringify({
            full_name: fullName,
            mobile,
            age,
            employment_type: employmentType,
            monthly_income: monthlyIncome,
            existing_emi: existingEmi,
            requested_amount: requestedAmount,
            tenure_months: tenureMonths
          })
        }
      );


    const eligible =
      data.eligible ??
      data.is_eligible ??
      false;


    const title =
      document.getElementById(
        "eligibilityTitle"
      );


    const message =
      document.getElementById(
        "eligibilityMessage"
      );


    if (title) {
      title.textContent =
        eligible
          ? "Preliminary Eligibility"
          : "Eligibility Review";
    }


    if (message) {
      message.textContent =
        data.message ||
        (
          eligible
            ? "Based on the information provided, you may be eligible for further review."
            : "Based on the information provided, your application requires further review."
        );
    }


    setText(
      "estimatedEmi",
      formatNumber(
        data.estimated_emi ||
        data.estimatedEmi ||
        data.emi ||
        0
      )
    );


    setText(
      "estimatedRate",
      data.estimated_rate ??
      data.estimatedRate ??
      data.interest_rate ??
      12
    );


    setText(
      "inquiryId",
      data.inquiry_id ||
      data.inquiryId ||
      "-"
    );


    showEligibilityStep(3);


    document.getElementById(
      "eligibilityStep3"
    )?.scrollIntoView({
      behavior: "smooth"
    });


  } catch (error) {

    alert(error.message);

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent =
        "Check Eligibility";
    }
  }
}


/* =========================
   OPTIONAL INQUIRY
========================= */

async function submitInquiry(event) {

  event.preventDefault();

  const form =
    document.getElementById(
      "inquiryForm"
    );

  if (!form) return;


  const formData =
    new FormData(form);


  try {

    await apiRequest(
      "/api/inquiries",
      {
        method: "POST",
        body: JSON.stringify(
          Object.fromEntries(formData.entries())
        )
      }
    );


    showMessage(
      "inquiryMessage",
      "Your inquiry has been submitted.",
      "success"
    );


    form.reset();


  } catch (error) {

    showMessage(
      "inquiryMessage",
      error.message,
      "error"
    );
  }
}


/* =========================
   PAGE EVENTS
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
        uploadDocuments
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


    showEligibilityStep(1);
  }
);


/* =========================
   GLOBAL FUNCTIONS
========================= */

window.payEmi = payEmi;
window.refreshLoan = refreshLoan;
window.lookupLoan = lookupLoan;
window.checkEligibility = checkEligibility;
