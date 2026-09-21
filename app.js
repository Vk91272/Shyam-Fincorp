const API_BASE = "https://shyam-fincorp.onrender.com";

let currentLoanAccountId = null;
let currentApplicationId = "";
let currentMobile = "";


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

      document
        .getElementById("requestedAmount")
        .focus();

    }
  );

}


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


      button.disabled = true;
      button.textContent = "Checking...";


      const payload = {

        full_name:
          document
            .getElementById("eligibilityName")
            .value.trim(),

        mobile:
          document
            .getElementById("eligibilityMobile")
            .value.trim(),

        /*
         * Backend currently expects these fields.
         * We use safe demo/default values here because
         * the simplified customer flow does not ask
         * these questions at the first stage.
         */

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

        button.disabled = false;
        button.textContent =
          "Check Eligibility";

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


        /*
         * Display result
         */

        document.getElementById(
          "inquiryId"
        ).textContent =
          data.inquiry_id || "-";


        document.getElementById(
          "estimatedRate"
        ).textContent =
          data.estimated_interest_rate || "-";


        document.getElementById(
          "estimatedEmi"
        ).textContent =
          formatMoney(
            data.estimated_emi
          );


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

          title.textContent =
            "Preliminary Result: Likely Eligible";

          message.textContent =
            data.eligibility_reason ||
            "Your preliminary eligibility looks positive.";

          if (resultIcon) {
            resultIcon.textContent = "✓";
          }

        }

        else if (
          data.eligibility_status ===
          "needs_review"
        ) {

          title.textContent =
            "Preliminary Result: Review Required";

          message.textContent =
            data.eligibility_reason ||
            "Your details require further review.";

          if (resultIcon) {
            resultIcon.textContent = "!";
          }

        }

        else {

          title.textContent =
            "Preliminary Result";

          message.textContent =
            data.eligibility_reason ||
            "The preliminary criteria were not met.";

          if (resultIcon) {
            resultIcon.textContent = "i";
          }

        }


        showEligibilityStep(3);


        document
          .getElementById("eligibility")
          .scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

      }

      catch (error) {

        alert(
          error.message ||
          "Unable to check eligibility."
        );

      }

      finally {

        button.disabled = false;

        button.textContent =
          "Check Eligibility";

      }

    }
  );

}


// =====================================================
// APPLY NOW / SCREEN NAVIGATION
// =====================================================

const applyNowButton = document.getElementById("applyNowButton");

if (applyNowButton) {
  applyNowButton.addEventListener("click", function (event) {
    event.preventDefault();

    const applicationSection = document.getElementById("loanApplication");
    if (!applicationSection) return;

    // Make sure the application section is visible even if an older CSS
    // version has a hidden-state rule.
    applicationSection.style.display = "block";
    applicationSection.hidden = false;

    applicationSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
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


      result.style.display = "block";

      result.className =
        "result-box";

      result.textContent =
        "Submitting application...";


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


        result.className =
          "result-box success";


        result.innerHTML = `
          <strong>Application submitted successfully!</strong>
          <br><br>
          Your Application ID:
          <strong>${data.application_id}</strong>
          <br><br>
          Please save this ID for future reference.
          <br><br>
          You can now upload your documents below.
        `;


        loanApplicationForm.reset();

        showDocumentUpload(
          data.application_id
        );

      }

      catch (error) {

        result.className =
          "result-box error";

        result.textContent =
          error.message ||
          "Unable to submit application.";

      }

    }
  );

}



// =====================================================
// DOCUMENT UPLOAD
// =====================================================

const documentUploadSection =
  document.getElementById("documentUploadSection");

const uploadDocumentsButton =
  document.getElementById("uploadDocumentsButton");

const documentApplicationId =
  document.getElementById("documentApplicationId");

const documentUploadMessage =
  document.getElementById("documentUploadMessage");

const documentUploadStatus =
  document.getElementById("documentUploadStatus");


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


function showDocumentUpload(applicationId) {

  if (!documentUploadSection) return;

  documentUploadSection.style.display = "block";

  if (documentApplicationId) {
    documentApplicationId.value = applicationId || "";
  }

  documentUploadSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


async function uploadSingleDocument(applicationId, config, file) {

  const uploadUrlResponse =
    await fetch(
      `${API_BASE}/api/documents/upload-url`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          application_id: applicationId,
          document_type: config.type,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size
        })
      }
    );


  const uploadData =
    await uploadUrlResponse.json();


  if (!uploadUrlResponse.ok) {
    throw new Error(
      uploadData.error ||
      `Could not prepare ${config.label} upload.`
    );
  }


  const uploadResponse =
    await fetch(
      uploadData.signedUrl,
      {
        method: "PUT",
        headers: {
          "Content-Type": file.type
        },
        body: file
      }
    );


  if (!uploadResponse.ok) {
    throw new Error(
      `${config.label} upload failed.`
    );
  }


  const recordResponse =
    await fetch(
      `${API_BASE}/api/documents/record`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          application_id: applicationId,
          document_type: config.type,
          file_name: file.name,
          storage_path: uploadData.path,
          file_type: file.type,
          file_size: file.size
        })
      }
    );


  const recordData =
    await recordResponse.json();


  if (!recordResponse.ok) {
    throw new Error(
      recordData.error ||
      `${config.label} record could not be saved.`
    );
  }

  return recordData;
}


if (uploadDocumentsButton) {

  uploadDocumentsButton.addEventListener(
    "click",
    async function () {

      const applicationId =
        documentApplicationId
          ? documentApplicationId.value.trim()
          : "";


      if (!applicationId) {

        showMessage(
          "documentUploadMessage",
          "Please submit your loan application first.",
          "error"
        );

        return;

      }


      const selectedFiles = [];


      DOCUMENT_UPLOADS.forEach(function (config) {

        const input =
          document.getElementById(config.id);

        const file =
          input && input.files
            ? input.files[0]
            : null;

        if (file) {
          selectedFiles.push({
            config,
            file
          });
        }

      });


      if (selectedFiles.length === 0) {

        showMessage(
          "documentUploadMessage",
          "Please select at least one document.",
          "error"
        );

        return;

      }


      uploadDocumentsButton.disabled = true;
      uploadDocumentsButton.textContent =
        "Uploading...";


      if (documentUploadStatus) {
        documentUploadStatus.style.display = "block";
        documentUploadStatus.className =
          "result-box";
        documentUploadStatus.textContent =
          "Document upload started...";
      }


      let successCount = 0;
      const failed = [];


      try {

        for (const item of selectedFiles) {

          if (documentUploadStatus) {
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

          }

          catch (error) {

            failed.push(
              `${item.config.label}: ${error.message}`
            );

          }

        }


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
              "All selected documents have been uploaded successfully. They are now pending verification.";
          }

        }

        else {

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
              failed
                .map(function (message) {
                  return message;
                })
                .join("<br>");
          }

        }


        selectedFiles.forEach(function (item) {

          const input =
            document.getElementById(item.config.id);

          if (input) {
            input.value = "";
          }

        });

      }

      catch (error) {

        showMessage(
          "documentUploadMessage",
          error.message ||
          "Document upload failed.",
          "error"
        );

      }

      finally {

        uploadDocumentsButton.disabled = false;
        uploadDocumentsButton.textContent =
          "Upload Documents";

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

          throw new Error(
            data.error ||
            "Active loan account not found."
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
    data.loan ||
    data.loan_account ||
    data;


  currentLoanAccountId =
    loan.id ||
    loan.loan_account_id ||
    data.loan_account_id;


  const accountNo =
    document.getElementById(
      "loanAccountNo"
    );

  if (accountNo) {
    accountNo.textContent =
      loan.loan_account_no || "-";
  }


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
  ).style.display =
    "block";


  const emiSchedule =
    data.emi_schedule ||
    data.schedule ||
    [];

  currentEmiSchedule =
    Array.isArray(emiSchedule)
      ? emiSchedule
      : [];

  updatePaymentSummary(
    emiSchedule
  );

  displayEmiSchedule(
    emiSchedule
  );

  const nextPending =
    currentEmiSchedule.find(function (emi) {

      const total =
        Number(emi.total_due || 0);

      const paid =
        Number(emi.paid_amount || 0);

      return (
        String(emi.status || "").toLowerCase() !== "paid" &&
        paid < total
      );

    });

  const paymentAmountInput =
    document.getElementById("paymentAmount");

  if (paymentAmountInput && nextPending) {

    paymentAmountInput.value =
      Number(nextPending.total_due || 0) -
      Number(nextPending.paid_amount || 0);

  }


  document.getElementById(
    "paymentSection"
  ).style.display =
    "block";


  document.getElementById(
    "paymentHistorySection"
  ).style.display =
    "block";


  refreshPaymentHistory();

}



// =====================================================
// PAYMENT SUMMARY
// =====================================================

function updatePaymentSummary(schedule) {

  const section =
    document.getElementById("paymentSummarySection");

  if (!section) return;

  const emiList =
    Array.isArray(schedule) ? schedule : [];

  if (emiList.length === 0) {
    section.style.display = "none";
    return;
  }

  let totalPayable = 0;
  let totalPaid = 0;
  let paidEmiCount = 0;
  let pendingEmiCount = 0;

  emiList.forEach(function (emi) {

    const totalDue = Number(emi.total_due || 0);
    const paidAmount = Number(emi.paid_amount || 0);

    const safePaid =
      Math.min(
        Math.max(paidAmount, 0),
        Math.max(totalDue, 0)
      );

    totalPayable += totalDue;
    totalPaid += safePaid;

    if (
      String(emi.status || "").toLowerCase() === "paid" ||
      (totalDue > 0 && safePaid >= totalDue)
    ) {
      paidEmiCount++;
    } else {
      pendingEmiCount++;
    }

  });

  const totalPending =
    Math.max(totalPayable - totalPaid, 0);

  const progress =
    totalPayable > 0
      ? Math.min((totalPaid / totalPayable) * 100, 100)
      : 0;

  const totalPayableElement =
    document.getElementById("totalPayableAmount");

  const totalPaidElement =
    document.getElementById("totalPaidAmount");

  const totalPendingElement =
    document.getElementById("totalPendingAmount");

  const paidEmiElement =
    document.getElementById("paidEmiCount");

  const pendingEmiElement =
    document.getElementById("pendingEmiCount");

  const progressElement =
    document.getElementById("paymentProgress");

  if (totalPayableElement) {
    totalPayableElement.textContent =
      formatMoney(totalPayable);
  }

  if (totalPaidElement) {
    totalPaidElement.textContent =
      formatMoney(totalPaid);
  }

  if (totalPendingElement) {
    totalPendingElement.textContent =
      formatMoney(totalPending);
  }

  if (paidEmiElement) {
    paidEmiElement.textContent =
      paidEmiCount;
  }

  if (pendingEmiElement) {
    pendingEmiElement.textContent =
      pendingEmiCount;
  }

  if (progressElement) {
    progressElement.textContent =
      progress.toFixed(1);
  }

  section.style.display = "block";
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


  section.style.display = "block";

}


// =====================================================
// DEMO PAYMENT
// =====================================================

let currentEmiSchedule = [];

function getNextPendingInstallment() {

  const pending =
    currentEmiSchedule.find(function (emi) {

      const total =
        Number(emi.total_due || 0);

      const paid =
        Number(emi.paid_amount || 0);

      return (
        String(emi.status || "").toLowerCase() !== "paid" &&
        paid < total
      );

    });

  return pending
    ? Number(pending.installment_no)
    : null;
}


const paymentForm =
  document.getElementById(
    "paymentForm"
  );


if (paymentForm) {

  paymentForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      if (!currentLoanAccountId) {

        showMessage(
          "paymentMessage",
          "Please view your loan first.",
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


      const nextInstallment =
        getNextPendingInstallment();

      if (!nextInstallment) {

        showMessage(
          "paymentMessage",
          "All EMI payments are already completed.",
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
                    currentMobile,

                  installment_no:
                    getNextPendingInstallment(),

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

        // Refresh loan/EMI data so Paid and Pending amounts update immediately.
        const lookupMobileElement =
          document.getElementById("lookupMobile");

        const lookupApplicationElement =
          document.getElementById("lookupApplicationId");

        if (
          lookupMobileElement &&
          lookupApplicationElement &&
          lookupMobileElement.value.trim() &&
          lookupApplicationElement.value.trim()
        ) {

          try {

            const refreshResponse =
              await fetch(
                `${API_BASE}/api/customer/loan`,
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json"
                  },

                  body: JSON.stringify({
                    mobile:
                      lookupMobileElement.value.trim(),

                    application_id:
                      lookupApplicationElement.value.trim()
                  })
                }
              );

            const refreshData =
              await refreshResponse.json();

            if (refreshResponse.ok) {
              displayLoan(refreshData);
            }

          }

          catch (refreshError) {
            console.error(
              "Loan summary refresh error:",
              refreshError
            );
          }

        }

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

    const response =
      await fetch(
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


    const data =
      await response.json();


    if (!response.ok) {
      return;
    }


    const payments =
      data.payments ||
      data ||
      [];


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


// =====================================================
// INITIAL STATE
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    showEligibilityStep(1);

  }
);