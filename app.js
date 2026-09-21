const API_BASE = "https://shyam-fincorp.onrender.com";

let currentLoanAccountId = "";
let currentApplicationId = "";
let currentCustomerMobile = "";


/* =========================================================
   COMMON HELPERS
   ========================================================= */

function formatMoney(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function showMessage(message, type = "success") {
  const box = document.getElementById("messageBox");

  if (!box) {
    alert(message);
    return;
  }

  box.textContent = message;
  box.className = "message-box " + type;
  box.style.display = "block";
}


/* =========================================================
   SCREEN FLOW
   ========================================================= */

const CUSTOMER_SCREENS = [
  "eligibility",
  "loanApplication",
  "documentUploadSection",
  "customerPortal",
  "contact"
];

function hideAllScreens() {

  CUSTOMER_SCREENS.forEach(function (id) {

    const section = document.getElementById(id);

    if (section) {
      section.classList.remove("flow-visible");
      section.classList.add("flow-hidden");
    }
  });

  const dashboard = document.getElementById("loanDashboard");

  if (dashboard) {
    dashboard.classList.remove("flow-visible");
    dashboard.classList.add("flow-hidden");
  }
}


function openScreen(screenId) {

  hideAllScreens();

  const target = document.getElementById(screenId);

  if (!target) return;

  target.classList.remove("flow-hidden");
  target.classList.add("flow-visible");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function openLoanDashboard() {

  hideAllScreens();

  const dashboard = document.getElementById("loanDashboard");

  if (!dashboard) return;

  dashboard.classList.remove("flow-hidden");
  dashboard.classList.add("flow-visible");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   ELIGIBILITY STEPS
   ========================================================= */

function showEligibilityStep(step) {

  const step1 = document.getElementById("eligibilityStep1");
  const step2 = document.getElementById("eligibilityStep2");
  const step3 = document.getElementById("eligibilityStep3");

  const indicator1 =
    document.getElementById("eligibilityIndicator1");

  const indicator2 =
    document.getElementById("eligibilityIndicator2");

  const indicator3 =
    document.getElementById("eligibilityIndicator3");

  const progress =
    document.getElementById("eligibilityProgress");

  [step1, step2, step3].forEach(function (el) {
    if (el) el.style.display = "none";
  });

  [indicator1, indicator2, indicator3].forEach(function (el) {
    if (el) el.classList.remove("active");
  });

  if (step === 1) {

    if (step1) step1.style.display = "block";

    if (indicator1) {
      indicator1.classList.add("active");
    }

    if (progress) {
      progress.style.width = "33%";
    }
  }

  if (step === 2) {

    if (step2) step2.style.display = "block";

    if (indicator1) {
      indicator1.classList.add("active");
    }

    if (indicator2) {
      indicator2.classList.add("active");
    }

    if (progress) {
      progress.style.width = "66%";
    }
  }

  if (step === 3) {

    if (step3) step3.style.display = "block";

    if (indicator1) {
      indicator1.classList.add("active");
    }

    if (indicator2) {
      indicator2.classList.add("active");
    }

    if (indicator3) {
      indicator3.classList.add("active");
    }

    if (progress) {
      progress.style.width = "100%";
    }
  }
}


function nextStep1() {

  const name =
    document.getElementById("eligibilityName");

  const mobile =
    document.getElementById("eligibilityMobile");

  if (!name || !mobile) return;

  if (!name.value.trim()) {
    alert("Please enter your full name.");
    name.focus();
    return;
  }

  if (!/^[0-9]{10}$/.test(mobile.value.trim())) {
    alert("Please enter a valid 10 digit mobile number.");
    mobile.focus();
    return;
  }

  showEligibilityStep(2);
}


function backStep2() {
  showEligibilityStep(1);
}


/* =========================================================
   ELIGIBILITY FORM
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  showEligibilityStep(1);

  const eligibilityForm =
    document.getElementById("eligibilityForm");

  if (eligibilityForm) {

    eligibilityForm.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();

        const name =
          document.getElementById(
            "eligibilityName"
          )?.value.trim();

        const mobile =
          document.getElementById(
            "eligibilityMobile"
          )?.value.trim();

        const income =
          document.getElementById(
            "eligibilityIncome"
          )?.value;

        const existingEmi =
          document.getElementById(
            "eligibilityExistingEmi"
          )?.value || 0;

        const amount =
          document.getElementById(
            "eligibilityAmount"
          )?.value;

        const tenure =
          document.getElementById(
            "eligibilityTenure"
          )?.value;


        if (!name) {
          alert("Please enter your full name.");
          return;
        }

        if (!/^[0-9]{10}$/.test(mobile)) {
          alert("Please enter a valid 10 digit mobile number.");
          return;
        }

        if (!income || Number(income) <= 0) {
          alert("Please enter monthly income.");
          return;
        }

        if (!amount || Number(amount) <= 0) {
          alert("Please enter requested loan amount.");
          return;
        }

        if (!tenure) {
          alert("Please select loan tenure.");
          return;
        }


        const button =
          document.getElementById(
            "eligibilityButton"
          );

        if (button) {
          button.disabled = true;
          button.textContent = "Checking...";
        }


        try {

          const response = await fetch(
            `${API_BASE}/api/eligibility`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                full_name: name,
                mobile: mobile,
                email: "",
                age: 30,
                employment_type: "other",
                monthly_income: Number(income),
                existing_emi: Number(existingEmi),
                requested_amount: Number(amount),
                tenure_months: Number(tenure)
              })
            }
          );


          const data =
            await response.json();


          if (!response.ok) {
            throw new Error(
              data.message ||
              data.error ||
              "Eligibility check failed."
            );
          }


          const inquiryId =
            document.getElementById("inquiryId");

          const estimatedRate =
            document.getElementById("estimatedRate");

          const estimatedEmi =
            document.getElementById("estimatedEmi");

          const resultTitle =
            document.getElementById(
              "eligibilityResultTitle"
            );

          const resultMessage =
            document.getElementById(
              "eligibilityResultMessage"
            );

          const resultIcon =
            document.getElementById(
              "eligibilityResultIcon"
            );


          if (inquiryId) {
            inquiryId.textContent =
              data.inquiry_id ||
              data.inquiryId ||
              "-";
          }

          if (estimatedRate) {
            estimatedRate.textContent =
              (
                data.estimated_interest_rate ??
                data.estimatedRate ??
                12
              ) + "%";
          }

          if (estimatedEmi) {
            estimatedEmi.textContent =
              formatMoney(
                data.estimated_emi ??
                data.estimatedEmi ??
                0
              );
          }


          const status =
            data.eligibility_status ||
            data.status ||
            "";


          if (status === "likely_eligible") {

            if (resultIcon) {
              resultIcon.textContent = "✓";
            }

            if (resultTitle) {
              resultTitle.textContent =
                "Preliminary Eligibility Result";
            }

            if (resultMessage) {
              resultMessage.textContent =
                data.eligibility_reason ||
                "Based on the information provided, you may be eligible for further loan application review.";
            }

          } else if (status === "needs_review") {

            if (resultIcon) {
              resultIcon.textContent = "ℹ";
            }

            if (resultTitle) {
              resultTitle.textContent =
                "Additional Review Required";
            }

            if (resultMessage) {
              resultMessage.textContent =
                data.eligibility_reason ||
                "Your information requires additional review before proceeding.";
            }

          } else {

            if (resultIcon) {
              resultIcon.textContent = "✕";
            }

            if (resultTitle) {
              resultTitle.textContent =
                "Preliminary Result";
            }

            if (resultMessage) {
              resultMessage.textContent =
                data.eligibility_reason ||
                "Based on the information provided, the preliminary criteria were not met.";
            }
          }


          showEligibilityStep(3);


          const resultBox =
            document.getElementById(
              "eligibilityResult"
            );

          if (resultBox) {

            const oldButton =
              document.getElementById(
                "continueApplicationButton"
              );

            if (oldButton) {
              oldButton.remove();
            }


            const continueButton =
              document.createElement("button");

            continueButton.id =
              "continueApplicationButton";

            continueButton.type = "button";

            continueButton.className =
              "btn btn-primary next-screen-btn";

            continueButton.textContent =
              "Continue to Loan Application →";

            continueButton.onclick = function () {

              const applicationMobile =
                document.getElementById(
                  "applicationMobile"
                );

              const applicationName =
                document.getElementById(
                  "applicationName"
                );

              if (applicationMobile) {
                applicationMobile.value = mobile;
              }

              if (applicationName) {
                applicationName.value = name;
              }

              openScreen("loanApplication");
            };


            resultBox.appendChild(
              continueButton
            );
          }

        } catch (error) {

          console.error(error);

          alert(
            error.message ||
            "Unable to check eligibility."
          );

        } finally {

          if (button) {
            button.disabled = false;
            button.textContent =
              "Check Eligibility";
          }
        }
      }
    );
  }


  /* =======================================================
     LOAN APPLICATION
     ======================================================= */

  const loanApplicationForm =
    document.getElementById(
      "loanApplicationForm"
    );


  if (loanApplicationForm) {

    loanApplicationForm.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();


        const submitButton =
          loanApplicationForm.querySelector(
            'button[type="submit"]'
          );


        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent =
            "Submitting...";
        }


        try {

          const formData =
            new FormData(
              loanApplicationForm
            );


          const payload = {

            full_name:
              formData.get("full_name") ||
              formData.get("fullName"),

            mobile:
              formData.get("mobile"),

            email:
              formData.get("email"),

            monthly_income:
              Number(
                formData.get(
                  "monthly_income"
                ) ||
                formData.get(
                  "monthlyIncome"
                ) ||
                0
              ),

            requested_amount:
              Number(
                formData.get(
                  "requested_amount"
                ) ||
                formData.get(
                  "requestedAmount"
                ) ||
                0
              ),

            tenure_months:
              Number(
                formData.get(
                  "tenure_months"
                ) ||
                formData.get(
                  "tenureMonths"
                ) ||
                0
              ),

            address:
              formData.get("address")
          };


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
              data.message ||
              data.error ||
              "Loan application failed."
            );
          }


          currentApplicationId =
            data.application_id || "";


          const applicationIdBox =
            document.getElementById(
              "applicationSuccessId"
            );

          if (applicationIdBox) {
            applicationIdBox.textContent =
              currentApplicationId;
          }


          const documentApplicationId =
            document.getElementById(
              "documentApplicationId"
            );

          if (documentApplicationId) {
            documentApplicationId.value =
              currentApplicationId;
          }


          alert(
            "Loan application submitted successfully.\n\nApplication ID: " +
            currentApplicationId
          );


          loanApplicationForm.reset();


          setTimeout(function () {

            openScreen(
              "documentUploadSection"
            );

          }, 300);


        } catch (error) {

          console.error(error);

          alert(
            error.message ||
            "Unable to submit loan application."
          );

        } finally {

          if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
              "Submit Loan Application";
          }
        }
      }
    );
  }


  /* =========================================================
     CUSTOMER LOAN LOOKUP
     ========================================================= */

  const lookupForm =
    document.getElementById("lookupForm");


  if (lookupForm) {

    lookupForm.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();


        const mobile =
          document.getElementById(
            "customerMobile"
          )?.value.trim();


        const applicationId =
          document.getElementById(
            "customerApplicationId"
          )?.value.trim();


        if (!/^[0-9]{10}$/.test(mobile)) {

          alert(
            "Please enter a valid 10 digit mobile number."
          );

          return;
        }


        if (!applicationId) {

          alert(
            "Please enter your application ID."
          );

          return;
        }


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
                    mobile:
                      mobile,

                    application_id:
                      applicationId
                  })
              }
            );


          const data =
            await response.json();


          if (!response.ok) {

            throw new Error(
              data.message ||
              data.error ||
              "Loan details not found."
            );
          }


          currentCustomerMobile =
            mobile;

          currentApplicationId =
            applicationId;


          displayLoan(data);

          openLoanDashboard();


          alert(
            "Loan details loaded successfully."
          );


        } catch (error) {

          console.error(error);

          alert(
            error.message ||
            "Unable to load loan details."
          );
        }
      }
    );
  }

});


/* =========================================================
   DISPLAY LOAN
   ========================================================= */

function displayLoan(data) {

  const loan =
    data.loan ||
    data.application ||
    {};

  const schedule =
    data.schedule ||
    data.emi_schedule ||
    [];


  currentLoanAccountId =
    loan.loan_account_no ||
    loan.loan_account_id ||
    loan.account_no ||
    "";


  if (loan.application_id) {
    currentApplicationId =
      loan.application_id;
  }


  /* Loan summary */

  const account =
    document.getElementById(
      "displayLoanAccount"
    );

  const application =
    document.getElementById(
      "displayApplicationId"
    );

  const customerName =
    document.getElementById(
      "displayCustomerName"
    );

  const principal =
    document.getElementById(
      "displayLoanAmount"
    );

  const interest =
    document.getElementById(
      "displayInterestRate"
    );

  const tenure =
    document.getElementById(
      "displayTenure"
    );

  const emi =
    document.getElementById(
      "displayEmi"
    );

  const outstanding =
    document.getElementById(
      "displayOutstanding"
    );

  const status =
    document.getElementById(
      "displayLoanStatus"
    );


  if (account) {
    account.textContent =
      currentLoanAccountId ||
      "-";
  }


  if (application) {
    application.textContent =
      currentApplicationId ||
      "-";
  }


  if (customerName) {
    customerName.textContent =
      loan.full_name ||
      "-";
  }


  if (principal) {
    principal.textContent =
      formatMoney(
        loan.loan_amount ||
        loan.requested_amount ||
        loan.principal ||
        0
      );
  }


  if (interest) {
    interest.textContent =
      (loan.interest_rate || 0) +
      "%";
  }


  if (tenure) {
    tenure.textContent =
      (loan.tenure_months || 0) +
      " Months";
  }


  if (emi) {
    emi.textContent =
      formatMoney(
        loan.emi ||
        loan.monthly_emi ||
        loan.emi_amount ||
        loan.monthlyEmi ||
        0
      );
  }


  if (outstanding) {
    outstanding.textContent =
      formatMoney(
        loan.outstanding_amount ||
        loan.outstanding ||
        0
      );
  }


  if (status) {
    status.textContent =
      loan.status ||
      "-";
  }


  displayEmiSchedule(schedule);

  populatePaymentInstallments(
    schedule
  );

  updatePaymentSummary(
    loan
  );

  refreshPaymentHistory();
}


/* =========================================================
   EMI SCHEDULE
   ========================================================= */

function displayEmiSchedule(schedule) {

  const container =
    document.getElementById(
      "emiScheduleContainer"
    );


  if (!container) return;


  if (
    !Array.isArray(schedule) ||
    schedule.length === 0
  ) {

    container.innerHTML =
      "<p>No EMI schedule available.</p>";

    return;
  }


  container.innerHTML =
    schedule.map(
      function (item, index) {

        const installment =
          item.installment_no ||
          item.installment ||
          item.installmentNumber ||
          index + 1;


        const dueDate =
          item.due_date ||
          item.dueDate ||
          "-";


        const amount =
          Number(
            item.emi ||
            item.monthly_emi ||
            item.amount ||
            item.emi_amount ||
            item.installment_amount ||
            item.payment_amount ||
            0
          );


        const itemStatus =
          item.status ||
          "pending";


        return `
          <div class="emi-row">

            <div>
              <strong>
                EMI ${installment}
              </strong>
            </div>

            <div>
              ${dueDate}
            </div>

            <div>
              ${formatMoney(amount)}
            </div>

            <div>
              ${itemStatus}
            </div>

          </div>
        `;
      }
    ).join("");
}


/* =========================================================
   PAYMENT INSTALLMENTS
   ========================================================= */

function populatePaymentInstallments(
  schedule
) {

  const select =
    document.getElementById(
      "paymentInstallment"
    );


  if (!select) return;


  select.innerHTML =
    '<option value="">Select EMI</option>';


  if (!Array.isArray(schedule)) {
    return;
  }


  schedule.forEach(
    function (item, index) {

      const installment =
        item.installment_no ||
        item.installment ||
        item.installmentNumber ||
        index + 1;


      const amount =
        Number(
          item.emi ||
          item.monthly_emi ||
          item.amount ||
          item.emi_amount ||
          item.installment_amount ||
          item.payment_amount ||
          0
        );


      const status =
        String(
          item.status ||
          "pending"
        ).toLowerCase();


      /* Already paid EMI ko hide karo */

      if (
        status === "paid" ||
        status === "completed"
      ) {
        return;
      }


      const option =
        document.createElement(
          "option"
        );


      option.value =
        installment;


      option.dataset.amount =
        amount;


      option.textContent =
        `EMI ${installment} - ${formatMoney(amount)}`;


      select.appendChild(
        option
      );
    }
  );


  /*
     Important:
     Purane event listener ki jagah
     onchange use kar rahe hain,
     taki refresh ke baad multiple
     listeners na bane.
  */

  select.onchange =
    updatePaymentSummary;


  /*
     Automatically first unpaid EMI select karo
  */

  if (
    select.options.length > 1
  ) {

    select.selectedIndex = 1;

    updatePaymentSummary();
  }
}


/* =========================================================
   PAYMENT SUMMARY
   ========================================================= */

function updatePaymentSummary(
  loan
) {

  const installment =
    document.getElementById(
      "paymentInstallment"
    );


  const amountField =
    document.getElementById(
      "paymentAmount"
    );


  if (!amountField) {
    return;
  }


  /*
     FIRST PRIORITY:
     Selected EMI schedule ka amount
  */

  if (
    installment &&
    installment.selectedOptions &&
    installment.selectedOptions[0] &&
    installment.selectedOptions[0].dataset.amount
  ) {

    const selectedAmount =
      Number(
        installment.selectedOptions[0]
          .dataset.amount
      );


    if (
      selectedAmount > 0
    ) {

      amountField.value =
        selectedAmount;

      return;
    }
  }


  /*
     SECOND PRIORITY:
     Loan EMI amount
  */

  if (loan) {

    const loanEmi =
      Number(
        loan.emi ||
        loan.monthly_emi ||
        loan.emi_amount ||
        loan.monthlyEmi ||
        0
      );


    if (
      loanEmi > 0
    ) {

      amountField.value =
        loanEmi;

      return;
    }
  }


  /*
     Agar kahin se EMI amount
     available nahi hai
  */

  amountField.value = 0;
}


/* =========================================================
   PAY EMI
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const paymentForm =
      document.getElementById(
        "paymentForm"
      );


    if (!paymentForm) return;


    paymentForm.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();


        const installment =
          document.getElementById(
            "paymentInstallment"
          )?.value;


        const amount =
          document.getElementById(
            "paymentAmount"
          )?.value;


        const paymentMode =
          document.getElementById(
            "paymentMode"
          )?.value ||
          "test";


        if (
          !currentApplicationId &&
          !currentLoanAccountId
        ) {

          alert(
            "Please check your loan first."
          );

          return;
        }


        if (!installment) {

          alert(
            "Please select an EMI."
          );

          return;
        }


        if (
          !amount ||
          Number(amount) <= 0
        ) {

          alert(
            "Please enter a valid payment amount."
          );

          return;
        }


        const button =
          paymentForm.querySelector(
            'button[type="submit"]'
          );


        if (button) {

          button.disabled = true;

          button.textContent =
            "Processing...";
        }


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

                    loan_account_id:
                      currentLoanAccountId,

                    mobile:
                      currentCustomerMobile,

                    installment_no:
                      Number(installment),

                    amount:
                      Number(amount),

                    payment_method:
                      paymentMode

                  })
              }
            );


          const data =
            await response.json();


          if (!response.ok) {

            throw new Error(
              data.message ||
              data.error ||
              "Payment failed."
            );
          }


          alert(
            "EMI payment submitted successfully."
          );


          paymentForm.reset();


          await refreshCustomerLoan();

          await refreshPaymentHistory();


        } catch (error) {

          console.error(error);

          alert(
            error.message ||
            "Unable to process payment."
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
);


/* =========================================================
   REFRESH CUSTOMER LOAN
   ========================================================= */

async function refreshCustomerLoan() {

  if (
    !currentCustomerMobile ||
    !currentApplicationId
  ) {
    return;
  }


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

              mobile:
                currentCustomerMobile,

              application_id:
                currentApplicationId

            })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {
      return;
    }


    displayLoan(data);


  } catch (error) {

    console.error(
      "Loan refresh error:",
      error
    );
  }
}


/* =========================================================
   PAYMENT HISTORY
   ========================================================= */

async function refreshPaymentHistory() {

  if (
    !currentApplicationId &&
    !currentLoanAccountId
  ) {
    return;
  }


  const container =
    document.getElementById(
      "paymentHistoryContainer"
    );


  if (!container) {
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

              loan_account_id:
                currentLoanAccountId,

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


    const history =
      data.history ||
      data.payments ||
      data.data ||
      [];


    if (
      !Array.isArray(history) ||
      history.length === 0
    ) {

      container.innerHTML =
        "<p>No payment history found.</p>";

      return;
    }


    container.innerHTML =
      history.map(
        function (item) {

          return `
            <div class="payment-history-row">

              <div>
                <strong>
                  EMI ${
                    item.installment_no ||
                    "-"
                  }
                </strong>
              </div>

              <div>
                ${formatMoney(
                  item.amount || 0
                )}
              </div>

              <div>
                ${
                  item.payment_date ||
                  item.created_at ||
                  "-"
                }
              </div>

              <div>
                ${
                  item.status ||
                  "paid"
                }
              </div>

            </div>
          `;
        }
      ).join("");


  } catch (error) {

    console.error(
      "Payment history error:",
      error
    );
  }
}


/* =========================================================
   DOCUMENT UPLOAD
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const documentForm =
      document.getElementById(
        "documentUploadForm"
      );


    if (!documentForm) {
      return;
    }


    documentForm.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();


        const applicationId =
          document.getElementById(
            "documentApplicationId"
          )?.value.trim();


        const documentType =
          document.getElementById(
            "documentType"
          )?.value;


        const fileInput =
          document.getElementById(
            "documentFile"
          );


        if (!applicationId) {

          alert(
            "Application ID is required."
          );

          return;
        }


        if (!documentType) {

          alert(
            "Please select document type."
          );

          return;
        }


        if (
          !fileInput ||
          !fileInput.files ||
          !fileInput.files[0]
        ) {

          alert(
            "Please select a document."
          );

          return;
        }


        const file =
          fileInput.files[0];


        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "application/pdf"
        ];


        if (
          !allowedTypes.includes(
            file.type
          )
        ) {

          alert(
            "Only JPG, PNG or PDF files are allowed."
          );

          return;
        }


        if (
          file.size >
          5 * 1024 * 1024
        ) {

          alert(
            "Maximum file size is 5 MB."
          );

          return;
        }


        const button =
          documentForm.querySelector(
            'button[type="submit"]'
          );


        if (button) {

          button.disabled = true;

          button.textContent =
            "Uploading...";
        }


        try {

          /* Get signed upload URL */

          const response =
            await fetch(
              `${API_BASE}/api/documents/upload-url`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({

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


          const data =
            await response.json();


          if (!response.ok) {

            throw new Error(
              data.message ||
              data.error ||
              "Unable to create upload URL."
            );
          }


          const uploadUrl =
            data.signed_url ||
            data.signedUrl ||
            data.upload_url ||
            data.uploadUrl;


          if (!uploadUrl) {

            throw new Error(
              "Upload URL was not returned by server."
            );
          }


          /* Upload file */

          const uploadResponse =
            await fetch(
              uploadUrl,
              {
                method: "PUT",

                headers: {
                  "Content-Type":
                    file.type
                },

                body:
                  file
              }
            );


          if (!uploadResponse.ok) {

            throw new Error(
              "Document upload failed."
            );
          }


          alert(
            "Document uploaded successfully."
          );


          documentForm.reset();


          /* Continue to customer portal */

          openScreen(
            "customerPortal"
          );


        } catch (error) {

          console.error(error);

          alert(
            error.message ||
            "Unable to upload document."
          );


        } finally {

          if (button) {

            button.disabled = false;

            button.textContent =
              "Upload Document";
          }
        }
      }
    );
  }
);
