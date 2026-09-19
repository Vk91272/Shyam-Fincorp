const API_BASE = "https://shyam-fincorp.onrender.com";

let currentLoanAccountId = null;


// =====================================================
// HELPERS
// =====================================================

function formatMoney(value) {

  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });

}


function showMessage(elementId, message, type = "") {

  const element =
    document.getElementById(elementId);

  if (!element) return;

  element.textContent = message;

  element.className =
    "message " + type;

}


// =====================================================
// ELIGIBILITY
// =====================================================

const eligibilityForm =
  document.getElementById("eligibilityForm");

const nextStep1 =
  document.getElementById("nextStep1");

const backStep2 =
  document.getElementById("backStep2");

const eligibilityStep1 =
  document.getElementById("eligibilityStep1");

const eligibilityStep2 =
  document.getElementById("eligibilityStep2");

const eligibilityStep3 =
  document.getElementById("eligibilityStep3");

const progressBar =
  document.getElementById("progressBar");

const stepIndicator1 =
  document.getElementById("stepIndicator1");

const stepIndicator2 =
  document.getElementById("stepIndicator2");

const stepIndicator3 =
  document.getElementById("stepIndicator3");


function showEligibilityStep(step) {

  if (eligibilityStep1) {
    eligibilityStep1.classList.remove("active");
  }

  if (eligibilityStep2) {
    eligibilityStep2.classList.remove("active");
  }

  if (eligibilityStep3) {
    eligibilityStep3.classList.remove("active");
  }


  if (step === 1 && eligibilityStep1) {
    eligibilityStep1.classList.add("active");
  }

  if (step === 2 && eligibilityStep2) {
    eligibilityStep2.classList.add("active");
  }

  if (step === 3 && eligibilityStep3) {
    eligibilityStep3.classList.add("active");
  }


  if (stepIndicator1) {
    stepIndicator1.classList.toggle(
      "active",
      step >= 1
    );
  }

  if (stepIndicator2) {
    stepIndicator2.classList.toggle(
      "active",
      step >= 2
    );
  }

  if (stepIndicator3) {
    stepIndicator3.classList.toggle(
      "active",
      step >= 3
    );
  }


  if (progressBar) {

    const progress =
      step === 1
        ? 0
        : step === 2
        ? 50
        : 100;

    progressBar.style.width =
      progress + "%";

  }

}


if (nextStep1) {

  nextStep1.addEventListener(
    "click",
    function () {

      const name =
        document
          .getElementById("eligibilityName")
          ?.value
          .trim();

      const mobile =
        document
          .getElementById("eligibilityMobile")
          ?.value
          .trim();


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

    }
  );

}


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

if (eligibilityForm) {

  eligibilityForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      const fullName =
        document
          .getElementById("eligibilityName")
          ?.value
          .trim();

      const mobile =
        document
          .getElementById("eligibilityMobile")
          ?.value
          .trim();

      const requestedAmount =
        Number(
          document
            .getElementById("requestedAmount")
            ?.value || 0
        );

      const monthlyIncome =
        Number(
          document
            .getElementById("monthlyIncome")
            ?.value || 0
        );

      const tenure =
        Number(
          document
            .getElementById("eligibilityTenure")
            ?.value || 0
        );


      if (
        !fullName ||
        !/^[0-9]{10}$/.test(mobile) ||
        requestedAmount <= 0 ||
        monthlyIncome <= 0 ||
        tenure <= 0
      ) {

        alert(
          "Please enter all required details."
        );

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

        const response =
          await fetch(
            `${API_BASE}/api/eligibility`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({

                full_name:
                  fullName,

                mobile:
                  mobile,

                requested_amount:
                  requestedAmount,

                monthly_income:
                  monthlyIncome,

                tenure_months:
                  tenure,

                age: 30,

                employment_type:
                  "other",

                existing_emi:
                  0

              })

            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Eligibility check failed."
          );

        }


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

        const resultTitle =
          document.getElementById(
            "eligibilityTitle"
          );

        const resultMessage =
          document.getElementById(
            "eligibilityMessage"
          );


        if (estimatedEmi) {

          estimatedEmi.textContent =
            formatMoney(
              data.estimated_emi ||
              data.emi ||
              0
            );

        }


        if (estimatedRate) {

          estimatedRate.textContent =
            data.interest_rate ||
            data.rate ||
            0;

        }


        if (inquiryId) {

          inquiryId.textContent =
            data.inquiry_id ||
            "-";

        }


        if (resultTitle) {

          resultTitle.textContent =
            data.eligible
              ? "You may be eligible"
              : "Eligibility Result";

        }


        if (resultMessage) {

          resultMessage.textContent =
            data.message ||
            "Eligibility check completed.";

        }


        showEligibilityStep(3);

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


      const button =
        loanApplicationForm.querySelector(
          'button[type="submit"]'
        );


      const applicationResult =
        document.getElementById(
          "applicationResult"
        );


      const formData =
        new FormData(
          loanApplicationForm
        );


      const payload = {

        full_name:
          formData.get("full_name"),

        mobile:
          formData.get("mobile"),

        email:
          formData.get("email"),

        monthly_income:
          Number(
            formData.get(
              "monthly_income"
            ) || 0
          ),

        requested_amount:
          Number(
            formData.get(
              "requested_amount"
            ) || 0
          ),

        tenure_months:
          Number(
            formData.get(
              "tenure_months"
            ) || 0
          ),

        address:
          formData.get("address")

      };


      if (button) {

        button.disabled = true;

        button.textContent =
          "Submitting...";

      }


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
            data.message ||
            "Application submission failed."
          );

        }


        if (applicationResult) {

          applicationResult.style.display =
            "block";

          applicationResult.innerHTML = `
            <h3>Application Submitted</h3>

            <p>
              Your application has been
              submitted successfully.
            </p>

            <p>
              <strong>Application ID:</strong>
              ${data.application_id || "-"}
            </p>

            <p>
              Please save this Application ID
              for future reference.
            </p>
          `;

        }


        loanApplicationForm.reset();


        // Show document upload section
        showDocumentUpload(
          data.application_id
        );


      }

      catch (error) {

        if (applicationResult) {

          applicationResult.style.display =
            "block";

          applicationResult.innerHTML = `
            <p>
              ${error.message ||
              "Something went wrong."}
            </p>
          `;

        }

      }

      finally {

        if (button) {

          button.disabled = false;

          button.textContent =
            "Submit Application";

        }

      }

    }
  );

}


// =====================================================
// DOCUMENT UPLOAD
// =====================================================

function showDocumentUpload(
  applicationId
) {

  const section =
    document.getElementById(
      "documentUploadSection"
    );

  const applicationIdInput =
    document.getElementById(
      "documentApplicationId"
    );


  if (!section) return;


  if (applicationIdInput) {

    applicationIdInput.value =
      applicationId || "";

  }


  section.style.display =
    "block";


  section.scrollIntoView({
    behavior: "smooth"
  });

}


async function uploadSingleDocument(
  applicationId,
  file,
  documentType
) {

  if (!file) {

    throw new Error(
      `Please select ${documentType}.`
    );

  }


  const maxSize =
    5 * 1024 * 1024;


  if (file.size > maxSize) {

    throw new Error(
      `${documentType} must be less than 5 MB.`
    );

  }


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
      `${documentType} must be JPG, PNG or PDF.`
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

        body: JSON.stringify({

          application_id:
            applicationId,

          document_type:
            documentType,

          file_name:
            file.name,

          content_type:
            file.type

        })

      }
    );


  const urlData =
    await urlResponse.json();


  if (!urlResponse.ok) {

    throw new Error(
      urlData.message ||
      "Unable to create upload URL."
    );

  }


  const uploadResponse =
    await fetch(
      urlData.signed_url,
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
      `Upload failed for ${documentType}.`
    );

  }


  return true;

}


const uploadDocumentsButton =
  document.getElementById(
    "uploadDocumentsButton"
  );


if (uploadDocumentsButton) {

  uploadDocumentsButton.addEventListener(
    "click",
    async function () {

      const applicationId =
        document
          .getElementById(
            "documentApplicationId"
          )
          ?.value
          .trim();


      const messageElement =
        document.getElementById(
          "documentUploadMessage"
        );


      const statusElement =
        document.getElementById(
          "documentUploadStatus"
        );


      if (!applicationId) {

        showMessage(
          "documentUploadMessage",
          "Application ID is required.",
          "error"
        );

        return;

      }


      const documents = [

        {
          id: "identityProof",
          type: "identity-proof"
        },

        {
          id: "panCard",
          type: "pan-card"
        },

        {
          id: "addressProof",
          type: "address-proof"
        },

        {
          id: "incomeProof",
          type: "income-proof"
        },

        {
          id: "applicantPhoto",
          type: "applicant-photo"
        }

      ];


      uploadDocumentsButton.disabled =
        true;

      uploadDocumentsButton.textContent =
        "Uploading...";


      try {

        let uploadedCount = 0;


        for (
          const documentItem
          of documents
        ) {

          const input =
            document.getElementById(
              documentItem.id
            );


          const file =
            input?.files?.[0];


          if (!file) {

            continue;

          }


          await uploadSingleDocument(
            applicationId,
            file,
            documentItem.type
          );


          uploadedCount++;

        }


        if (uploadedCount === 0) {

          throw new Error(
            "Please select at least one document."
          );

        }


        if (messageElement) {

          messageElement.textContent =
            `${uploadedCount} document(s) uploaded successfully.`;

        }


        if (statusElement) {

          statusElement.style.display =
            "block";

          statusElement.innerHTML = `
            <p>
              Documents uploaded successfully.
            </p>

            <p>
              <strong>Application ID:</strong>
              ${applicationId}
            </p>
          `;

        }

      }

      catch (error) {

        if (messageElement) {

          messageElement.textContent =
            error.message ||
            "Document upload failed.";

        }

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


      const mobile =
        document
          .getElementById(
            "lookupMobile"
          )
          ?.value
          .trim();


      const applicationId =
        document
          .getElementById(
            "lookupApplicationId"
          )
          ?.value
          .trim();


      if (
        !/^[0-9]{10}$/.test(mobile)
      ) {

        showMessage(
          "lookupMessage",
          "Please enter a valid mobile number.",
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


      showMessage(
        "lookupMessage",
        "Loading your loan..."
      );


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

              body: JSON.stringify({

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
            "Loan details not found."
          );

        }


        displayLoan(data);


        showMessage(
          "lookupMessage",
          "Loan details loaded successfully.",
          "success"
        );


      }

      catch (error) {

        showMessage(
          "lookupMessage",
          error.message ||
          "Unable to load loan details.",
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
    data;


  currentLoanAccountId =
    loan.loan_account_id ||
    loan.id ||
    data.loan_account_id ||
    null;


  const loanSummarySection =
    document.getElementById(
      "loanSummarySection"
    );


  if (loanSummarySection) {

    loanSummarySection.style.display =
      "block";

  }


  const loanAccountNo =
    document.getElementById(
      "loanAccountNo"
    );

  const loanPrincipal =
    document.getElementById(
      "loanPrincipal"
    );

  const loanRate =
    document.getElementById(
      "loanRate"
    );

  const loanTenure =
    document.getElementById(
      "loanTenure"
    );

  const loanEmi =
    document.getElementById(
      "loanEmi"
    );

  const loanStatus =
    document.getElementById(
      "loanStatus"
    );


  if (loanAccountNo) {

    loanAccountNo.textContent =
      loan.loan_account_number ||
      loan.account_number ||
      "-";

  }


  if (loanPrincipal) {

    loanPrincipal.textContent =
      formatMoney(
        loan.principal_amount ||
        loan.loan_amount ||
        loan.principal ||
        0
      );

  }


  if (loanRate) {

    loanRate.textContent =
      loan.interest_rate ||
      loan.rate ||
      0;

  }


  if (loanTenure) {

    loanTenure.textContent =
      loan.tenure_months ||
      loan.tenure ||
      0;

  }


  if (loanEmi) {

    loanEmi.textContent =
      formatMoney(
        loan.emi_amount ||
        loan.emi ||
        0
      );

  }


  if (loanStatus) {

    loanStatus.textContent =
      loan.status ||
      "-";

  }


  const emiSchedule =
    data.emi_schedule ||
    data.schedule ||
    [];


  // PAYMENT SUMMARY
  updatePaymentSummary(
    emiSchedule
  );


  // EMI SCHEDULE
  displayEmiSchedule(
    emiSchedule
  );


  const paymentSection =
    document.getElementById(
      "paymentSection"
    );


  if (paymentSection) {

    paymentSection.style.display =
      "block";

  }


  refreshPaymentHistory();

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


  const emiList =
    Array.isArray(schedule)
      ? schedule
      : [];


  if (emiList.length === 0) {

    section.style.display =
      "none";

    return;

  }


  let totalPayable = 0;

  let totalPaid = 0;

  let paidEmiCount = 0;

  let pendingEmiCount = 0;


  emiList.forEach(
    function (emi) {

      const totalDue =
        Number(
          emi.total_due || 0
        );


      const paidAmount =
        Number(
          emi.paid_amount || 0
        );


      const safePaid =
        Math.min(
          Math.max(
            paidAmount,
            0
          ),
          Math.max(
            totalDue,
            0
          )
        );


      totalPayable +=
        totalDue;


      totalPaid +=
        safePaid;


      if (
        String(
          emi.status || ""
        ).toLowerCase() ===
          "paid" ||
        (
          totalDue > 0 &&
          safePaid >= totalDue
        )
      ) {

        paidEmiCount++;

      }

      else {

        pendingEmiCount++;

      }

    }
  );


  const totalPending =
    Math.max(
      totalPayable -
      totalPaid,
      0
    );


  const progress =
    totalPayable > 0
      ? Math.min(
          (
            totalPaid /
            totalPayable
          ) * 100,
          100
        )
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

  const paidEmiElement =
    document.getElementById(
      "paidEmiCount"
    );

  const pendingEmiElement =
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
        totalPending
      );

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


  section.style.display =
    "block";

}


// =====================================================
// EMI SCHEDULE
// =====================================================

function displayEmiSchedule(
  schedule
) {

  const section =
    document.getElementById(
      "emiScheduleSection"
    );


  const tableBody =
    document.getElementById(
      "emiTableBody"
    );


  if (!section || !tableBody) {
    return;
  }


  tableBody.innerHTML = "";


  if (
    !Array.isArray(schedule) ||
    schedule.length === 0
  ) {

    section.style.display =
      "none";

    return;

  }


  schedule.forEach(
    function (emi) {

      const row =
        document.createElement(
          "tr"
        );


      const dueDate =
        emi.due_date
          ? new Date(
              emi.due_date
            ).toLocaleDateString(
              "en-IN"
            )
          : "-";


      const principal =
        Number(
          emi.principal_component ||
          emi.principal ||
          0
        );


      const interest =
        Number(
          emi.interest_component ||
          emi.interest ||
          0
        );


      const total =
        Number(
          emi.total_due ||
          emi.total ||
          0
        );


      const paid =
        Number(
          emi.paid_amount ||
          0
        );


      const status =
        emi.status ||
        (
          paid >= total
            ? "paid"
            : "pending"
        );


      row.innerHTML = `

        <td>
          ${emi.emi_number || emi.installment_number || "-"}
        </td>

        <td>
          ${dueDate}
        </td>

        <td>
          ₹${formatMoney(principal)}
        </td>

        <td>
          ₹${formatMoney(interest)}
        </td>

        <td>
          ₹${formatMoney(total)}
        </td>

        <td>
          ₹${formatMoney(paid)}
        </td>

        <td>
          ${status}
        </td>

      `;


      tableBody.appendChild(
        row
      );

    }
  );


  section.style.display =
    "block";

}


// =====================================================
// PAYMENT
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


      if (!currentLoanAccountId) {

        showMessage(
          "paymentMessage",
          "Please load your loan first.",
          "error"
        );

        return;

      }


      const amount =
        Number(
          document
            .getElementById(
              "paymentAmount"
            )
            ?.value || 0
        );


      const paymentMethod =
        document
          .getElementById(
            "paymentMethod"
          )
          ?.value ||
        "demo";


      if (amount <= 0) {

        showMessage(
          "paymentMessage",
          "Please enter a valid payment amount.",
          "error"
        );

        return;

      }


      const button =
        paymentForm.querySelector(
          'button[type="submit"]'
        );


      if (button) {

        button.disabled =
          true;

        button.textContent =
          "Processing...";

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

              body: JSON.stringify({

                loan_account_id:
                  currentLoanAccountId,

                amount:
                  amount,

                payment_method:
                  paymentMethod

              })

            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Payment failed."
          );

        }


        showMessage(
          "paymentMessage",
          data.message ||
          "Payment successful.",
          "success"
        );


        const paymentAmountInput =
          document.getElementById(
            "paymentAmount"
          );


        if (paymentAmountInput) {

          paymentAmountInput.value =
            "";

        }


        // Refresh payment history
        refreshPaymentHistory();


        // Refresh loan/EMI data so
        // Paid and Pending amounts
        // update immediately.
        const lookupMobileElement =
          document.getElementById(
            "lookupMobile"
          );

        const lookupApplicationElement =
          document.getElementById(
            "lookupApplicationId"
          );


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

              displayLoan(
                refreshData
              );

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

      finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            "Pay EMI";

        }

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


  const section =
    document.getElementById(
      "paymentHistorySection"
    );


  const tableBody =
    document.getElementById(
      "paymentHistoryBody"
    );


  if (!section || !tableBody) {
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

          body: JSON.stringify({

            loan_account_id:
              currentLoanAccountId

          })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to load payment history."
      );

    }


    const payments =
      data.payments ||
      data.payment_history ||
      [];


    tableBody.innerHTML = "";


    if (
      !Array.isArray(payments) ||
      payments.length === 0
    ) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="5">
            No payments found.
          </td>
        </tr>
      `;

      section.style.display =
        "block";

      return;

    }


    payments.forEach(
      function (payment) {

        const row =
          document.createElement(
            "tr"
          );


        const date =
          payment.created_at
            ? new Date(
                payment.created_at
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


        tableBody.appendChild(
          row
        );

      }
    );


    section.style.display =
      "block";

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

showEligibilityStep(1);
