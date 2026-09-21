// =====================================================
// SHYAM FINCORP - COMPLETE FRONTEND APP.JS
// =====================================================

const API_BASE = "https://shyam-fincorp.onrender.com";


// =====================================================
// GLOBAL STATE
// =====================================================

let currentApplicationId = "";
let currentCustomerMobile = "";
let currentLoanAccountId = "";
let currentEmiSchedule = [];


// =====================================================
// COMMON HELPERS
// =====================================================

function formatMoney(value) {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 0
  });
}


function showMessage(elementId, message, type = "") {

  const element = document.getElementById(elementId);

  if (!element) return;

  element.className = "message";

  if (type) {
    element.classList.add(type);
  }

  element.textContent = message;
}


// =====================================================
// SAFE JSON RESPONSE
// Prevents:
// Unexpected token '<', "<!DOCTYPE"...
// =====================================================

async function safeJsonResponse(response) {

  const contentType =
    response.headers.get("content-type") || "";

  const text = await response.text();

  if (!contentType.includes("application/json")) {

    console.error(
      "Expected JSON but received:",
      text.substring(0, 500)
    );

    throw new Error(
      `Server returned an invalid response (${response.status}). Please try again.`
    );
  }

  try {

    return JSON.parse(text);

  } catch (error) {

    console.error("Invalid JSON:", text);

    throw new Error(
      "Server returned invalid JSON. Please try again."
    );
  }
}


// =====================================================
// SCREEN NAVIGATION
// =====================================================

function showScreen(screenId) {

  const screens =
    document.querySelectorAll(".screen");

  screens.forEach(function (screen) {

    screen.classList.remove("active");

    screen.style.display = "none";

  });


  const target =
    document.getElementById(screenId);

  if (!target) {

    console.warn(
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
// NAVIGATION BUTTONS
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    document
      .querySelectorAll("[data-screen]")
      .forEach(function (button) {

        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();

            const screen =
              button.getAttribute("data-screen");

            if (screen) {
              showScreen(screen);
            }

          }
        );

      });


    // Mobile menu
    const menuButton =
      document.getElementById("menuButton");

    const mobileNav =
      document.getElementById("mobileNav");

    if (menuButton && mobileNav) {

      menuButton.addEventListener(
        "click",
        function () {

          mobileNav.classList.toggle("open");

        }
      );

    }

  }
);


// =====================================================
// HOME / APPLY BUTTON
// =====================================================

const applyNowButton =
  document.getElementById("applyNowButton");

if (applyNowButton) {

  applyNowButton.addEventListener(
    "click",
    function (event) {

      event.preventDefault();

      showScreen("loanApplication");

    }
  );

}


// =====================================================
// EMI CALCULATOR
// =====================================================

function calculateEMI(
  principal,
  annualRate,
  months
) {

  principal = Number(principal);
  annualRate = Number(annualRate);
  months = Number(months);

  if (
    !principal ||
    !months ||
    principal <= 0 ||
    months <= 0
  ) {
    return 0;
  }


  const monthlyRate =
    annualRate / 12 / 100;


  if (monthlyRate === 0) {

    return Math.round(
      principal / months
    );

  }


  const emi =
    principal *
    monthlyRate *
    Math.pow(
      1 + monthlyRate,
      months
    ) /
    (
      Math.pow(
        1 + monthlyRate,
        months
      ) - 1
    );


  return Math.round(emi);

}


const calculatorForm =
  document.getElementById(
    "calculatorForm"
  );


if (calculatorForm) {

  calculatorForm.addEventListener(
    "submit",
    function (event) {

      event.preventDefault();


      const amount =
        Number(
          document.getElementById(
            "calculatorAmount"
          )?.value || 0
        );


      const rate =
        Number(
          document.getElementById(
            "calculatorRate"
          )?.value || 12
        );


      const tenure =
        Number(
          document.getElementById(
            "calculatorTenure"
          )?.value || 0
        );


      const emi =
        calculateEMI(
          amount,
          rate,
          tenure
        );


      const result =
        document.getElementById(
          "calculatorResult"
        );


      if (result) {

        result.style.display = "block";

        result.innerHTML = `
          <strong>Estimated Monthly EMI</strong>
          <div style="font-size:32px;margin-top:8px;">
            ₹${formatMoney(emi)}
          </div>
          <p>
            Estimated calculation at ${rate}% annual interest
            for ${tenure} months.
          </p>
        `;

      }

    }
  );

}


// =====================================================
// ELIGIBILITY
// =====================================================

let eligibilityData = {};


const eligibilityForm =
  document.getElementById(
    "eligibilityForm"
  );


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
        Number(
          document.getElementById(
            "eligibilityIncome"
          )?.value || 0
        );


      const existingEmi =
        Number(
          document.getElementById(
            "eligibilityExistingEmi"
          )?.value || 0
        );


      const amount =
        Number(
          document.getElementById(
            "eligibilityAmount"
          )?.value || 0
        );


      const tenure =
        Number(
          document.getElementById(
            "eligibilityTenure"
          )?.value || 0
        );


      if (!name || !mobile) {

        showMessage(
          "eligibilityMessage",
          "Please enter your name and mobile number.",
          "error"
        );

        return;

      }


      if (!/^\d{10}$/.test(mobile)) {

        showMessage(
          "eligibilityMessage",
          "Please enter a valid 10 digit mobile number.",
          "error"
        );

        return;

      }


      try {

        showMessage(
          "eligibilityMessage",
          "Checking your preliminary eligibility...",
          ""
        );


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
                JSON.stringify({

                  full_name: name,

                  mobile: mobile,

                  email: "",

                  age: 30,

                  employment_type:
                    "other",

                  monthly_income:
                    income,

                  existing_emi:
                    existingEmi,

                  requested_amount:
                    amount,

                  tenure_months:
                    tenure

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
            "Eligibility check failed."
          );

        }


        eligibilityData = data;


        const result =
          document.getElementById(
            "eligibilityResult"
          );


        if (result) {

          result.style.display =
            "block";


          result.innerHTML = `

            <div class="result-box success">

              <h3>
                Preliminary Eligibility Result
              </h3>

              <p>
                Status:
                <strong>
                  ${data.eligibility_status || "-"}
                </strong>
              </p>

              <p>
                Estimated Interest Rate:
                <strong>
                  ${data.estimated_interest_rate || 12}%
                </strong>
              </p>

              <p>
                Estimated EMI:
                <strong>
                  ₹${formatMoney(
                    data.estimated_emi
                  )}
                </strong>
              </p>

              ${
                data.inquiry_id
                  ? `
                    <p>
                      Inquiry ID:
                      <strong>
                        ${data.inquiry_id}
                      </strong>
                    </p>
                  `
                  : ""
              }

              <p>
                ${
                  data.eligibility_reason ||
                  "This is a preliminary indication and is subject to verification."
                }
              </p>

              <button
                type="button"
                class="primary-btn"
                id="continueApplicationButton"
              >
                Continue to Loan Application
              </button>

            </div>

          `;


          const continueButton =
            document.getElementById(
              "continueApplicationButton"
            );


          if (continueButton) {

            continueButton.addEventListener(
              "click",
              function () {

                // Copy eligibility details
                const applicationName =
                  document.getElementById(
                    "fullName"
                  );

                const applicationMobile =
                  document.getElementById(
                    "mobile"
                  );

                const applicationIncome =
                  document.getElementById(
                    "monthlyIncomeApplication"
                  );

                const applicationAmount =
                  document.getElementById(
                    "requestedAmountApplication"
                  );

                const applicationTenure =
                  document.getElementById(
                    "tenureApplication"
                  );


                if (applicationName) {
                  applicationName.value =
                    name;
                }


                if (applicationMobile) {
                  applicationMobile.value =
                    mobile;
                }


                if (applicationIncome) {
                  applicationIncome.value =
                    income;
                }


                if (applicationAmount) {
                  applicationAmount.value =
                    amount;
                }


                if (applicationTenure) {
                  applicationTenure.value =
                    tenure;
                }


                showScreen(
                  "loanApplication"
                );

              }
            );

          }

        }


      } catch (error) {

        console.error(
          "Eligibility Error:",
          error
        );


        showMessage(
          "eligibilityMessage",
          error.message ||
          "Unable to check eligibility.",
          "error"
        );

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
          )?.value.trim(),

        mobile:
          document.getElementById(
            "mobile"
          )?.value.trim(),

        email:
          document.getElementById(
            "email"
          )?.value.trim(),

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
          )?.value.trim()

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

            Your Application ID:

            <strong>
              ${data.application_id}
            </strong>

            <br><br>

            Please save this Application ID.

          `;

        }


        loanApplicationForm.reset();


        // Put Application ID into document page
        const documentApplicationId =
          document.getElementById(
            "documentApplicationId"
          );


        if (documentApplicationId) {

          documentApplicationId.value =
            data.application_id;

        }


        // OPEN DOCUMENT PAGE
        setTimeout(
          function () {

            showScreen(
              "documentUploadSection"
            );

          },
          800
        );


      } catch (error) {

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


// =====================================================
// DOCUMENT UPLOAD
// =====================================================

const documentUploadSection =
  document.getElementById(
    "documentUploadSection"
  );


const uploadDocumentsButton =
  document.getElementById(
    "uploadDocumentsButton"
  );


const documentApplicationId =
  document.getElementById(
    "documentApplicationId"
  );


const documentUploadMessage =
  document.getElementById(
    "documentUploadMessage"
  );


const documentUploadStatus =
  document.getElementById(
    "documentUploadStatus"
  );


const DOCUMENT_UPLOADS = [

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


function showDocumentUpload(
  applicationId
) {

  currentApplicationId =
    applicationId;


  if (documentApplicationId) {

    documentApplicationId.value =
      applicationId;

  }


  showScreen(
    "documentUploadSection"
  );

}


async function uploadSingleDocument(
  applicationId,
  config,
  file
) {

  const maxSize =
    5 * 1024 * 1024;


  const allowedTypes = [

    "image/jpeg",

    "image/png",

    "application/pdf"

  ];


  if (!allowedTypes.includes(
    file.type
  )) {

    throw new Error(
      `${config.label}: JPG, PNG or PDF only.`
    );

  }


  if (file.size > maxSize) {

    throw new Error(
      `${config.label}: Maximum file size is 5 MB.`
    );

  }


  const urlResponse =
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


  const urlData =
    await safeJsonResponse(
      urlResponse
    );


  if (!urlResponse.ok) {

    throw new Error(
      urlData.error ||
      "Unable to create upload URL."
    );

  }


  const signedUrl =
    urlData.signedUrl ||
    urlData.signed_url;


  const storagePath =
    urlData.storagePath ||
    urlData.storage_path;


  if (!signedUrl) {

    throw new Error(
      "Upload URL was not returned by server."
    );

  }


  // Upload file
  const uploadResponse =
    await fetch(
      signedUrl,
      {

        method: "PUT",

        headers: {
          "Content-Type":
            file.type
        },

        body: file

      }
    );


  if (!uploadResponse.ok) {

    throw new Error(
      `${config.label}: File upload failed.`
    );

  }


  // Save metadata if backend supports it
  try {

    const recordResponse =
      await fetch(
        `${API_BASE}/api/documents/record`,
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


    if (!recordResponse.ok) {

      const recordData =
        await safeJsonResponse(
          recordResponse
        );

      throw new Error(
        recordData.error ||
        `${config.label} record could not be saved.`
      );

    }

  } catch (error) {

    // If record endpoint doesn't exist,
    // don't fail the actual file upload.
    console.warn(
      "Document record warning:",
      error.message
    );

  }


  return true;

}


if (uploadDocumentsButton) {

  uploadDocumentsButton.addEventListener(
    "click",
    async function () {

      const applicationId =
        documentApplicationId
          ? documentApplicationId.value.trim()
          : currentApplicationId;


      if (!applicationId) {

        showMessage(
          "documentUploadMessage",
          "Please submit your loan application first.",
          "error"
        );

        return;

      }


      const selectedFiles = [];


      DOCUMENT_UPLOADS.forEach(
        function (config) {

          const input =
            document.getElementById(
              config.id
            );


          const file =
            input &&
            input.files
              ? input.files[0]
              : null;


          if (file) {

            selectedFiles.push({

              config,
              file

            });

          }

        }
      );


      if (selectedFiles.length === 0) {

        showMessage(
          "documentUploadMessage",
          "Please select at least one document.",
          "error"
        );

        return;

      }


      uploadDocumentsButton.disabled =
        true;


      uploadDocumentsButton.textContent =
        "Uploading...";


      let successCount = 0;

      const failed = [];


      try {

        for (
          const item of selectedFiles
        ) {

          if (documentUploadStatus) {

            documentUploadStatus.style.display =
              "block";

            documentUploadStatus.className =
              "result-box";

            documentUploadStatus.textContent =
              `Uploading ${item.config.label}...`;

          }


          try {

            await uploadSingleDocument(
              applicationId,
              item.config,
              item.file
            );


            successCount++;

          } catch (error) {

            failed.push(
              `${item.config.label}: ${error.message}`
            );

          }

        }


        // =================================================
        // ALL DOCUMENTS SUCCESS
        // =================================================

        if (failed.length === 0) {

          showMessage(
            "documentUploadMessage",
            `${successCount} document(s) uploaded successfully.`,
            "success"
          );


          if (documentUploadStatus) {

            documentUploadStatus.className =
              "result-box success";

            documentUploadStatus.textContent =
              "All selected documents have been uploaded successfully.";

          }


          // Clear files
          selectedFiles.forEach(
            function (item) {

              const input =
                document.getElementById(
                  item.config.id
                );

              if (input) {
                input.value = "";
              }

            }
          );


          // =================================================
          // OPEN CUSTOMER PORTAL AFTER UPLOAD
          // =================================================

          setTimeout(
            function () {

              showScreen(
                "customerPortal"
              );

            },
            1000
          );


        } else {

          showMessage(
            "documentUploadMessage",
            `${successCount} document(s) uploaded. Some documents could not be uploaded.`,
            "error"
          );


          if (documentUploadStatus) {

            documentUploadStatus.className =
              "result-box error";

            documentUploadStatus.innerHTML =
              "<strong>Upload completed with some errors.</strong><br><br>" +
              failed.join("<br>");

          }

        }


      } catch (error) {

        console.error(
          "Document upload error:",
          error
        );


        showMessage(
          "documentUploadMessage",
          error.message ||
          "Document upload failed.",
          "error"
        );

      }


      finally {

        uploadDocumentsButton.disabled =
          false;

        uploadDocumentsButton.textContent =
          "Upload Documents";

      }

    }
  );

}


// =====================================================
// MY LOAN LOOKUP
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


      const applicationId =
        document.getElementById(
          "lookupApplicationId"
        )?.value.trim();


      const mobile =
        document.getElementById(
          "lookupMobile"
        )?.value.trim();


      if (!applicationId || !mobile) {

        showMessage(
          "lookupMessage",
          "Please enter Application ID and Mobile Number.",
          "error"
        );

        return;

      }


      if (!/^\d{10}$/.test(mobile)) {

        showMessage(
          "lookupMessage",
          "Please enter a valid 10 digit mobile number.",
          "error"
        );

        return;

      }


      showMessage(
        "lookupMessage",
        "Checking your loan details...",
        ""
      );


      try {

        // IMPORTANT:
        // Backend expects POST + application_id + mobile

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

        currentCustomerMobile =
          mobile;


        displayLoan(data);


        showMessage(
          "lookupMessage",
          "Loan details found successfully.",
          "success"
        );


        setTimeout(
          function () {

            showScreen(
              "loanDashboard"
            );

          },
          500
        );


      } catch (error) {

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


// =====================================================
// DISPLAY LOAN
// =====================================================

function displayLoan(data) {

  const loan =
    data.loan ||
    data.loan_account ||
    data.loanAccount ||
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
    "";


  const values = {

    loanAccount:
      currentLoanAccountId,

    applicationId:
      loan.application_id ||
      currentApplicationId,

    customerName:
      loan.customer_name ||
      loan.full_name ||
      loan.name ||
      "-",

    loanAmount:
      loan.principal ||
      loan.loan_amount ||
      loan.requested_amount ||
      0,

    interestRate:
      loan.annual_interest_rate ||
      loan.interest_rate ||
      0,

    tenure:
      loan.tenure_months ||
      0,

    emi:
      loan.emi ||
      0,

    outstanding:
      loan.outstanding_amount ||
      loan.outstanding ||
      loan.balance ||
      0,

    status:
      loan.status ||
      "-"

  };


  const map = {

    displayLoanAccount:
      values.loanAccount,

    displayApplicationId:
      values.applicationId,

    displayCustomerName:
      values.customerName,

    displayLoanAmount:
      formatMoney(values.loanAmount),

    displayInterestRate:
      values.interestRate,

    displayTenure:
      values.tenure,

    displayEmi:
      formatMoney(values.emi),

    displayOutstanding:
      formatMoney(values.outstanding),

    displayLoanStatus:
      values.status

  };


  Object.keys(map)
    .forEach(function (id) {

      const element =
        document.getElementById(id);

      if (element) {

        element.textContent =
          map[id];

      }

    });


  const emiSchedule =
    data.emi_schedule ||
    data.schedule ||
    [];


  currentEmiSchedule =
    Array.isArray(emiSchedule)
      ? emiSchedule
      : [];


  displayEmiSchedule(
    currentEmiSchedule
  );


  updatePaymentSummary(
    currentEmiSchedule
  );


  populatePaymentInstallments(
    currentEmiSchedule
  );


  const nextPending =
    currentEmiSchedule.find(
      function (emi) {

        const total =
          Number(
            emi.total_due || 0
          );

        const paid =
          Number(
            emi.paid_amount || 0
          );


        return (
          String(
            emi.status || ""
          ).toLowerCase() !== "paid" &&
          paid < total
        );

      }
    );


  const paymentAmountInput =
    document.getElementById(
      "paymentAmount"
    );


  if (
    paymentAmountInput &&
    nextPending
  ) {

    paymentAmountInput.value =
      Math.max(
        Number(
          nextPending.total_due || 0
        ) -
        Number(
          nextPending.paid_amount || 0
        ),
        0
      );

  }


  const paymentSection =
    document.getElementById(
      "paymentSection"
    );


  const paymentHistorySection =
    document.getElementById(
      "paymentHistorySection"
    );


  if (paymentSection) {

    paymentSection.style.display =
      "block";

  }


  if (paymentHistorySection) {

    paymentHistorySection.style.display =
      "block";

  }


  refreshPaymentHistory();

}


// =====================================================
// EMI SCHEDULE
// =====================================================

function displayEmiSchedule(
  schedule
) {

  const container =
    document.getElementById(
      "emiScheduleContainer"
    );


  const tableBody =
    document.getElementById(
      "emiTableBody"
    );


  if (!container && !tableBody) {
    return;
  }


  const list =
    Array.isArray(schedule)
      ? schedule
      : [];


  if (container) {

    if (list.length === 0) {

      container.innerHTML = `
        <div class="message">
          EMI schedule is not available yet.
        </div>
      `;

      return;

    }


    container.innerHTML =
      list.map(
        function (emi) {

          const total =
            Number(
              emi.total_due || 0
            );


          const paid =
            Number(
              emi.paid_amount || 0
            );


          return `

            <div class="emi-row">

              <div>
                <strong>
                  EMI ${emi.installment_no || "-"}
                </strong>

                <small>
                  ${
                    emi.due_date ||
                    "-"
                  }
                </small>
              </div>

              <div>
                ₹${formatMoney(total)}
              </div>

              <div>
                ₹${formatMoney(paid)}
              </div>

              <div>
                ${
                  emi.status ||
                  "pending"
                }
              </div>

            </div>

          `;

        }
      ).join("");

  }


  if (tableBody) {

    tableBody.innerHTML =
      list.map(
        function (emi) {

          return `

            <tr>

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

            </tr>

          `;

        }
      ).join("");

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


  const list =
    Array.isArray(schedule)
      ? schedule
      : [];


  if (list.length === 0) {

    section.style.display =
      "none";

    return;

  }


  let totalPayable = 0;

  let totalPaid = 0;

  let paidCount = 0;

  let pendingCount = 0;


  list.forEach(
    function (emi) {

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
          Math.max(paid, 0),
          Math.max(total, 0)
        );


      totalPayable +=
        total;

      totalPaid +=
        safePaid;


      if (
        String(
          emi.status || ""
        ).toLowerCase() ===
          "paid" ||
        (
          total > 0 &&
          safePaid >= total
        )
      ) {

        paidCount++;

      } else {

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
      ? Math.round(
          (
            totalPaid /
            totalPayable
          ) * 100
        )
      : 0;


  const values = {

    totalPayableAmount:
      formatMoney(
        totalPayable
      ),

    totalPaidAmount:
      formatMoney(
        totalPaid
      ),

    totalPendingAmount:
      formatMoney(
        pending
      ),

    paidEmiCount:
      paidCount,

    pendingEmiCount:
      pendingCount,

    paymentProgress:
      progress

  };


  Object.keys(values)
    .forEach(function (id) {

      const element =
        document.getElementById(id);

      if (element) {

        element.textContent =
          values[id];

      }

    });


  section.style.display =
    "block";

}


// =====================================================
// PAYMENT INSTALLMENTS
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


  const list =
    Array.isArray(schedule)
      ? schedule
      : [];


  list.forEach(
    function (emi) {

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
          total - paid,
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


  const first =
    list.find(
      function (emi) {

        return String(
          emi.status || ""
        ).toLowerCase() !== "paid";

      }
    );


  const amount =
    document.getElementById(
      "paymentAmount"
    );


  if (first && amount) {

    amount.value =
      Math.max(
        Number(
          first.total_due || 0
        ) -
        Number(
          first.paid_amount || 0
        ),
        0
      );

  }

}


// =====================================================
// CHANGE INSTALLMENT AMOUNT
// =====================================================

const paymentInstallment =
  document.getElementById(
    "paymentInstallment"
  );


if (paymentInstallment) {

  paymentInstallment.addEventListener(
    "change",
    function () {

      const installment =
        Number(
          paymentInstallment.value
        );


      const emi =
        currentEmiSchedule.find(
          function (item) {

            return Number(
              item.installment_no
            ) === installment;

          }
        );


      if (!emi) return;


      const amount =
        document.getElementById(
          "paymentAmount"
        );


      if (amount) {

        amount.value =
          Math.max(
            Number(
              emi.total_due || 0
            ) -
            Number(
              emi.paid_amount || 0
            ),
            0
          );

      }

    }
  );

}


// =====================================================
// PAY EMI
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


      if (
        !currentApplicationId ||
        !currentCustomerMobile ||
        !currentLoanAccountId
      ) {

        showMessage(
          "paymentMessage",
          "Please open My Loan first.",
          "error"
        );

        return;

      }


      if (
        !installment ||
        amount <= 0
      ) {

        showMessage(
          "paymentMessage",
          "Please select a valid EMI and amount.",
          "error"
        );

        return;

      }


      showMessage(
        "paymentMessage",
        "Processing payment...",
        ""
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

                  loan_account_id:
                    currentLoanAccountId,

                  mobile:
                    currentCustomerMobile,

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


        await refreshLoan();


      } catch (error) {

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


// =====================================================
// REFRESH LOAN
// =====================================================

async function refreshLoan() {

  if (
    !currentApplicationId ||
    !currentCustomerMobile
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

              application_id:
                currentApplicationId,

              mobile:
                currentCustomerMobile

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


    displayLoan(data);


  } catch (error) {

    console.error(
      "Refresh loan error:",
      error
    );

  }

}


// =====================================================
// PAYMENT HISTORY
// =====================================================

async function refreshPaymentHistory() {

  const container =
    document.getElementById(
      "paymentHistoryContainer"
    );


  const tableBody =
    document.getElementById(
      "paymentHistoryBody"
    );


  if (
    !currentApplicationId ||
    !currentCustomerMobile
  ) {
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
      await safeJsonResponse(
        response
      );


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Unable to load payment history."
      );

    }


    const history =
      data.payments ||
      data.payment_history ||
      [];


    if (
      container &&
      Array.isArray(history)
    ) {

      if (history.length === 0) {

        container.innerHTML = `
          <div class="message">
            No payment history available.
          </div>
        `;

      } else {

        container.innerHTML =
          history.map(
            function (payment) {

              return `

                <div class="payment-history-row">

                  <span>
                    ${
                      payment.created_at ||
                      payment.payment_date ||
                      "-"
                    }
                  </span>

                  <strong>
                    ₹${formatMoney(
                      payment.amount
                    )}
                  </strong>

                  <span>
                    ${
                      payment.payment_method ||
                      payment.method ||
                      "-"
                    }
                  </span>

                  <span>
                    ${
                      payment.reference ||
                      payment.payment_reference ||
                      "-"
                    }
                  </span>

                  <span>
                    ${
                      payment.status ||
                      "-"
                    }
                  </span>

                </div>

              `;

            }
          ).join("");

      }

    }


    if (tableBody) {

      tableBody.innerHTML =
        history.map(
          function (payment) {

            return `

              <tr>

                <td>
                  ${
                    payment.created_at ||
                    payment.payment_date ||
                    "-"
                  }
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
                    payment.reference ||
                    payment.payment_reference ||
                    "-"
                  }
                </td>

                <td>
                  ${
                    payment.status ||
                    "-"
                  }
                </td>

              </tr>

            `;

          }
        ).join("");

    }


  } catch (error) {

    console.error(
      "Payment history error:",
      error
    );

  }

}


// =====================================================
// CONTACT
// =====================================================

const contactButtons =
  document.querySelectorAll(
    '[data-screen="contact"]'
  );


contactButtons.forEach(
  function (button) {

    button.addEventListener(
      "click",
      function () {

        showScreen("contact");

      }
    );

  }
);


// =====================================================
// INITIAL PAGE
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    // Keep home visible initially
    const home =
      document.getElementById(
        "home"
      );

    const screens =
      document.querySelectorAll(
        ".screen"
      );


    if (home) {

      screens.forEach(
        function (screen) {

          screen.classList.remove(
            "active"
          );

          screen.style.display =
            "none";

        }
      );


      home.classList.add(
        "active"
      );

      home.style.display =
        "block";

    }

  }
);
