const API_BASE = "https://shyam-fincorp.onrender.com";

let currentLoanAccountId = null;


// =====================================================
// COMMON HELPERS
// =====================================================

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function showMessage(elementId, message, type = "") {
  const element = document.getElementById(elementId);

  if (!element) return;

  element.textContent = message;
  element.className = "message " + type;
}


// =====================================================
// LOAN ELIGIBILITY
// =====================================================

const eligibilityForm =
  document.getElementById("eligibilityForm");

if (eligibilityForm) {

  eligibilityForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const button =
      document.getElementById("eligibilityButton");

    const resultBox =
      document.getElementById("eligibilityResult");

    const title =
      document.getElementById("eligibilityTitle");

    const message =
      document.getElementById("eligibilityMessage");

    button.disabled = true;
    button.textContent = "Checking...";

    resultBox.style.display = "none";

    const payload = {

      full_name:
        document.getElementById("eligibilityName").value.trim(),

      mobile:
        document.getElementById("eligibilityMobile").value.trim(),

      email:
        document.getElementById("eligibilityEmail").value.trim(),

      age:
        Number(document.getElementById("eligibilityAge").value),

      employment_type:
        document.getElementById("employmentType").value,

      monthly_income:
        Number(document.getElementById("monthlyIncome").value),

      existing_emi:
        Number(document.getElementById("existingEmi").value || 0),

      requested_amount:
        Number(document.getElementById("requestedAmount").value),

      tenure_months:
        Number(document.getElementById("eligibilityTenure").value)

    };


    try {

      const response = await fetch(
        `${API_BASE}/api/eligibility`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(payload)
        }
      );


      const data = await response.json();


      if (!response.ok) {

        throw new Error(
          data.error || "Eligibility check failed"
        );

      }


      resultBox.style.display = "block";


      document.getElementById("inquiryId").textContent =
        data.inquiry_id || "-";


      document.getElementById("estimatedRate").textContent =
        data.estimated_interest_rate
          ? `${data.estimated_interest_rate}%`
          : "-";


      document.getElementById("estimatedEmi").textContent =
        formatMoney(data.estimated_emi);


      if (data.eligibility_status === "likely_eligible") {

        title.textContent =
          "Preliminary Result: Likely Eligible";

        message.textContent =
          data.eligibility_reason ||
          "Your preliminary eligibility looks positive.";

      }

      else if (data.eligibility_status === "needs_review") {

        title.textContent =
          "Preliminary Result: Further Review Required";

        message.textContent =
          data.eligibility_reason ||
          "Your application requires further review.";

      }

      else {

        title.textContent =
          "Preliminary Result: Not Eligible";

        message.textContent =
          data.eligibility_reason ||
          "The preliminary criteria were not met.";

      }


      resultBox.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

    }

    catch (error) {

      resultBox.style.display = "block";

      title.textContent =
        "Eligibility Check Failed";

      message.textContent =
        error.message ||
        "Unable to check eligibility. Please try again.";

      document.getElementById("inquiryId").textContent = "-";
      document.getElementById("estimatedRate").textContent = "-";
      document.getElementById("estimatedEmi").textContent = "-";

    }

    finally {

      button.disabled = false;
      button.textContent = "Check Eligibility";

    }

  });

}



// =====================================================
// LOAN APPLICATION
// =====================================================

const loanApplicationForm =
  document.getElementById("loanApplicationForm");

if (loanApplicationForm) {

  loanApplicationForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      const result =
        document.getElementById("applicationResult");

      result.style.display = "block";
      result.textContent = "Submitting application...";


      const payload = {

        full_name:
          document.getElementById("fullName").value.trim(),

        mobile:
          document.getElementById("mobile").value.trim(),

        email:
          document.getElementById("email").value.trim(),

        monthly_income:
          Number(
            document.getElementById(
              "monthlyIncomeApplication"
            ).value
          ),

        requested_amount:
          Number(
            document.getElementById(
              "requestedAmountApplication"
            ).value
          ),

        tenure_months:
          Number(
            document.getElementById(
              "tenureApplication"
            ).value
          ),

        address:
          document.getElementById("address").value.trim()

      };


      try {

        const response = await fetch(
          `${API_BASE}/api/applications`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify(payload)
          }
        );


        const data = await response.json();


        if (!response.ok) {

          throw new Error(
            data.error || "Application submission failed"
          );

        }


        result.innerHTML = `
          <strong>Application submitted successfully.</strong>
          <br><br>
          Your Application ID is:
          <strong>${data.application_id}</strong>
          <br><br>
          Please save this Application ID for future reference.
        `;

        result.className = "result-box success";


        loanApplicationForm.reset();

      }

      catch (error) {

        result.textContent =
          error.message ||
          "Unable to submit application.";

        result.className = "result-box error";

      }

    }
  );

}



// =====================================================
// CUSTOMER LOAN LOOKUP
// =====================================================

const lookupForm =
  document.getElementById("lookupForm");

if (lookupForm) {

  lookupForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      showMessage(
        "lookupMessage",
        "Searching loan account..."
      );


      const mobile =
        document.getElementById(
          "lookupMobile"
        ).value.trim();


      const applicationId =
        document.getElementById(
          "lookupApplicationId"
        ).value.trim();


      try {

        const response = await fetch(
          `${API_BASE}/api/customer/loan`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              mobile,
              application_id: applicationId
            })
          }
        );


        const data = await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Active loan account not found"
          );

        }


        displayLoan(data);

        showMessage(
          "lookupMessage",
          "Loan account found successfully.",
          "success"
        );

      }

      catch (error) {

        showMessage(
          "lookupMessage",
          error.message ||
          "Unable to find loan account.",
          "error"
        );

      }

    }
  );

}



// =====================================================
// DISPLAY LOAN
// =====================================================

function displayLoan(data) {

  const loan =
    data.loan || data.loan_account || data;


  currentLoanAccountId =
    loan.id ||
    loan.loan_account_id ||
    data.loan_account_id;


  document.getElementById(
    "loanAccountNo"
  ).textContent =
    loan.loan_account_no || "-";


  document.getElementById(
    "loanPrincipal"
  ).textContent =
    formatMoney(loan.principal);


  document.getElementById(
    "loanRate"
  ).textContent =
    loan.annual_interest_rate || 0;


  document.getElementById(
    "loanTenure"
  ).textContent =
    loan.tenure_months || 0;


  document.getElementById(
    "loanEmi"
  ).textContent =
    formatMoney(loan.emi);


  document.getElementById(
    "loanStatus"
  ).textContent =
    loan.status || "-";


  document.getElementById(
    "loanSummarySection"
  ).style.display = "block";


  displayEmiSchedule(
    data.emi_schedule ||
    data.schedule ||
    []
  );


  document.getElementById(
    "paymentSection"
  ).style.display = "block";


  document.getElementById(
    "paymentHistorySection"
  ).style.display = "block";


  refreshPaymentHistory();

}



// =====================================================
// EMI SCHEDULE
// =====================================================

function displayEmiSchedule(schedule) {

  const section =
    document.getElementById(
      "emiScheduleSection"
    );

  const tbody =
    document.getElementById(
      "emiTableBody"
    );


  if (!schedule || schedule.length === 0) {

    section.style.display = "none";
    tbody.innerHTML = "";

    return;

  }


  tbody.innerHTML = "";


  schedule.forEach(function (emi) {

    const row =
      document.createElement("tr");


    row.innerHTML = `

      <td>${emi.installment_no || "-"}</td>

      <td>${emi.due_date || "-"}</td>

      <td>₹${formatMoney(emi.principal_due)}</td>

      <td>₹${formatMoney(emi.interest_due)}</td>

      <td>₹${formatMoney(emi.total_due)}</td>

      <td>₹${formatMoney(emi.paid_amount)}</td>

      <td>${emi.status || "-"}</td>

    `;


    tbody.appendChild(row);

  });


  section.style.display = "block";

}



// =====================================================
// DEMO EMI PAYMENT
// =====================================================

const paymentForm =
  document.getElementById("paymentForm");

if (paymentForm) {

  paymentForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      if (!currentLoanAccountId) {

        showMessage(
          "paymentMessage",
          "Please lookup your loan account first.",
          "error"
        );

        return;

      }


      const amount =
        Number(
          document.getElementById(
            "paymentAmount"
          ).value
        );


      if (amount <= 0) {

        showMessage(
          "paymentMessage",
          "Please enter a valid payment amount.",
          "error"
        );

        return;

      }


      showMessage(
        "paymentMessage",
        "Processing demo payment..."
      );


      try {

        const response = await fetch(
          `${API_BASE}/api/customer/pay-emi-test`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              loan_account_id:
                currentLoanAccountId,

              amount
            })
          }
        );


        const data = await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Payment failed"
          );

        }


        showMessage(
          "paymentMessage",
          `Payment successful. Reference: ${
            data.transaction_reference ||
            data.payment?.transaction_reference ||
            "TEST"
          }`,
          "success"
        );


        document.getElementById(
          "paymentAmount"
        ).value = "";


        refreshPaymentHistory();

      }

      catch (error) {

        showMessage(
          "paymentMessage",
          error.message ||
          "Payment failed.",
          "error"
        );

      }

    }
  );

}



// =====================================================
// PAYMENT HISTORY
// =====================================================

async function refreshPaymentHistory() {

  if (!currentLoanAccountId) {
    return;
  }


  const tbody =
    document.getElementById(
      "paymentHistoryBody"
    );


  try {

    const response = await fetch(
      `${API_BASE}/api/customer/payment-history`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          loan_account_id:
            currentLoanAccountId
        })
      }
    );


    const data = await response.json();


    if (!response.ok) {
      return;
    }


    const payments =
      data.payments || data || [];


    tbody.innerHTML = "";


    if (payments.length === 0) {

      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            No payments found.
          </td>
        </tr>
      `;

      return;

    }


    payments.forEach(function (payment) {

      const row =
        document.createElement("tr");


      const date =
        payment.payment_date
          ? new Date(
              payment.payment_date
            ).toLocaleString("en-IN")
          : "-";


      row.innerHTML = `

        <td>${date}</td>

        <td>
          ₹${formatMoney(payment.amount)}
        </td>

        <td>
          ${payment.payment_method || "-"}
        </td>

        <td>
          ${payment.transaction_reference || "-"}
        </td>

        <td>
          ${payment.status || "-"}
        </td>

      `;


      tbody.appendChild(row);

    });

  }

  catch (error) {

    console.error(
      "Payment history error:",
      error
    );

  }

}
