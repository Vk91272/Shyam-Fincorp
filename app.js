const API_BASE = "https://shyam-fincorp.onrender.com";

let currentLoanAccountId = null;
let currentApplicationId = null;
let currentCustomerMobile = null;


// =====================================================
// HELPERS
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
// ELIGIBILITY - 3 STEP FLOW
// =====================================================

let currentEligibilityStep = 1;


function showEligibilityStep(step) {

  currentEligibilityStep = step;

  const steps = [
    document.getElementById("eligibilityStep1"),
    document.getElementById("eligibilityStep2"),
    document.getElementById("eligibilityStep3")
  ];

  steps.forEach((element, index) => {

    if (!element) return;

    element.classList.toggle(
      "active",
      index + 1 === step
    );

  });


  const indicators = [
    document.getElementById("stepIndicator1"),
    document.getElementById("stepIndicator2"),
    document.getElementById("stepIndicator3")
  ];


  indicators.forEach((element, index) => {

    if (!element) return;

    element.classList.toggle(
      "active",
      index + 1 <= step
    );

  });


  const progressBar =
    document.getElementById("progressBar");

  if (progressBar) {

    if (step === 1) {
      progressBar.style.width = "0%";
    }

    else if (step === 2) {
      progressBar.style.width = "50%";
    }

    else {
      progressBar.style.width = "100%";
    }

  }

}


// =====================================================
// ELIGIBILITY STEP 1
// =====================================================

const nextStep1 =
  document.getElementById("nextStep1");


if (nextStep1) {

  nextStep1.addEventListener(
    "click",
    function () {

      const name =
        document
          .getElementById("eligibilityName")
          .value.trim();

      const mobile =
        document
          .getElementById("eligibilityMobile")
          .value.trim();


      if (!name) {

        alert("Please enter your full name.");

        return;

      }


      if (!/^[0-9]{10}$/.test(mobile)) {

        alert(
          "Please enter a valid 10 digit mobile number."
        );

        return;

      }


      showEligibilityStep(2);

      const amountField =
        document.getElementById("requestedAmount");

      if (amountField) {
        amountField.focus();
      }

    }
  );

}


// =====================================================
// ELIGIBILITY STEP 2 BACK
// =====================================================

const backStep2 =
  document.getElementById("backStep2");


if (backStep2) {

  backStep2.addEventListener(
    "click",
    function () {

      showEligibilityStep(1);

    }
  );

}


// =====================================================
// ELIGIBILITY SUBMIT
// =====================================================

const eligibilityForm =
  document.getElementById("eligibilityForm");


if (eligibilityForm) {

  eligibilityForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      const button =
        document.getElementById(
          "eligibilityButton"
        );


      if (button) {
        button.disabled = true;
        button.textContent = "Checking...";
      }


      const payload = {

        full_name:
          document
            .getElementById("eligibilityName")
            .value.trim(),

        mobile:
          document
            .getElementById("eligibilityMobile")
            .value.trim(),

        email: "",

        age: 30,

        employment_type: "other",

        monthly_income:
          Number(
            document
              .getElementById("monthlyIncome")
              .value
          ),

        existing_emi: 0,

        requested_amount:
          Number(
            document
              .getElementById("requestedAmount")
              .value
          ),

        tenure_months:
          Number(
            document
              .getElementById("eligibilityTenure")
              .value
          )

      };


      if (
        payload.monthly_income <= 0 ||
        payload.requested_amount <= 0 ||
        !payload.tenure_months
      ) {

        alert(
          "Please enter all loan details."
        );

        if (button) {
          button.disabled = false;
          button.textContent =
            "Check Eligibility";
        }

        return;

      }


      try {

        const response =
          await fetch(
            `${API_BASE}/api/eligibility`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(payload)
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Eligibility check failed."
          );

        }


        const inquiryId =
          document.getElementById("inquiryId");

        if (inquiryId) {
          inquiryId.textContent =
            data.inquiry_id || "-";
        }


        const estimatedRate =
          document.getElementById("estimatedRate");

        if (estimatedRate) {
          estimatedRate.textContent =
            data.estimated_interest_rate || "-";
        }


        const estimatedEmi =
          document.getElementById("estimatedEmi");

        if (estimatedEmi) {
          estimatedEmi.textContent =
            formatMoney(
              data.estimated_emi
            );
        }


        const title =
          document.getElementById(
            "eligibilityTitle"
          );


        const message =
          document.getElementById(
            "eligibilityMessage"
          );


        const resultIcon =
          document.querySelector(
            ".result-icon"
          );


        if (
          data.eligibility_status ===
          "likely_eligible"
        ) {

          if (title) {
            title.textContent =
              "Preliminary Result: Likely Eligible";
          }

          if (message) {
            message.textContent =
              data.eligibility_reason ||
              "Your preliminary eligibility looks positive.";
          }

          if (resultIcon) {
            resultIcon.textContent = "✓";
          }

        }

        else if (
          data.eligibility_status ===
          "needs_review"
        ) {

          if (title) {
            title.textContent =
              "Preliminary Result: Review Required";
          }

          if (message) {
            message.textContent =
              data.eligibility_reason ||
              "Your details require further review.";
          }

          if (resultIcon) {
            resultIcon.textContent = "!";
          }

        }

        else {

          if (title) {
            title.textContent =
              "Preliminary Result";
          }

          if (message) {
            message.textContent =
              data.eligibility_reason ||
              "The preliminary criteria were not met.";
          }

          if (resultIcon) {
            resultIcon.textContent = "i";
          }

        }


        showEligibilityStep(3);


        const eligibilitySection =
          document.getElementById(
            "eligibility"
          );

        if (eligibilitySection) {

          eligibilitySection.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }

      }

      catch (error) {

        alert(
          error.message ||
          "Unable to check eligibility."
        );

      }

      finally {

        if (button) {

          button.disabled = false;

          button.textContent =
            "Check Eligibility";

        }

      }

    }
  );

}


// =====================================================
// LOAN APPLICATION
// =====================================================

const loanApplicationForm =
  document.getElementById(
    "loanApplicationForm"
  );


if (loanApplicationForm) {

  loanApplicationForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      const result =
        document.getElementById(
          "applicationResult"
        );


      if (result) {

        result.style.display = "block";

        result.className =
          "result-box";

        result.textContent =
          "Submitting application...";

      }


      const payload = {

        full_name:
          document
            .getElementById("fullName")
            .value.trim(),

        mobile:
          document
            .getElementById("mobile")
            .value.trim(),

        email:
          document
            .getElementById("email")
            .value.trim(),

        monthly_income:
          Number(
            document
              .getElementById(
                "monthlyIncomeApplication"
              )
              .value
          ),

        requested_amount:
          Number(
            document
              .getElementById(
                "requestedAmountApplication"
              )
              .value
          ),

        tenure_months:
          Number(
            document
              .getElementById(
                "tenureApplication"
              )
              .value
          ),

        address:
          document
            .getElementById("address")
            .value.trim()

      };


      try {

        const response =
          await fetch(
            `${API_BASE}/api/applications`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(payload)
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Application submission failed."
          );

        }


        if (result) {

          result.className =
            "result-box success";


          result.innerHTML = `
            <strong>Application submitted successfully!</strong>
            <br><br>
            Your Application ID:
            <strong>${data.application_id}</strong>
            <br><br>
            Please save this ID for future reference.
          `;

        }


        loanApplicationForm.reset();

      }

      catch (error) {

        if (result) {

          result.className =
            "result-box error";

          result.textContent =
            error.message ||
            "Unable to submit application.";

        }

      }

    }
  );

}


// =====================================================
// CUSTOMER LOAN LOOKUP
// =====================================================

const lookupForm =
  document.getElementById(
    "lookupForm"
  );


if (lookupForm) {

  lookupForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      showMessage(
        "lookupMessage",
        "Searching your loan..."
      );


      const mobile =
        document
          .getElementById(
            "lookupMobile"
          )
          .value.trim();


      const applicationId =
        document
          .getElementById(
            "lookupApplicationId"
          )
          .value.trim();


      if (!/^[0-9]{10}$/.test(mobile)) {

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


      currentApplicationId =
        applicationId;

      currentCustomerMobile =
        mobile;


      try {

        const response =
          await fetch(
            `${API_BASE}/api/customer/loan`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  mobile,
                  application_id:
                    applicationId
                })
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          const message =
            data.error ||
            "Unable to find loan.";


          if (
            response.status === 404 &&
            /Active loan account not found/i.test(
              message
            )
          ) {

            throw new Error(
              "Application found, but an active loan account has not been created yet. Please contact the loan team/admin to activate the loan account."
            );

          }


          throw new Error(message);

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
    data.loan ||
    data.loan_account ||
    data;


  const schedule =
    data.emi_schedule ||
    data.schedule ||
    [];


  // ---------------------------------------------------
  // SAVE CURRENT LOAN DETAILS
  // ---------------------------------------------------

  currentApplicationId =
    currentApplicationId ||
    data.application_id ||
    "";


  currentCustomerMobile =
    currentCustomerMobile ||
    data.mobile ||
    "";


  currentLoanAccountId =
    loan.id ||
    loan.loan_account_id ||
    data.loan_account_id ||
    null;


  // ---------------------------------------------------
  // LOAN ACCOUNT NUMBER
  // ---------------------------------------------------

  const accountNo =
    document.getElementById(
      "loanAccountNo"
    );

  if (accountNo) {

    accountNo.textContent =
      loan.loan_account_no || "-";

  }


  // ---------------------------------------------------
  // PRINCIPAL
  // ---------------------------------------------------

  const principal =
    document.getElementById(
      "loanPrincipal"
    );

  if (principal) {

    principal.textContent =
      formatMoney(
        loan.principal
      );

  }


  // ---------------------------------------------------
  // INTEREST RATE
  // ---------------------------------------------------

  const rate =
    document.getElementById(
      "loanRate"
    );

  if (rate) {

    rate.textContent =
      loan.annual_interest_rate || 0;

  }


  // ---------------------------------------------------
  // TENURE
  // ---------------------------------------------------

  const tenure =
    document.getElementById(
      "loanTenure"
    );

  if (tenure) {

    tenure.textContent =
      loan.tenure_months || 0;

  }


  // ---------------------------------------------------
  // EMI
  // ---------------------------------------------------

  const emi =
    document.getElementById(
      "loanEmi"
    );

  if (emi) {

    emi.textContent =
      formatMoney(
        loan.emi
      );

  }


  // ---------------------------------------------------
  // STATUS
  // ---------------------------------------------------

  const status =
    document.getElementById(
      "loanStatus"
    );

  if (status) {

    status.textContent =
      loan.status || "-";

  }


  // ---------------------------------------------------
  // SHOW LOAN SUMMARY
  // ---------------------------------------------------

  const summary =
    document.getElementById(
      "loanSummarySection"
    );

  if (summary) {

    summary.style.display =
      "block";

  }


  // ---------------------------------------------------
  // EMI SCHEDULE
  // ---------------------------------------------------

  displayEmiSchedule(
    schedule
  );


  // ---------------------------------------------------
  // IMPORTANT:
  // FILL PAY EMI DROPDOWN
  // ---------------------------------------------------

  populatePaymentInstallments(
    schedule
  );


  // ---------------------------------------------------
  // PAYMENT SUMMARY
  // ---------------------------------------------------

  updatePaymentSummary(
    schedule
  );


  // ---------------------------------------------------
  // SHOW PAYMENT SECTION
  // ---------------------------------------------------

  const paymentSection =
    document.getElementById(
      "paymentSection"
    );

  if (paymentSection) {

    paymentSection.style.display =
      "block";

  }


  // ---------------------------------------------------
  // SHOW PAYMENT HISTORY
  // ---------------------------------------------------

  const historySection =
    document.getElementById(
      "paymentHistorySection"
    );

  if (historySection) {

    historySection.style.display =
      "block";

  }


  // ---------------------------------------------------
  // PAYMENT HISTORY
  // ---------------------------------------------------

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


  if (!section || !tbody) {
    return;
  }


  if (
    !schedule ||
    schedule.length === 0
  ) {

    section.style.display =
      "none";

    tbody.innerHTML =
      "";

    return;

  }


  tbody.innerHTML =
    "";


  schedule.forEach(function (emi) {

    const row =
      document.createElement("tr");


    row.innerHTML = `

      <td>
        ${emi.installment_no || "-"}
      </td>

      <td>
        ${emi.due_date || "-"}
      </td>

      <td>
        ₹${formatMoney(
          emi.principal_due
        )}
      </td>

      <td>
        ₹${formatMoney(
          emi.interest_due
        )}
      </td>

      <td>
        ₹${formatMoney(
          emi.total_due
        )}
      </td>

      <td>
        ₹${formatMoney(
          emi.paid_amount
        )}
      </td>

      <td>
        ${emi.status || "-"}
      </td>

    `;


    tbody.appendChild(row);

  });


  section.style.display =
    "block";

}


// =====================================================
// PAYMENT SUMMARY
// =====================================================

function updatePaymentSummary(schedule) {

  const items =
    Array.isArray(schedule)
      ? schedule
      : [];


  const payable =
    items.reduce(
      (sum, emi) =>
        sum +
        Number(
          emi.total_due || 0
        ),
      0
    );


  const paid =
    items.reduce(
      (sum, emi) =>
        sum +
        Number(
          emi.paid_amount || 0
        ),
      0
    );


  const pending =
    Math.max(
      0,
      payable - paid
    );


  const paidCount =
    items.filter(
      emi =>
        String(
          emi.status || ""
        ).toLowerCase() === "paid"
    ).length;


  const pendingCount =
    Math.max(
      0,
      items.length - paidCount
    );


  const progress =
    payable > 0
      ? Math.min(
          100,
          Math.round(
            (paid / payable) * 100
          )
        )
      : 0;


  const values = {

    totalPayableAmount:
      payable,

    totalPaidAmount:
      paid,

    totalPendingAmount:
      pending,

    paidEmiCount:
      paidCount,

    pendingEmiCount:
      pendingCount,

    paymentProgress:
      progress

  };


  Object.entries(
    values
  ).forEach(
    ([id, value]) => {

      const el =
        document.getElementById(id);


      if (!el) {
        return;
      }


      if (
        id === "paymentProgress" ||
        id.includes("Count")
      ) {

        el.textContent =
          value;

      }

      else {

        el.textContent =
          formatMoney(
            value
          );

      }

    }
  );


  const section =
    document.getElementById(
      "paymentSummarySection"
    );


  if (section) {

    section.style.display =
      "block";

  }

}


// =====================================================
// PAY EMI - POPULATE DROPDOWN
// =====================================================

function populatePaymentInstallments(
  schedule
) {

  const select =
    document.getElementById(
      "paymentInstallment"
    );


  const amountInput =
    document.getElementById(
      "paymentAmount"
    );


  if (!select) {

    console.warn(
      "paymentInstallment dropdown not found."
    );

    return;

  }


  // Clear old options

  select.innerHTML =
    '<option value="">Select EMI</option>';


  const unpaid =
    (
      Array.isArray(schedule)
        ? schedule
        : []
    ).filter(
      emi =>
        String(
          emi.status || ""
        ).toLowerCase() !== "paid"
    );


  unpaid.forEach(
    function (emi) {

      const option =
        document.createElement(
          "option"
        );


      const installmentNo =
        Number(
          emi.installment_no
        );


      const totalDue =
        Number(
          emi.total_due || 0
        );


      const paidAmount =
        Number(
          emi.paid_amount || 0
        );


      const pendingAmount =
        Math.max(
          0,
          totalDue - paidAmount
        );


      option.value =
        installmentNo;


      option.dataset.amount =
        pendingAmount;


      option.textContent =
        `EMI ${installmentNo} • ₹${formatMoney(
          pendingAmount
        )}`;


      select.appendChild(
        option
      );

    }
  );


  // Do not automatically select an EMI

  if (amountInput) {

    amountInput.value =
      "";

  }


  // When customer selects EMI

  select.onchange =
    function () {

      const selected =
        select.options[
          select.selectedIndex
        ];


      if (
        amountInput
      ) {

        amountInput.value =
          selected &&
          selected.dataset
            ? selected.dataset.amount || ""
            : "";

      }

    };

}


// =====================================================
// EMI PAYMENT FORM
// =====================================================

const paymentForm =
  document.getElementById(
    "paymentForm"
  );


if (paymentForm) {

  paymentForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      if (
        !currentApplicationId ||
        !currentCustomerMobile
      ) {

        showMessage(
          "paymentMessage",
          "Please view your loan first.",
          "error"
        );

        return;

      }


      const installmentElement =
        document.getElementById(
          "paymentInstallment"
        );


      const paymentMethodElement =
        document.getElementById(
          "paymentMethod"
        );


      const installmentNo =
        Number(
          installmentElement?.value ||
          0
        );


      const paymentMethod =
        paymentMethodElement?.value ||
        "upi";


      if (!installmentNo) {

        showMessage(
          "paymentMessage",
          "Please select an EMI installment.",
          "error"
        );

        return;

      }


      showMessage(
        "paymentMessage",
        "Processing EMI payment..."
      );


      try {

        const response =
          await fetch(
            `${API_BASE}/api/customer/pay-emi-test`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({

                  application_id:
                    currentApplicationId,

                  mobile:
                    currentCustomerMobile,

                  installment_no:
                    installmentNo,

                  payment_method:
                    paymentMethod

                })

            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Payment failed."
          );

        }


        showMessage(
          "paymentMessage",
          `Payment recorded successfully. Reference: ${
            data.transaction_reference ||
            "TEST"
          }`,
          "success"
        );


        await refreshCustomerLoan();

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
// REFRESH CUSTOMER LOAN
// =====================================================

async function refreshCustomerLoan() {

  if (
    !currentApplicationId ||
    !currentCustomerMobile
  ) {

    return;

  }


  const response =
    await fetch(
      `${API_BASE}/api/customer/loan`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({

            application_id:
              currentApplicationId,

            mobile:
              currentCustomerMobile

          })

      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Unable to refresh loan."
    );

  }


  displayLoan(
    data
  );

}


// =====================================================
// PAYMENT HISTORY
// =====================================================

async function refreshPaymentHistory() {

  if (
    !currentApplicationId ||
    !currentCustomerMobile
  ) {

    return;

  }


  const tbody =
    document.getElementById(
      "paymentHistoryBody"
    );


  if (!tbody) {
    return;
  }


  try {

    const response =
      await fetch(
        `${API_BASE}/api/customer/payment-history`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              application_id:
                currentApplicationId,

              mobile:
                currentCustomerMobile

            })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      return;

    }


    const payments =
      data.payments ||
      data ||
      [];


    tbody.innerHTML =
      "";


    if (
      !Array.isArray(payments) ||
      payments.length === 0
    ) {

      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            No payments found.
          </td>
        </tr>
      `;

      return;

    }


    payments.forEach(
      function (payment) {

        const row =
          document.createElement(
            "tr"
          );


        const date =
          payment.payment_date
            ? new Date(
                payment.payment_date
              ).toLocaleString(
                "en-IN"
              )
            : "-";


        row.innerHTML = `

          <td>
            ${date}
          </td>

          <td>
            ₹${formatMoney(
              payment.amount
            )}
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


        tbody.appendChild(
          row
        );

      }
    );

  }

  catch (error) {

    console.error(
      "Payment history error:",
      error
    );

  }

}


// =====================================================
// INITIAL STATE
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    showEligibilityStep(1);

  }
);
