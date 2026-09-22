const API_BASE = "https://shyam-fincorp.onrender.com";

let currentApplicationId =
  localStorage.getItem("sfl_application_id") || "";

let currentMobile =
  localStorage.getItem("sfl_mobile") || "";

let currentLoan = null;


// ======================================================
// BASIC HELPERS
// ======================================================

function $(id) {
  return document.getElementById(id);
}

async function getJson(url, options = {}) {
  const response = await fetch(url, options);

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      "Something went wrong. Please try again."
    );
  }

  return data;
}

function money(value) {
  const amount = Number(value || 0);

  return "₹" + amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function showMessage(elementId, message, type = "") {
  const element = $(elementId);

  if (!element) return;

  element.textContent = message;
  element.className = type
    ? `message ${type}`
    : "message";
}


// ======================================================
// SCREEN NAVIGATION
// ======================================================

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  const screen = $(screenId);

  if (screen) {
    screen.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ======================================================
// HOME BUTTONS
// ======================================================

function openEligibility() {
  showScreen("eligibility");

  const step1 = $("eligibilityStep1");
  const step2 = $("eligibilityStep2");
  const result = $("eligibilityResult");

  if (step1) step1.style.display = "block";
  if (step2) step2.style.display = "none";
  if (result) result.style.display = "none";
}

function openApply() {
  showScreen("apply");
}

function openDocuments() {
  showScreen("documents");
}

function openCalculator() {
  showScreen("calculator");
}

function openMyLoan() {
  showScreen("myloan");

  const applicationInput = $("loanApplicationId");

  if (applicationInput && currentApplicationId) {
    applicationInput.value = currentApplicationId;
  }

  const mobileInput = $("loanMobile");

  if (mobileInput && currentMobile) {
    mobileInput.value = currentMobile;
  }
}

function openContact() {
  showScreen("contact");
}

function goHome() {
  showScreen("home");
}


// ======================================================
// ELIGIBILITY - STEP 1
// ======================================================

function setupEligibility() {
  const nextButton = $("eligNext");

  if (!nextButton) return;

  nextButton.addEventListener("click", function () {

    const name = $("eligName")?.value.trim();
    const mobile = $("eligMobile")?.value.trim();
    const age = Number($("eligAge")?.value);
    const employment = $("eligEmployment")?.value;

    if (!name) {
      alert("Please enter your full name.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!age || age < 18 || age > 80) {
      alert("Age must be between 18 and 80 years.");
      return;
    }

    if (!employment) {
      alert("Please select employment type.");
      return;
    }

    const step1 = $("eligibilityStep1");
    const step2 = $("eligibilityStep2");

    if (step1) step1.style.display = "none";
    if (step2) step2.style.display = "block";
  });
}


// ======================================================
// ELIGIBILITY FORM
// ======================================================

function setupEligibilityForm() {
  const form = $("eligibilityForm");

  if (!form) return;

  form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const button = form.querySelector("button[type='submit']");

    if (button) {
      button.disabled = true;
      button.textContent = "Checking...";
    }

    try {

      const name = $("eligName")?.value.trim();
      const mobile = $("eligMobile")?.value.trim();
      const age = Number($("eligAge")?.value);
      const employment = $("eligEmployment")?.value;

      const monthlyIncome =
        Number($("eligIncome")?.value || 0);

      const existingEmi =
        Number($("eligExistingEmi")?.value || 0);

      const requestedAmount =
        Number($("eligAmount")?.value || 0);

      const tenureMonths =
        Number($("eligTenure")?.value || 0);


      if (!name) {
        throw new Error("Please enter your full name.");
      }

      if (!/^[0-9]{10}$/.test(mobile)) {
        throw new Error("Please enter a valid 10-digit mobile number.");
      }

      if (age < 18 || age > 80) {
        throw new Error("Age must be between 18 and 80.");
      }

      if (!monthlyIncome || monthlyIncome <= 0) {
        throw new Error("Please enter your monthly income.");
      }

      if (!requestedAmount || requestedAmount <= 0) {
        throw new Error("Please enter requested loan amount.");
      }

      if (!tenureMonths || tenureMonths <= 0) {
        throw new Error("Please select loan tenure.");
      }


      const result = await getJson(
        `${API_BASE}/api/eligibility`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            full_name: name,
            mobile: mobile,
            age: age,
            employment_type: employment,

            monthly_income: monthlyIncome,
            existing_emi: existingEmi,

            requested_amount: requestedAmount,
            tenure_months: tenureMonths

          })
        }
      );


      const resultBox = $("eligibilityResult");

      if (resultBox) {

        resultBox.style.display = "block";

        resultBox.innerHTML = `

          <div class="eligibility-result-card">

            <h3>Eligibility Result</h3>

            <p>
              <strong>Status:</strong>
              ${result.eligibility_status || "Under Review"}
            </p>

            <p>
              <strong>Estimated Interest Rate:</strong>
              ${result.estimated_interest_rate || 12}%
            </p>

            <p>
              <strong>Estimated EMI:</strong>
              ${money(result.estimated_emi)}
            </p>

            <p>
              ${result.eligibility_reason || ""}
            </p>

            <small>
              This is a preliminary eligibility inquiry only.
              Final loan approval is subject to verification
              and applicable terms.
            </small>

          </div>

        `;
      }

      if ($("eligibilityStep2")) {
        $("eligibilityStep2").style.display = "none";
      }

    } catch (error) {

      alert(error.message);

    } finally {

      if (button) {
        button.disabled = false;
        button.textContent = "Check Eligibility";
      }

    }

  });
}


// ======================================================
// ELIGIBILITY BACK BUTTON
// ======================================================

function setupEligibilityBack() {

  const backButton = $("eligBack");

  if (!backButton) return;

  backButton.addEventListener("click", function () {

    if ($("eligibilityStep1")) {
      $("eligibilityStep1").style.display = "block";
    }

    if ($("eligibilityStep2")) {
      $("eligibilityStep2").style.display = "none";
    }

  });
}


// ======================================================
// LOAN APPLICATION
// ======================================================

function setupLoanForm() {

  const form = $("loanForm");

  if (!form) return;

  form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const button =
      form.querySelector("button[type='submit']");

    if (button) {
      button.disabled = true;
      button.textContent = "Submitting...";
    }

    try {

      const payload = {

        full_name:
          $("appName")?.value.trim(),

        mobile:
          $("appMobile")?.value.trim(),

        email:
          $("appEmail")?.value.trim(),

        monthly_income:
          Number($("appIncome")?.value || 0),

        requested_amount:
          Number($("appAmount")?.value || 0),

        tenure_months:
          Number($("appTenure")?.value || 0),

        address:
          $("appAddress")?.value.trim()

      };


      if (!payload.full_name) {
        throw new Error("Please enter full name.");
      }

      if (!/^[0-9]{10}$/.test(payload.mobile)) {
        throw new Error("Please enter valid 10-digit mobile number.");
      }

      if (!payload.requested_amount) {
        throw new Error("Please enter loan amount.");
      }

      if (!payload.tenure_months) {
        throw new Error("Please select tenure.");
      }


      const result = await getJson(
        `${API_BASE}/api/applications`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(payload)
        }
      );


      currentApplicationId =
        result.application_id ||
        result.application?.application_id ||
        "";

      currentMobile = payload.mobile;


      if (currentApplicationId) {

        localStorage.setItem(
          "sfl_application_id",
          currentApplicationId
        );
      }

      localStorage.setItem(
        "sfl_mobile",
        currentMobile
      );


      showMessage(
        "applicationMessage",
        `Application submitted successfully. Application ID: ${currentApplicationId}`,
        "success"
      );


      if ($("documentApplicationId")) {
        $("documentApplicationId").value =
          currentApplicationId;
      }


      setTimeout(() => {
        showScreen("documents");
      }, 1000);


    } catch (error) {

      showMessage(
        "applicationMessage",
        error.message,
        "error"
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.textContent = "Submit Loan Application";
      }

    }

  });
}


// ======================================================
// DOCUMENT UPLOAD
// ======================================================

function setupDocumentForm() {

  const form = $("documentForm");

  if (!form) return;

  form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const applicationId =
      $("documentApplicationId")?.value.trim();

    const documentType =
      $("documentType")?.value;

    const file =
      $("documentFile")?.files?.[0];


    if (!applicationId) {
      showMessage(
        "documentMessage",
        "Please enter Application ID.",
        "error"
      );
      return;
    }

    if (!documentType) {
      showMessage(
        "documentMessage",
        "Please select document type.",
        "error"
      );
      return;
    }

    if (!file) {
      showMessage(
        "documentMessage",
        "Please select a file.",
        "error"
      );
      return;
    }


    if (file.size > 5 * 1024 * 1024) {

      showMessage(
        "documentMessage",
        "Maximum file size is 5 MB.",
        "error"
      );

      return;
    }


    const button =
      form.querySelector("button[type='submit']");

    if (button) {
      button.disabled = true;
      button.textContent = "Uploading...";
    }


    try {

      // Step 1: Get signed upload URL

      const uploadInfo = await getJson(
        `${API_BASE}/api/documents/upload-url`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            application_id:
              applicationId,

            document_type:
              documentType,

            file_name:
              file.name,

            file_type:
              file.type,

            file_size:
              file.size

          })
        }
      );


      const uploadUrl =
        uploadInfo.signedUrl ||
        uploadInfo.signed_url ||
        uploadInfo.url;


      if (!uploadUrl) {
        throw new Error(
          "Upload URL was not received from server."
        );
      }


      // Step 2: Upload file

      const uploadResponse =
        await fetch(uploadUrl, {

          method: "PUT",

          headers: {
            "Content-Type":
              file.type || "application/octet-stream"
          },

          body: file

        });


      if (!uploadResponse.ok) {
        throw new Error(
          "Document upload failed."
        );
      }


      // Step 3: Try recording document

      try {

        await getJson(
          `${API_BASE}/api/documents/record`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({

              application_id:
                applicationId,

              document_type:
                documentType,

              file_name:
                file.name,

              file_type:
                file.type,

              file_size:
                file.size,

              path:
                uploadInfo.path ||
                uploadInfo.file_path ||
                uploadInfo.object_path ||
                ""

            })
          }
        );

      } catch (recordError) {

        // Upload itself succeeded.
        console.warn(
          "Document record API:",
          recordError.message
        );

      }


      showMessage(
        "documentMessage",
        "Document uploaded successfully.",
        "success"
      );


      form.reset();


    } catch (error) {

      showMessage(
        "documentMessage",
        error.message,
        "error"
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.textContent = "Upload Document";
      }

    }

  });
}


// ======================================================
// MY LOAN - LOAD CUSTOMER LOAN
// ======================================================

function setupLoanLookup() {

  const button = $("loadLoanBtn");

  if (!button) return;

  button.addEventListener("click", loadCustomerLoan);
}


async function loadCustomerLoan() {

  const applicationInput =
    $("loanApplicationId");

  const mobileInput =
    $("loanMobile");


  const applicationId =
    applicationInput?.value.trim() ||
    currentApplicationId;

  const mobile =
    mobileInput?.value.trim() ||
    currentMobile;


  if (!applicationId) {

    showMessage(
      "loanMessage",
      "Please enter Application ID.",
      "error"
    );

    return;
  }


  if (!/^[0-9]{10}$/.test(mobile)) {

    showMessage(
      "loanMessage",
      "Please enter valid 10-digit mobile number.",
      "error"
    );

    return;
  }


  const button = $("loadLoanBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Loading...";
  }


  try {

    currentApplicationId = applicationId;
    currentMobile = mobile;


    localStorage.setItem(
      "sfl_application_id",
      applicationId
    );

    localStorage.setItem(
      "sfl_mobile",
      mobile
    );


    const data = await getJson(
      `${API_BASE}/api/customer/loan`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          application_id:
            applicationId,

          mobile:
            mobile

        })
      }
    );


    displayLoan(data);

    showScreen("dashboard");


  } catch (error) {

    showMessage(
      "loanMessage",
      error.message,
      "error"
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = "View My Loan";
    }

  }

}


// ======================================================
// DISPLAY LOAN DASHBOARD
// ======================================================

function displayLoan(data) {

  currentLoan = data.loan || {};


  const customer =
    data.customer || {};


  // --------------------------------------------
  // Customer Name
  // --------------------------------------------

  const customerName =
    customer.full_name ||
    currentLoan.customer_name ||
    currentLoan.full_name ||
    "Customer";


  if ($("displayCustomerName")) {
    $("displayCustomerName").textContent =
      customerName;
  }

  if ($("dashboardWelcomeName")) {
    $("dashboardWelcomeName").textContent =
      customerName;
  }


  // --------------------------------------------
  // Loan Account Number
  // --------------------------------------------

  const loanAccountNo =
    currentLoan.loan_account_no ||
    data.loan_account_no ||
    "-";


  if ($("displayLoanAccount")) {
    $("displayLoanAccount").textContent =
      loanAccountNo;
  }

  if ($("dashboardAccountPill")) {
    $("dashboardAccountPill").textContent =
      loanAccountNo;
  }


  // --------------------------------------------
  // Loan Amount
  // --------------------------------------------

  if ($("displayLoanAmount")) {

    $("displayLoanAmount").textContent =
      money(
        currentLoan.principal ||
        currentLoan.loan_amount ||
        0
      );

  }


  // --------------------------------------------
  // EMI
  // --------------------------------------------

  if ($("displayEmi")) {

    $("displayEmi").textContent =
      money(currentLoan.emi);

  }


  // --------------------------------------------
  // Tenure
  // --------------------------------------------

  if ($("displayTenure")) {

    $("displayTenure").textContent =
      `${currentLoan.tenure_months || 0} Months`;

  }


  // --------------------------------------------
  // Outstanding
  // --------------------------------------------

  let outstanding =
    currentLoan.outstanding_amount;


  if (
    outstanding === undefined ||
    outstanding === null
  ) {

    const schedule =
      data.emi_schedule || [];

    outstanding =
      schedule.reduce(
        (total, row) => {

          const due =
            Number(row.total_due || 0);

          const paid =
            Number(row.paid_amount || 0);

          return total + Math.max(
            due - paid,
            0
          );

        },
        0
      );

  }


  if ($("displayOutstanding")) {

    $("displayOutstanding").textContent =
      money(outstanding);

  }


  // --------------------------------------------
  // Loan Status
  // --------------------------------------------

  if ($("displayLoanStatus")) {

    $("displayLoanStatus").textContent =
      currentLoan.status ||
      "Active";

  }


  // --------------------------------------------
  // Payment Summary
  // --------------------------------------------

  if ($("paymentSummaryAmount")) {

    $("paymentSummaryAmount").textContent =
      money(currentLoan.emi);

  }


  // --------------------------------------------
  // EMI Schedule
  // --------------------------------------------

  renderSchedule(
    data.emi_schedule || []
  );


  // --------------------------------------------
  // Payment History
  // --------------------------------------------

  loadPaymentHistory();

}


// ======================================================
// EMI SCHEDULE
// ======================================================

function renderSchedule(schedule) {

  const container =
    $("emiScheduleContainer");

  if (!container) return;


  if (!Array.isArray(schedule) ||
      schedule.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        EMI schedule not available.
      </div>
    `;

    return;
  }


  container.innerHTML = schedule.map(row => {

    const installment =
      Number(row.installment_no || 0);

    const principal =
      Number(row.principal_due || 0);

    const interest =
      Number(row.interest_due || 0);

    const total =
      Number(row.total_due || 0);

    const paid =
      Number(row.paid_amount || 0);

    const balance =
      Math.max(
        total - paid,
        0
      );


    const status =
      String(
        row.status || "pending"
      ).toLowerCase();


    const statusText =
      status === "paid"
        ? "Paid"
        : "Pending";


    return `

      <div class="emi-row">

        <div>
          <strong>
            EMI ${installment}
          </strong>

          <small>
            ${formatDate(row.due_date)}
          </small>
        </div>


        <div>
          <span>
            Principal
          </span>

          <strong>
            ${money(principal)}
          </strong>
        </div>


        <div>
          <span>
            Interest
          </span>

          <strong>
            ${money(interest)}
          </strong>
        </div>


        <div>
          <span>
            EMI
          </span>

          <strong>
            ${money(total)}
          </strong>
        </div>


        <div>
          <span>
            Paid
          </span>

          <strong>
            ${money(paid)}
          </strong>
        </div>


        <div>
          <span>
            Balance
          </span>

          <strong>
            ${money(balance)}
          </strong>
        </div>


        <div>
          <span class="emi-status ${status}">
            ${statusText}
          </span>
        </div>

      </div>

    `;

  }).join("");


  fillPaymentInstallments(schedule);
}


// ======================================================
// PAYMENT INSTALLMENT DROPDOWN
// ======================================================

function fillPaymentInstallments(schedule) {

  const select =
    $("paymentInstallment");

  if (!select) return;


  select.innerHTML = `
    <option value="">
      Select EMI
    </option>
  `;


  schedule.forEach(row => {

    const status =
      String(
        row.status || "pending"
      ).toLowerCase();


    if (status === "paid") {
      return;
    }


    const totalDue =
      Number(row.total_due || 0);

    const paid =
      Number(row.paid_amount || 0);

    const balance =
      Math.max(
        totalDue - paid,
        0
      );


    const option =
      document.createElement("option");


    option.value =
      row.installment_no;


    option.dataset.amount =
      balance;


    option.textContent =
      `EMI ${row.installment_no} - ${money(balance)}`;


    select.appendChild(option);

  });


  select.onchange =
    updatePaymentAmount;


  updatePaymentAmount();
}


// ======================================================
// UPDATE PAYMENT AMOUNT
// ======================================================

function updatePaymentAmount() {

  const select =
    $("paymentInstallment");

  const amountInput =
    $("paymentAmount");

  if (!select || !amountInput) return;


  const option =
    select.options[
      select.selectedIndex
    ];


  if (!option ||
      !option.dataset.amount) {

    amountInput.value = "";

    return;
  }


  amountInput.value =
    Number(
      option.dataset.amount
    ).toFixed(2);
}


// ======================================================
// PAYMENT FORM
// ======================================================

function setupPaymentForm() {

  const form =
    $("paymentForm");

  if (!form) return;


  form.addEventListener(
    "submit",
    async function(event) {

      event.preventDefault();


      if (!currentApplicationId) {

        showMessage(
          "paymentMessage",
          "Please load your loan first.",
          "error"
        );

        return;
      }


      const installment =
        Number(
          $("paymentInstallment")?.value
        );


      const amount =
        Number(
          $("paymentAmount")?.value
        );


      const method =
        $("paymentMode")?.value ||
        "UPI";


      if (!installment) {

        showMessage(
          "paymentMessage",
          "Please select EMI.",
          "error"
        );

        return;
      }


      if (!amount || amount <= 0) {

        showMessage(
          "paymentMessage",
          "Invalid payment amount.",
          "error"
        );

        return;
      }


      const button =
        form.querySelector(
          "button[type='submit']"
        );


      if (button) {

        button.disabled = true;

        button.textContent =
          "Processing...";

      }


      try {

        const result =
          await getJson(
            `${API_BASE}/api/customer/pay-emi-test`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({

                application_id:
                  currentApplicationId,

                loan_account_id:
                  currentLoan?.id ||
                  currentLoan?.loan_account_id ||
                  "",

                mobile:
                  currentMobile,

                installment_no:
                  installment,

                amount:
                  amount,

                payment_method:
                  method

              })
            }
          );


        showMessage(
          "paymentMessage",

          `Payment successful. Transaction Reference: ${
            result.transaction_reference ||
            "-"
          }`,

          "success"
        );


        // Reload latest loan data
        setTimeout(
          async () => {

            try {

              await loadCustomerLoan();

            } catch (error) {

              console.error(
                error
              );

            }

          },
          700
        );


      } catch (error) {

        showMessage(
          "paymentMessage",
          error.message,
          "error"
        );

      } finally {

        if (button) {

          button.disabled = false;

          button.textContent =
            "Pay EMI";

        }

      }

    }
  );
}


// ======================================================
// PAYMENT HISTORY
// ======================================================

async function loadPaymentHistory() {

  const container =
    $("paymentHistoryContainer");

  if (!container) return;


  if (!currentApplicationId ||
      !currentMobile) {

    container.innerHTML = `
      <div class="empty-state">
        No payment history available.
      </div>
    `;

    return;
  }


  container.innerHTML = `
    <div class="loading-state">
      Loading payment history...
    </div>
  `;


  try {

    const data =
      await getJson(
        `${API_BASE}/api/customer/payment-history`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            application_id:
              currentApplicationId,

            mobile:
              currentMobile

          })

        }
      );


    let history = [];


    if (Array.isArray(data)) {

      history = data;

    } else if (
      Array.isArray(data.payments)
    ) {

      history =
        data.payments;

    } else if (
      Array.isArray(data.payment_history)
    ) {

      history =
        data.payment_history;

    } else if (
      Array.isArray(data.history)
    ) {

      history =
        data.history;

    } else if (
      Array.isArray(data.data)
    ) {

      history =
        data.data;

    }


    renderPaymentHistory(history);


  } catch (error) {

    console.error(
      "Payment history error:",
      error
    );


    container.innerHTML = `
      <div class="empty-state">
        Unable to load payment history.
      </div>
    `;

  }
}


// ======================================================
// RENDER PAYMENT HISTORY
// ======================================================

function renderPaymentHistory(history) {

  const container =
    $("paymentHistoryContainer");

  if (!container) return;


  if (!Array.isArray(history) ||
      history.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        No payment history available.
      </div>
    `;

    return;
  }


  container.innerHTML =
    history.map(payment => {

      const amount =
        Number(
          payment.amount || 0
        );


      const status =
        String(
          payment.status ||
          "received"
        ).toLowerCase();


      const transactionReference =
        payment.transaction_reference ||
        payment.transaction_id ||
        payment.reference ||
        "-";


      const installment =
        payment.installment_no ||
        payment.emi_no ||
        payment.installment ||
        "-";


      const paymentMethod =
        payment.payment_method ||
        payment.mode ||
        "-";


      const paymentDate =
        payment.payment_date ||
        payment.created_at ||
        payment.paid_at;


      return `

        <div class="payment-history-item">

          <div class="payment-history-main">

            <div>

              <strong>
                ${money(amount)}
              </strong>

              <small>
                EMI ${installment}
              </small>

            </div>


            <span class="history-status ${status}">
              ${capitalize(status)}
            </span>

          </div>


          <div class="payment-history-details">

            <div>
              <span>Payment Mode</span>
              <strong>
                ${paymentMethod}
              </strong>
            </div>


            <div>
              <span>Transaction ID</span>
              <strong>
                ${transactionReference}
              </strong>
            </div>


            <div>
              <span>Date</span>
              <strong>
                ${formatDateTime(paymentDate)}
              </strong>
            </div>

          </div>

        </div>

      `;

    }).join("");
}


// ======================================================
// EMI CALCULATOR
// ======================================================

function setupCalculator() {

  const form =
    $("calculatorForm");

  if (!form) return;


  form.addEventListener(
    "submit",
    function(event) {

      event.preventDefault();

      calculateEMI();

    }
  );
}


function calculateEMI() {

  const amount =
    Number(
      $("calculatorAmount")?.value ||
      $("calcAmount")?.value ||
      0
    );


  const rate =
    Number(
      $("calculatorRate")?.value ||
      $("calcRate")?.value ||
      12
    );


  const tenure =
    Number(
      $("calculatorTenure")?.value ||
      $("calcTenure")?.value ||
      0
    );


  if (!amount ||
      !tenure) {

    alert(
      "Please enter loan amount and tenure."
    );

    return;
  }


  const monthlyRate =
    rate / 12 / 100;


  let emi;


  if (monthlyRate === 0) {

    emi =
      amount / tenure;

  } else {

    emi =
      amount *
      monthlyRate *
      Math.pow(
        1 + monthlyRate,
        tenure
      ) /
      (
        Math.pow(
          1 + monthlyRate,
          tenure
        ) - 1
      );

  }


  const totalPayment =
    emi * tenure;


  const totalInterest =
    totalPayment - amount;


  const emiOutput =
    $("calculatorEmi") ||
    $("calcEmi");


  const interestOutput =
    $("calculatorInterest") ||
    $("calcInterest");


  const totalOutput =
    $("calculatorTotal") ||
    $("calcTotal");


  if (emiOutput) {

    emiOutput.textContent =
      money(emi);

  }


  if (interestOutput) {

    interestOutput.textContent =
      money(totalInterest);

  }


  if (totalOutput) {

    totalOutput.textContent =
      money(totalPayment);

  }

}


// ======================================================
// DATE FORMAT
// ======================================================

function formatDate(value) {

  if (!value) return "-";


  const date =
    new Date(value);


  if (Number.isNaN(date.getTime())) {
    return value;
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


function formatDateTime(value) {

  if (!value) return "-";


  const date =
    new Date(value);


  if (Number.isNaN(date.getTime())) {
    return value;
  }


  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


function capitalize(value) {

  if (!value) return "";

  return value.charAt(0).toUpperCase() +
    value.slice(1);

}


// ======================================================
// BACK BUTTONS
// ======================================================

function setupBackButtons() {

  document
    .querySelectorAll("[data-back]")
    .forEach(button => {

      button.addEventListener(
        "click",
        function() {

          const target =
            button.dataset.back;

          if (target) {
            showScreen(target);
          }

        }
      );

    });

}


// ======================================================
// NAVIGATION LINKS
// ======================================================

function setupNavigation() {

  document
    .querySelectorAll("[data-screen]")
    .forEach(button => {

      button.addEventListener(
        "click",
        function() {

          const target =
            button.dataset.screen;

          if (target) {
            showScreen(target);
          }

        }
      );

    });

}


// ======================================================
// INITIALIZATION
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    setupEligibility();

    setupEligibilityForm();

    setupEligibilityBack();

    setupLoanForm();

    setupDocumentForm();

    setupLoanLookup();

    setupPaymentForm();

    setupCalculator();

    setupBackButtons();

    setupNavigation();


    // --------------------------------------------
    // Restore saved application information
    // --------------------------------------------

    if ($("loanApplicationId") &&
        currentApplicationId) {

      $("loanApplicationId").value =
        currentApplicationId;

    }


    if ($("loanMobile") &&
        currentMobile) {

      $("loanMobile").value =
        currentMobile;

    }


    if ($("documentApplicationId") &&
        currentApplicationId) {

      $("documentApplicationId").value =
        currentApplicationId;

    }

  }
);
