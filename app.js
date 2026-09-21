const API_BASE = "https://shyam-fincorp.onrender.com";

let currentLoanAccountId = null;
let currentApplicationId = "";
let currentMobile = "";
let currentEmiSchedule = [];


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
  element.className = "message";

  if (type) {
    element.classList.add(type);
  }
}


// =====================================================
// SAFE JSON RESPONSE
// =====================================================

async function safeJsonResponse(response) {

  const text = await response.text();

  const contentType =
    response.headers.get("content-type") || "";

  console.log("API STATUS:", response.status);
  console.log("API RESPONSE:", text.substring(0, 500));


  if (!contentType.includes("application/json")) {

    throw new Error(
      `Server returned an invalid response (${response.status}). Please check the API URL.`
    );

  }


  try {

    return JSON.parse(text);

  } catch (error) {

    console.error("Invalid JSON:", text);

    throw new Error(
      "Server returned invalid JSON."
    );

  }

}


// =====================================================
// SCREEN NAVIGATION
// =====================================================

function openScreen(screenId) {

  const screens =
    document.querySelectorAll(".screen");


  screens.forEach(function(screen) {

    screen.classList.remove("active");

    screen.style.display = "none";

  });


  const target =
    document.getElementById(screenId);


  if (!target) {

    console.error(
      "Screen not found:",
      screenId
    );

    return;

  }


  target.classList.add("active");

  target.style.display = "block";


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


// =====================================================
// TOP NAVIGATION
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    document
      .querySelectorAll("[data-screen]")
      .forEach(function(button) {

        button.addEventListener(
          "click",
          function(event) {

            event.preventDefault();

            const screen =
              button.getAttribute("data-screen");

            if (screen) {

              openScreen(screen);

            }

          }
        );

      });


    // Apply Now buttons
    document
      .querySelectorAll(".apply-now-btn")
      .forEach(function(button) {

        button.addEventListener(
          "click",
          function(event) {

            event.preventDefault();

            openScreen(
              "loanApplication"
            );

          }
        );

      });


    // Start with eligibility page
    const eligibility =
      document.getElementById(
        "eligibility"
      );

    if (eligibility) {

      document
        .querySelectorAll(".screen")
        .forEach(function(screen) {

          screen.classList.remove(
            "active"
          );

          screen.style.display =
            "none";

        });


      eligibility.classList.add(
        "active"
      );

      eligibility.style.display =
        "block";

    }

  }
);


// =====================================================
// ELIGIBILITY 3 STEP FLOW
// =====================================================

let currentEligibilityStep = 1;


function showEligibilityStep(step) {

  currentEligibilityStep = step;


  const steps = [

    document.getElementById(
      "eligibilityStep1"
    ),

    document.getElementById(
      "eligibilityStep2"
    ),

    document.getElementById(
      "eligibilityStep3"
    )

  ];


  steps.forEach(
    function(element, index) {

      if (!element) return;

      if (index + 1 === step) {

        element.classList.add(
          "active"
        );

        element.style.display =
          "block";

      } else {

        element.classList.remove(
          "active"
        );

        element.style.display =
          "none";

      }

    }
  );


  const indicators = [

    document.getElementById(
      "stepIndicator1"
    ),

    document.getElementById(
      "stepIndicator2"
    ),

    document.getElementById(
      "stepIndicator3"
    )

  ];


  indicators.forEach(
    function(element, index) {

      if (!element) return;

      element.classList.toggle(
        "active",
        index + 1 <= step
      );

    }
  );


  const progress =
    document.getElementById(
      "progressBar"
    );


  if (progress) {

    if (step === 1) {

      progress.style.width =
        "0%";

    }

    else if (step === 2) {

      progress.style.width =
        "50%";

    }

    else {

      progress.style.width =
        "100%";

    }

  }

}


// =====================================================
// ELIGIBILITY STEP 1 -> STEP 2
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    const nextButton =
      document.getElementById(
        "nextStep1"
      );


    if (!nextButton) return;


    nextButton.addEventListener(
      "click",
      function() {

        const nameElement =
          document.getElementById(
            "eligibilityName"
          );


        const mobileElement =
          document.getElementById(
            "eligibilityMobile"
          );


        const name =
          nameElement
            ? nameElement.value.trim()
            : "";


        const mobile =
          mobileElement
            ? mobileElement.value.trim()
            : "";


        if (!name) {

          alert(
            "Please enter your full name."
          );

          return;

        }


        if (!/^[0-9]{10}$/.test(mobile)) {

          alert(
            "Please enter a valid 10 digit mobile number."
          );

          return;

        }


        showEligibilityStep(2);


        const amount =
          document.getElementById(
            "requestedAmount"
          );


        if (amount) {

          amount.focus();

        }

      }
    );

  }
);


// =====================================================
// ELIGIBILITY BACK
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    const backButton =
      document.getElementById(
        "backStep2"
      );


    if (!backButton) return;


    backButton.addEventListener(
      "click",
      function() {

        showEligibilityStep(1);

      }
    );

  }
);


// =====================================================
// ELIGIBILITY SUBMIT
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    const eligibilityForm =
      document.getElementById(
        "eligibilityForm"
      );


    if (!eligibilityForm) return;


    eligibilityForm.addEventListener(
      "submit",
      async function(event) {

        event.preventDefault();


        const button =
          document.getElementById(
            "eligibilityButton"
          );


        if (button) {

          button.disabled = true;

          button.textContent =
            "Checking...";

        }


        const nameElement =
          document.getElementById(
            "eligibilityName"
          );


        const mobileElement =
          document.getElementById(
            "eligibilityMobile"
          );


        const incomeElement =
          document.getElementById(
            "monthlyIncome"
          );


        const amountElement =
          document.getElementById(
            "requestedAmount"
          );


        const tenureElement =
          document.getElementById(
            "eligibilityTenure"
          );


        const name =
          nameElement
            ? nameElement.value.trim()
            : "";


        const mobile =
          mobileElement
            ? mobileElement.value.trim()
            : "";


        const income =
          Number(
            incomeElement
              ? incomeElement.value
              : 0
          );


        const amount =
          Number(
            amountElement
              ? amountElement.value
              : 0
          );


        const tenure =
          Number(
            tenureElement
              ? tenureElement.value
              : 0
          );


        if (!name) {

          alert(
            "Please enter your full name."
          );

          if (button) {

            button.disabled = false;

            button.textContent =
              "Check Eligibility";

          }

          return;

        }


        if (!/^[0-9]{10}$/.test(mobile)) {

          alert(
            "Please enter a valid 10 digit mobile number."
          );

          if (button) {

            button.disabled = false;

            button.textContent =
              "Check Eligibility";

          }

          return;

        }


        if (income <= 0) {

          alert(
            "Please enter your monthly income."
          );

          if (button) {

            button.disabled = false;

            button.textContent =
              "Check Eligibility";

          }

          return;

        }


        if (amount <= 0) {

          alert(
            "Please enter requested loan amount."
          );

          if (button) {

            button.disabled = false;

            button.textContent =
              "Check Eligibility";

          }

          return;

        }


        if (tenure <= 0) {

          alert(
            "Please select loan tenure."
          );

          if (button) {

            button.disabled = false;

            button.textContent =
              "Check Eligibility";

          }

          return;

        }


        const payload = {

          full_name:
            name,

          mobile:
            mobile,

          email:
            "",

          age:
            30,

          employment_type:
            "other",

          monthly_income:
            income,

          existing_emi:
            0,

          requested_amount:
            amount,

          tenure_months:
            tenure

        };


        try {

          const response =
            await fetch(
              `${API_BASE}/api/eligibility`,
              {

                method:
                  "POST",

                headers: {

                  "Content-Type":
                    "application/json"

                },

                body:
                  JSON.stringify(
                    payload
                  )

              }
            );


          const data =
            await safeJsonResponse(
              response
            );


          if (!response.ok) {

            throw new Error(
              data.error ||
              "Eligibility check failed."
            );

          }


          // -----------------------------------------
          // RESULT DATA
          // -----------------------------------------

          const inquiryId =
            document.getElementById(
              "inquiryId"
            );


          const estimatedRate =
            document.getElementById(
              "estimatedRate"
            );


          const estimatedEmi =
            document.getElementById(
              "estimatedEmi"
            );


          if (inquiryId) {

            inquiryId.textContent =
              data.inquiry_id || "-";

          }


          if (estimatedRate) {

            estimatedRate.textContent =
              data.estimated_interest_rate ||
              "12";

          }


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


          const icon =
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


            if (icon) {

              icon.textContent =
                "✓";

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


            if (icon) {

              icon.textContent =
                "!";

            }

          }


          else {

            if (title) {

              title.textContent =
                "Preliminary Eligibility Result";

            }


            if (message) {

              message.textContent =
                data.eligibility_reason ||
                "Your preliminary criteria require further review.";

            }


            if (icon) {

              icon.textContent =
                "i";

            }

          }


          // -----------------------------------------
          // SAVE DATA FOR APPLICATION
          // -----------------------------------------

          window.eligibilityCustomer = {

            name:
              name,

            mobile:
              mobile,

            income:
              income,

            amount:
              amount,

            tenure:
              tenure

          };


          // -----------------------------------------
          // SHOW RESULT STEP
          // -----------------------------------------

          showEligibilityStep(3);


          const eligibilitySection =
            document.getElementById(
              "eligibility"
            );


          if (eligibilitySection) {

            eligibilitySection.scrollIntoView({
              behavior:
                "smooth",

              block:
                "start"

            });

          }

        }


        catch (error) {

          console.error(
            "Eligibility Error:",
            error
          );


          alert(
            error.message ||
            "Unable to check eligibility."
          );

        }


        finally {

          if (button) {

            button.disabled =
              false;

            button.textContent =
              "Check Eligibility";

          }

        }

      }
    );

  }
);


// =====================================================
// CONTINUE FROM ELIGIBILITY RESULT
// =====================================================

document.addEventListener(
  "click",
  function(event) {

    const button =
      event.target.closest(
        "#continueApplicationButton, .continue-application-btn, #continueLoanApplication"
      );


    if (!button) return;


    event.preventDefault();


    const applicationScreen =
      document.getElementById(
        "loanApplication"
      );


    if (!applicationScreen) {

      console.error(
        "loanApplication section not found."
      );

      alert(
        "Loan Application page is missing from index.html."
      );

      return;

    }


    // -----------------------------------------------
    // Copy eligibility details
    // -----------------------------------------------

    const saved =
      window.eligibilityCustomer || {};


    const fullName =
      document.getElementById(
        "fullName"
      );


    const mobile =
      document.getElementById(
        "mobile"
      );


    const income =
      document.getElementById(
        "monthlyIncomeApplication"
      );


    const amount =
      document.getElementById(
        "requestedAmountApplication"
      );


    const tenure =
      document.getElementById(
        "tenureApplication"
      );


    if (fullName && saved.name) {

      fullName.value =
        saved.name;

    }


    if (mobile && saved.mobile) {

      mobile.value =
        saved.mobile;

    }


    if (income && saved.income) {

      income.value =
        saved.income;

    }


    if (amount && saved.amount) {

      amount.value =
        saved.amount;

    }


    if (tenure && saved.tenure) {

      tenure.value =
        saved.tenure;

    }


    // -----------------------------------------------
    // Hide all screens
    // -----------------------------------------------

    document
      .querySelectorAll(".screen")
      .forEach(function(screen) {

        screen.classList.remove(
          "active"
        );

        screen.style.display =
          "none";

      });


    // -----------------------------------------------
    // Open Application
    // -----------------------------------------------

    applicationScreen.classList.add(
      "active"
    );


    applicationScreen.style.display =
      "block";


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }
);


// =====================================================
// LOAN APPLICATION
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    const form =
      document.getElementById(
        "loanApplicationForm"
      );


    if (!form) return;


    form.addEventListener(
      "submit",
      async function(event) {

        event.preventDefault();


        const result =
          document.getElementById(
            "applicationResult"
          );


        if (result) {

          result.style.display =
            "block";

          result.className =
            "result-box";

          result.textContent =
            "Submitting application...";

        }


        const payload = {

          full_name:
            document.getElementById(
              "fullName"
            )?.value.trim() || "",

          mobile:
            document.getElementById(
              "mobile"
            )?.value.trim() || "",

          email:
            document.getElementById(
              "email"
            )?.value.trim() || "",

          monthly_income:
            Number(
              document.getElementById(
                "monthlyIncomeApplication"
              )?.value || 0
            ),

          requested_amount:
            Number(
              document.getElementById(
                "requestedAmountApplication"
              )?.value || 0
            ),

          tenure_months:
            Number(
              document.getElementById(
                "tenureApplication"
              )?.value || 0
            ),

          address:
            document.getElementById(
              "address"
            )?.value.trim() || ""

        };


        try {

          const response =
            await fetch(
              `${API_BASE}/api/applications`,
              {

                method:
                  "POST",

                headers: {

                  "Content-Type":
                    "application/json"

                },

                body:
                  JSON.stringify(
                    payload
                  )

              }
            );


          const data =
            await safeJsonResponse(
              response
            );


          if (!response.ok) {

            throw new Error(
              data.error ||
              "Application submission failed."
            );

          }


          currentApplicationId =
            data.application_id;


          if (result) {

            result.className =
              "result-box success";


            result.innerHTML = `

              <strong>
                Application submitted successfully!
              </strong>

              <br><br>

              Application ID:

              <strong>
                ${data.application_id}
              </strong>

              <br><br>

              Please save your Application ID.

            `;

          }


          const documentId =
            document.getElementById(
              "documentApplicationId"
            );


          if (documentId) {

            documentId.value =
              data.application_id;

          }


          setTimeout(
            function() {

              openScreen(
                "documentUploadSection"
              );

            },
            800
          );

        }


        catch (error) {

          console.error(
            "Application Error:",
            error
          );


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
);


// =====================================================
// DOCUMENT UPLOAD
// =====================================================

const DOCUMENT_CONFIG = [

  {
    id:
      "identityProof",

    type:
      "identity_proof",

    label:
      "Identity Proof"

  },

  {
    id:
      "panCard",

    type:
      "pan_card",

    label:
      "PAN Card"

  },

  {
    id:
      "addressProof",

    type:
      "address_proof",

    label:
      "Address Proof"

  },

  {
    id:
      "incomeProof",

    type:
      "income_proof",

    label:
      "Income Proof"

  },

  {
    id:
      "applicantPhoto",

    type:
      "applicant_photo",

    label:
      "Applicant Photo"

  }

];


async function uploadDocument(
  applicationId,
  config,
  file
) {

  if (!file) return;


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

    throw new Error(
      `${config.label}: JPG, PNG or PDF only.`
    );

  }


  if (
    file.size >
    5 * 1024 * 1024
  ) {

    throw new Error(
      `${config.label}: Maximum file size is 5 MB.`
    );

  }


  const response =
    await fetch(
      `${API_BASE}/api/documents/upload-url`,
      {

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify({

            application_id:
              applicationId,

            document_type:
              config.type,

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
    await safeJsonResponse(
      response
    );


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Unable to create upload URL."
    );

  }


  const signedUrl =
    data.signedUrl ||
    data.signed_url;


  const storagePath =
    data.storagePath ||
    data.storage_path;


  if (!signedUrl) {

    throw new Error(
      "Signed upload URL was not returned."
    );

  }


  const upload =
    await fetch(
      signedUrl,
      {

        method:
          "PUT",

        headers: {

          "Content-Type":
            file.type

        },

        body:
          file

      }
    );


  if (!upload.ok) {

    throw new Error(
      `${config.label}: file upload failed.`
    );

  }


  // Save document metadata
  try {

    const recordResponse =
      await fetch(
        `${API_BASE}/api/documents/record`,
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              application_id:
                applicationId,

              document_type:
                config.type,

              file_name:
                file.name,

              storage_path:
                storagePath,

              file_type:
                file.type,

              file_size:
                file.size

            })

        }
      );


    if (
      !recordResponse.ok
    ) {

      console.warn(
        "Document metadata record failed."
      );

    }

  }

  catch (error) {

    console.warn(
      "Document record warning:",
      error
    );

  }

}


// =====================================================
// DOCUMENT UPLOAD BUTTON
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    const button =
      document.getElementById(
        "uploadDocumentsButton"
      );


    if (!button) return;


    button.addEventListener(
      "click",
      async function() {

        const applicationId =
          document.getElementById(
            "documentApplicationId"
          )?.value.trim() ||
          currentApplicationId;


        if (!applicationId) {

          showMessage(
            "documentUploadMessage",
            "Application ID is missing.",
            "error"
          );

          return;

        }


        const selected = [];


        DOCUMENT_CONFIG.forEach(
          function(config) {

            const input =
              document.getElementById(
                config.id
              );


            if (
              input &&
              input.files &&
              input.files[0]
            ) {

              selected.push({

                config:
                  config,

                file:
                  input.files[0]

              });

            }

          }
        );


        if (
          selected.length === 0
        ) {

          showMessage(
            "documentUploadMessage",
            "Please select at least one document.",
            "error"
          );

          return;

        }


        button.disabled =
          true;

        button.textContent =
          "Uploading...";


        let success =
          0;

        const failed = [];


        for (
          const item of selected
        ) {

          try {

            const status =
              document.getElementById(
                "documentUploadStatus"
              );


            if (status) {

              status.style.display =
                "block";

              status.textContent =
                `Uploading ${item.config.label}...`;

            }


            await uploadDocument(
              applicationId,
              item.config,
              item.file
            );


            success++;

          }


          catch (error) {

            failed.push(
              `${item.config.label}: ${error.message}`
            );

          }

        }


        if (
          failed.length === 0
        ) {

          showMessage(
            "documentUploadMessage",
            `${success} document(s) uploaded successfully.`,
            "success"
          );


          const status =
            document.getElementById(
              "documentUploadStatus"
            );


          if (status) {

            status.className =
              "result-box success";

            status.textContent =
              "Documents uploaded successfully. They are now pending verification.";

          }


          setTimeout(
            function() {

              openScreen(
                "customerPortal"
              );

            },
            1000
          );

        }


        else {

          showMessage(
            "documentUploadMessage",
            `${success} document(s) uploaded. Some documents failed.`,
            "error"
          );


          const status =
            document.getElementById(
              "documentUploadStatus"
            );


          if (status) {

            status.className =
              "result-box error";

            status.innerHTML =
              failed.join("<br>");

          }

        }


        button.disabled =
          false;

        button.textContent =
          "Upload Documents";

      }
    );

  }
);


// =====================================================
// MY LOAN LOOKUP
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    const form =
      document.getElementById(
        "lookupForm"
      );


    if (!form) return;


    form.addEventListener(
      "submit",
      async function(event) {

        event.preventDefault();


        const applicationId =
          document.getElementById(
            "lookupApplicationId"
          )?.value.trim() || "";


        const mobile =
          document.getElementById(
            "lookupMobile"
          )?.value.trim() || "";


        if (!applicationId) {

          showMessage(
            "lookupMessage",
            "Please enter your Application ID.",
            "error"
          );

          return;

        }


        if (!/^[0-9]{10}$/.test(mobile)) {

          showMessage(
            "lookupMessage",
            "Please enter a valid 10 digit mobile number.",
            "error"
          );

          return;

        }


        showMessage(
          "lookupMessage",
          "Checking your loan details..."
        );


        try {

          // IMPORTANT:
          // POST request only.
          // No GET fallback.

          const response =
            await fetch(
              `${API_BASE}/api/customer/loan`,
              {

                method:
                  "POST",

                headers: {

                  "Content-Type":
                    "application/json"

                },

                body:
                  JSON.stringify({

                    application_id:
                      applicationId,

                    mobile:
                      mobile

                  })

              }
            );


          const data =
            await safeJsonResponse(
              response
            );


          if (!response.ok) {

            throw new Error(
              data.error ||
              "Loan details could not be found."
            );

          }


          currentApplicationId =
            applicationId;


          currentMobile =
            mobile;


          displayLoan(
            data
          );


          showMessage(
            "lookupMessage",
            "Loan details found successfully.",
            "success"
          );


          setTimeout(
            function() {

              openScreen(
                "loanDashboard"
              );

            },
            500
          );

        }


        catch (error) {

          console.error(
            "My Loan Error:",
            error
          );


          showMessage(
            "lookupMessage",
            error.message ||
            "Unable to find your loan details.",
            "error"
          );

        }

      }
    );

  }
);


// =====================================================
// DISPLAY LOAN
// =====================================================

function displayLoan(data) {

  const loan =
    data.loan ||
    data.loan_account ||
    data;


  if (!loan) {

    throw new Error(
      "Loan information was not returned."
    );

  }


  currentLoanAccountId =
    loan.loan_account_id ||
    loan.loanAccountId ||
    loan.account_no ||
    loan.loan_account ||
    loan.loan_account_number ||
    "";


  const applicationId =
    loan.application_id ||
    currentApplicationId;


  const customerName =
    loan.customer_name ||
    loan.full_name ||
    loan.name ||
    "-";


  const loanAmount =
    loan.principal ||
    loan.loan_amount ||
    loan.requested_amount ||
    0;


  const interestRate =
    loan.annual_interest_rate ||
    loan.interest_rate ||
    0;


  const tenure =
    loan.tenure_months ||
    0;


  const emi =
    loan.emi ||
    0;


  const outstanding =
    loan.outstanding_amount ||
    loan.outstanding ||
    loan.balance ||
    0;


  const status =
    loan.status ||
    "-";


  const values = {

    displayLoanAccount:
      currentLoanAccountId,

    displayApplicationId:
      applicationId,

    displayCustomerName:
      customerName,

    displayLoanAmount:
      formatMoney(
        loanAmount
      ),

    displayInterestRate:
      interestRate,

    displayTenure:
      tenure,

    displayEmi:
      formatMoney(
        emi
      ),

    displayOutstanding:
      formatMoney(
        outstanding
      ),

    displayLoanStatus:
      status

  };


  Object.keys(values)
    .forEach(
      function(id) {

        const element =
          document.getElementById(
            id
          );


        if (element) {

          element.textContent =
            values[id];

        }

      }
    );


  currentEmiSchedule =
    data.emi_schedule ||
    data.schedule ||
    [];


  if (
    !Array.isArray(
      currentEmiSchedule
    )
  ) {

    currentEmiSchedule = [];

  }


  displayEmiSchedule(
    currentEmiSchedule
  );


  updatePaymentSummary(
    currentEmiSchedule
  );


  populatePaymentInstallments(
    currentEmiSchedule
  );


  refreshPaymentHistory();

}


// =====================================================
// EMI SCHEDULE
// =====================================================

function displayEmiSchedule(
  schedule
) {

  const tbody =
    document.getElementById(
      "emiTableBody"
    );


  const section =
    document.getElementById(
      "emiScheduleSection"
    );


  if (!tbody) return;


  tbody.innerHTML = "";


  if (
    !Array.isArray(schedule) ||
    schedule.length === 0
  ) {

    if (section) {

      section.style.display =
        "none";

    }

    return;

  }


  schedule.forEach(
    function(emi) {

      const row =
        document.createElement(
          "tr"
        );


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
          ${emi.status || "pending"}
        </td>

      `;


      tbody.appendChild(
        row
      );

    }
  );


  if (section) {

    section.style.display =
      "block";

  }

}


// =====================================================
// PAYMENT SUMMARY
// =====================================================

function updatePaymentSummary(
  schedule
) {

  const section =
    document.getElementById(
      "paymentSummarySection"
    );


  if (!section) return;


  if (
    !Array.isArray(schedule) ||
    schedule.length === 0
  ) {

    section.style.display =
      "none";

    return;

  }


  let totalPayable = 0;

  let totalPaid = 0;

  let paidCount = 0;

  let pendingCount = 0;


  schedule.forEach(
    function(emi) {

      const total =
        Number(
          emi.total_due || 0
        );


      const paid =
        Number(
          emi.paid_amount || 0
        );


      const safePaid =
        Math.min(
          Math.max(
            paid,
            0
          ),
          Math.max(
            total,
            0
          )
        );


      totalPayable +=
        total;


      totalPaid +=
        safePaid;


      if (
        String(
          emi.status || ""
        ).toLowerCase() ===
        "paid"
      ) {

        paidCount++;

      }

      else {

        pendingCount++;

      }

    }
  );


  const pending =
    Math.max(
      totalPayable -
      totalPaid,
      0
    );


  const progress =
    totalPayable > 0
      ? (
          totalPaid /
          totalPayable
        ) * 100
      : 0;


  const totalPayableElement =
    document.getElementById(
      "totalPayableAmount"
    );


  const totalPaidElement =
    document.getElementById(
      "totalPaidAmount"
    );


  const totalPendingElement =
    document.getElementById(
      "totalPendingAmount"
    );


  const paidCountElement =
    document.getElementById(
      "paidEmiCount"
    );


  const pendingCountElement =
    document.getElementById(
      "pendingEmiCount"
    );


  const progressElement =
    document.getElementById(
      "paymentProgress"
    );


  if (totalPayableElement) {

    totalPayableElement.textContent =
      formatMoney(
        totalPayable
      );

  }


  if (totalPaidElement) {

    totalPaidElement.textContent =
      formatMoney(
        totalPaid
      );

  }


  if (totalPendingElement) {

    totalPendingElement.textContent =
      formatMoney(
        pending
      );

  }


  if (paidCountElement) {

    paidCountElement.textContent =
      paidCount;

  }


  if (pendingCountElement) {

    pendingCountElement.textContent =
      pendingCount;

  }


  if (progressElement) {

    progressElement.textContent =
      progress.toFixed(1);

  }


  section.style.display =
    "block";

}


// =====================================================
// PAYMENT INSTALLMENT DROPDOWN
// =====================================================

function populatePaymentInstallments(
  schedule
) {

  const select =
    document.getElementById(
      "paymentInstallment"
    );


  if (!select) return;


  select.innerHTML = "";


  schedule.forEach(
    function(emi) {

      const total =
        Number(
          emi.total_due || 0
        );


      const paid =
        Number(
          emi.paid_amount || 0
        );


      const pending =
        Math.max(
          total -
          paid,
          0
        );


      if (
        String(
          emi.status || ""
        ).toLowerCase() ===
        "paid"
      ) {

        return;

      }


      const option =
        document.createElement(
          "option"
        );


      option.value =
        emi.installment_no;


      option.textContent =
        `EMI ${emi.installment_no} — ₹${formatMoney(pending)}`;


      select.appendChild(
        option
      );

    }
  );


  updatePaymentAmount();

}


// =====================================================
// PAYMENT AMOUNT
// =====================================================

function updatePaymentAmount() {

  const select =
    document.getElementById(
      "paymentInstallment"
    );


  const amount =
    document.getElementById(
      "paymentAmount"
    );


  if (!select || !amount) {
    return;
  }


  const installment =
    Number(
      select.value
    );


  const emi =
    currentEmiSchedule.find(
      function(item) {

        return Number(
          item.installment_no
        ) === installment;

      }
    );


  if (!emi) return;


  const total =
    Number(
      emi.total_due || 0
    );


  const paid =
    Number(
      emi.paid_amount || 0
    );


  amount.value =
    Math.max(
      total -
      paid,
      0
    );

}


// =====================================================
// PAYMENT INSTALLMENT CHANGE
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    const select =
      document.getElementById(
        "paymentInstallment"
      );


    if (!select) return;


    select.addEventListener(
      "change",
      updatePaymentAmount
    );

  }
);


// =====================================================
// PAY EMI
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    const form =
      document.getElementById(
        "paymentForm"
      );


    if (!form) return;


    form.addEventListener(
      "submit",
      async function(event) {

        event.preventDefault();


        if (
          !currentApplicationId ||
          !currentMobile ||
          !currentLoanAccountId
        ) {

          showMessage(
            "paymentMessage",
            "Please open My Loan first.",
            "error"
          );

          return;

        }


        const installment =
          Number(
            document.getElementById(
              "paymentInstallment"
            )?.value || 0
          );


        const amount =
          Number(
            document.getElementById(
              "paymentAmount"
            )?.value || 0
          );


        const method =
          document.getElementById(
            "paymentMethod"
          )?.value ||
          "demo";


        if (!installment) {

          showMessage(
            "paymentMessage",
            "Please select an EMI.",
            "error"
          );

          return;

        }


        if (amount <= 0) {

          showMessage(
            "paymentMessage",
            "Please enter a valid amount.",
            "error"
          );

          return;

        }


        showMessage(
          "paymentMessage",
          "Processing payment..."
        );


        try {

          const response =
            await fetch(
              `${API_BASE}/api/customer/pay-emi-test`,
              {

                method:
                  "POST",

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


          const data =
            await safeJsonResponse(
              response
            );


          if (!response.ok) {

            throw new Error(
              data.error ||
              "Payment failed."
            );

          }


          showMessage(
            "paymentMessage",
            data.message ||
            "EMI payment successful.",
            "success"
          );


          const amountInput =
            document.getElementById(
              "paymentAmount"
            );


          if (amountInput) {

            amountInput.value =
              "";

          }


          await refreshLoanData();

        }


        catch (error) {

          console.error(
            "Payment Error:",
            error
          );


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
);


// =====================================================
// REFRESH LOAN DATA
// =====================================================

async function refreshLoanData() {

  if (
    !currentApplicationId ||
    !currentMobile
  ) {

    return;

  }


  try {

    const response =
      await fetch(
        `${API_BASE}/api/customer/loan`,
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              application_id:
                currentApplicationId,

              mobile:
                currentMobile

            })

        }
      );


    const data =
      await safeJsonResponse(
        response
      );


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

  catch (error) {

    console.error(
      "Loan refresh error:",
      error
    );

  }

}


// =====================================================
// PAYMENT HISTORY
// =====================================================

async function refreshPaymentHistory() {

  if (
    !currentApplicationId ||
    !currentMobile
  ) {

    return;

  }


  const tbody =
    document.getElementById(
      "paymentHistoryBody"
    );


  if (!tbody) return;


  try {

    const response =
      await fetch(
        `${API_BASE}/api/customer/payment-history`,
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              application_id:
                currentApplicationId,

              mobile:
                currentMobile

            })

        }
      );


    const data =
      await safeJsonResponse(
        response
      );


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Unable to load payment history."
      );

    }


    const payments =
      data.payments ||
      data.payment_history ||
      [];


    tbody.innerHTML = "";


    if (
      !Array.isArray(
        payments
      ) ||
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
      function(payment) {

        const row =
          document.createElement(
            "tr"
          );


        const date =
          payment.payment_date ||
          payment.created_at ||
          "-";


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
            ${
              payment.payment_method ||
              payment.method ||
              "-"
            }
          </td>

          <td>
            ${
              payment.transaction_reference ||
              payment.reference ||
              "-"
            }
          </td>

          <td>
            ${
              payment.status ||
              "-"
            }
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
// INITIALIZE
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    showEligibilityStep(1);

  }
);
