const API_BASE = "https://shyam-fincorp.onrender.com";

let currentApplicationId =
  localStorage.getItem("shyam_application_id") || "";

let currentMobile =
  localStorage.getItem("shyam_mobile") || "";

let currentLoan = null;

/* =========================
   BASIC HELPERS
========================= */

function $(id) {
  return document.getElementById(id);
}

function money(value) {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });
}

function showMessage(id, message, type = "info") {
  const element = $(id);

  if (!element) return;

  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = "block";
}

function hideMessage(id) {
  const element = $(id);

  if (!element) return;

  element.style.display = "none";
}

function hideAllScreens() {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });
}

function openScreen(id) {
  hideAllScreens();

  const screen = $(id);

  if (screen) {
    screen.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (history.replaceState) {
    history.replaceState(null, "", `#${id}`);
  }
}

function getValue(object, keys, fallback = "") {
  if (!object) return fallback;

  for (const key of keys) {
    if (
      object[key] !== undefined &&
      object[key] !== null &&
      object[key] !== ""
    ) {
      return object[key];
    }
  }

  return fallback;
}

async function getJson(response) {
  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(
      `Server returned invalid response (${response.status})`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      `Request failed (${response.status})`
    );
  }

  return data;
}


/* =========================
   NAVIGATION
========================= */

function setupNavigation() {
  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();

      const screen = button.getAttribute("data-screen");

      if (screen) {
        openScreen(screen);
      }
    });
  });

  document.querySelectorAll("a[href^='#']").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = link.getAttribute("href");

      if (!target || target === "#") return;

      const screen = target.substring(1);

      if ($(screen)) {
        event.preventDefault();
        openScreen(screen);
      }
    });
  });
}


/* =========================
   MOBILE MENU
========================= */

function setupMobileMenu() {
  const menuButton =
    document.querySelector(".menu-toggle") ||
    document.querySelector("#menuToggle");

  const nav =
    document.querySelector(".nav-links") ||
    document.querySelector("nav");

  if (!menuButton || !nav) return;

  menuButton.addEventListener("click", () => {
    nav.classList.toggle("open");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
    });
  });
}


/* =========================
   ELIGIBILITY
========================= */

function setupEligibility() {
  const form = $("eligibilityForm");

  if (!form) return;

  const step1 = $("eligibilityStep1");
  const step2 = $("eligibilityStep2");
  const result = $("eligibilityResult");

  const nextButton = $("eligNext");
  const backButton = $("eligBack");

  if (nextButton) {
    nextButton.addEventListener("click", () => {

      const name = $("eligName")?.value.trim();
      const mobile = $("eligMobile")?.value.trim();
      const age = Number($("eligAge")?.value);

      if (!name) {
        alert("Please enter your full name.");
        return;
      }

      if (!/^[6-9]\d{9}$/.test(mobile)) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
      }

      if (!age || age < 18 || age > 80) {
        alert("Age must be between 18 and 80 years.");
        return;
      }

      if (step1) step1.style.display = "none";
      if (step2) step2.style.display = "block";
    });
  }

  if (backButton) {
    backButton.addEventListener("click", () => {
      if (step2) step2.style.display = "none";
      if (step1) step1.style.display = "block";
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = $("eligName")?.value.trim();
    const mobile = $("eligMobile")?.value.trim();
    const age = Number($("eligAge")?.value);

    const employment =
      $("eligEmployment")?.value || "";

    const income =
      Number($("eligIncome")?.value);

    const existingEmi =
      Number($("eligExistingEmi")?.value || 0);

    const amount =
      Number($("eligAmount")?.value);

    const tenure =
      Number($("eligTenure")?.value);

    if (!name || !mobile || !age) {
      alert("Please complete your basic details.");
      return;
    }

    if (!employment) {
      alert("Please select employment type.");
      return;
    }

    if (!income || income <= 0) {
      alert("Please enter monthly income.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Please enter requested loan amount.");
      return;
    }

    if (!tenure || tenure <= 0) {
      alert("Please select loan tenure.");
      return;
    }

    const submitButton =
      form.querySelector("button[type='submit']");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Checking...";
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
            mobile,
            age,
            employment_type: employment,
            monthly_income: income,
            existing_emi: existingEmi,
            requested_amount: amount,
            tenure_months: tenure
          })
        }
      );

      const data = await getJson(response);

      const inquiry =
        data.inquiry ||
        data.result ||
        data;

      window.eligibilityData = inquiry;

      if (step1) step1.style.display = "none";
      if (step2) step2.style.display = "none";
      if (result) result.style.display = "block";

      const status =
        getValue(
          inquiry,
          ["eligibility_status", "status"],
          "under_review"
        );

      const reason =
        getValue(
          inquiry,
          ["eligibility_reason", "reason"],
          "Your inquiry has been received."
        );

      const inquiryId =
        getValue(
          inquiry,
          ["inquiry_id", "id"],
          "-"
        );

      const rate =
        Number(
          getValue(
            inquiry,
            ["estimated_interest_rate", "interest_rate"],
            12
          )
        );

      const emi =
        Number(
          getValue(
            inquiry,
            ["estimated_emi", "emi"],
            0
          )
        );

      const statusElement =
        $("eligibilityStatus");

      const reasonElement =
        $("eligibilityReason");

      const inquiryElement =
        $("eligibilityInquiryId");

      const rateElement =
        $("eligibilityRate");

      const emiElement =
        $("eligibilityEmi");

      if (statusElement) {
        statusElement.textContent =
          String(status)
            .replace(/_/g, " ")
            .toUpperCase();
      }

      if (reasonElement) {
        reasonElement.textContent = reason;
      }

      if (inquiryElement) {
        inquiryElement.textContent = inquiryId;
      }

      if (rateElement) {
        rateElement.textContent =
          `${rate}% p.a.`;
      }

      if (emiElement) {
        emiElement.textContent =
          money(emi);
      }

    } catch (error) {

      console.error("Eligibility error:", error);

      alert(
        error.message ||
        "Unable to check eligibility. Please try again."
      );

    } finally {

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Check Eligibility";
      }
    }
  });


  /* Continue to Loan Application */

  const continueButton =
    document.querySelector(
      "#eligibilityResult button"
    );

  if (continueButton) {

    continueButton.addEventListener("click", () => {

      const data =
        window.eligibilityData || {};

      if ($("appName")) {
        $("appName").value =
          getValue(
            data,
            ["full_name", "name"],
            $("eligName")?.value || ""
          );
      }

      if ($("appMobile")) {
        $("appMobile").value =
          getValue(
            data,
            ["mobile"],
            $("eligMobile")?.value || ""
          );
      }

      if ($("appIncome")) {
        $("appIncome").value =
          getValue(
            data,
            ["monthly_income"],
            $("eligIncome")?.value || ""
          );
      }

      if ($("appAmount")) {
        $("appAmount").value =
          getValue(
            data,
            ["requested_amount"],
            $("eligAmount")?.value || ""
          );
      }

      if ($("appTenure")) {
        $("appTenure").value =
          getValue(
            data,
            ["tenure_months"],
            $("eligTenure")?.value || ""
          );
      }

      openScreen("apply");
    });
  }
}


/* =========================
   LOAN APPLICATION
========================= */

function setupLoanApplication() {

  const form = $("loanForm");

  if (!form) return;

  form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const fullName =
      $("appName")?.value.trim();

    const mobile =
      $("appMobile")?.value.trim();

    const email =
      $("appEmail")?.value.trim();

    const monthlyIncome =
      Number($("appIncome")?.value);

    const requestedAmount =
      Number($("appAmount")?.value);

    const tenureMonths =
      Number($("appTenure")?.value);

    const address =
      $("appAddress")?.value.trim();

    if (!fullName) {
      alert("Please enter your full name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!monthlyIncome || monthlyIncome <= 0) {
      alert("Please enter monthly income.");
      return;
    }

    if (!requestedAmount || requestedAmount <= 0) {
      alert("Please enter requested loan amount.");
      return;
    }

    if (!tenureMonths || tenureMonths <= 0) {
      alert("Please select tenure.");
      return;
    }

    if (!address) {
      alert("Please enter your address.");
      return;
    }

    const submitButton =
      form.querySelector("button[type='submit']");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    hideMessage("applicationMessage");

    try {

      const response =
        await fetch(
          `${API_BASE}/api/applications`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              full_name: fullName,
              mobile,
              email,
              monthly_income: monthlyIncome,
              requested_amount: requestedAmount,
              tenure_months: tenureMonths,
              address
            })
          }
        );

      const data =
        await getJson(response);

      const applicationId =
        getValue(
          data,
          ["application_id"],
          ""
        ) ||
        getValue(
          data.application,
          ["application_id"],
          ""
        );

      if (!applicationId) {
        throw new Error(
          "Application ID was not received from server."
        );
      }

      currentApplicationId =
        applicationId;

      currentMobile =
        mobile;

      localStorage.setItem(
        "shyam_application_id",
        currentApplicationId
      );

      localStorage.setItem(
        "shyam_mobile",
        currentMobile
      );

      const documentApplication =
        $("documentApplicationId");

      if (documentApplication) {
        documentApplication.value =
          applicationId;
      }

      showMessage(
        "applicationMessage",
        `Application submitted successfully. Application ID: ${applicationId}`,
        "success"
      );

      setTimeout(() => {
        openScreen("documents");
      }, 900);

    } catch (error) {

      console.error("Application error:", error);

      showMessage(
        "applicationMessage",
        error.message ||
        "Unable to submit application.",
        "error"
      );

    } finally {

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Loan Application";
      }
    }
  });
}


/* =========================
   DOCUMENT UPLOAD
========================= */

function setupDocuments() {

  const form =
    $("documentForm");

  if (!form) return;

  const applicationInput =
    $("documentApplicationId");

  if (
    applicationInput &&
    currentApplicationId
  ) {
    applicationInput.value =
      currentApplicationId;
  }

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const applicationId =
        $("documentApplicationId")
          ?.value.trim();

      const documentType =
        $("documentType")
          ?.value;

      const file =
        $("documentFile")
          ?.files?.[0];

      if (!applicationId) {
        alert("Please enter application ID.");
        return;
      }

      if (!documentType) {
        alert("Please select document type.");
        return;
      }

      if (!file) {
        alert("Please select a document.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("Maximum file size is 5 MB.");
        return;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "application/pdf"
      ];

      if (!allowedTypes.includes(file.type)) {
        alert(
          "Only JPG, PNG and PDF files are allowed."
        );
        return;
      }

      const button =
        form.querySelector(
          "button[type='submit']"
        );

      if (button) {
        button.disabled = true;
        button.textContent = "Uploading...";
      }

      hideMessage("documentMessage");

      try {

        currentApplicationId =
          applicationId;

        localStorage.setItem(
          "shyam_application_id",
          applicationId
        );

        const mobile =
          currentMobile ||
          localStorage.getItem("shyam_mobile") ||
          $("appMobile")?.value.trim() ||
          "";

        const urlResponse =
          await fetch(
            `${API_BASE}/api/documents/upload-url`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                application_id: applicationId,
                document_type: documentType,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size
              })
            }
          );

        const uploadData =
          await getJson(urlResponse);

        const signedUrl =
          getValue(
            uploadData,
            [
              "signed_url",
              "upload_url",
              "url"
            ],
            ""
          ) ||
          getValue(
            uploadData.data,
            [
              "signed_url",
              "upload_url",
              "url"
            ],
            ""
          );

        if (!signedUrl) {
          throw new Error(
            "Upload URL was not received."
          );
        }

        const uploadResponse =
          await fetch(
            signedUrl,
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
            "File upload failed."
          );
        }

        const path =
          getValue(
            uploadData,
            ["path", "file_path"],
            ""
          ) ||
          getValue(
            uploadData.data,
            ["path", "file_path"],
            ""
          );

        try {

          await fetch(
            `${API_BASE}/api/documents/record`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                application_id: applicationId,
                document_type: documentType,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                path
              })
            }
          );

        } catch (recordError) {

          console.warn(
            "Document record warning:",
            recordError
          );
        }

        showMessage(
          "documentMessage",
          "Document uploaded successfully.",
          "success"
        );

        form.reset();

        if ($("documentApplicationId")) {
          $("documentApplicationId").value =
            applicationId;
        }

        setTimeout(() => {
          openScreen("myloan");
          ensureApplicationIdField();
        }, 900);

      } catch (error) {

        console.error(
          "Document upload error:",
          error
        );

        showMessage(
          "documentMessage",
          error.message ||
          "Unable to upload document.",
          "error"
        );

      } finally {

        if (button) {
          button.disabled = false;
          button.textContent = "Upload Document";
        }
      }
    }
  );
}


/* =========================
   MY LOAN
========================= */

function ensureApplicationIdField() {

  const portal =
    document.querySelector(
      "#myloan .portal-login"
    );

  if (!portal) return;

  if ($("loanApplicationId")) {

    $("loanApplicationId").value =
      currentApplicationId ||
      localStorage.getItem(
        "shyam_application_id"
      ) ||
      "";

    return;
  }

  const mobileInput =
    $("loanMobile");

  if (!mobileInput) return;

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "form-group";

  wrapper.innerHTML = `
    <label for="loanApplicationId">
      Application ID
    </label>

    <input
      type="text"
      id="loanApplicationId"
      placeholder="Enter Application ID e.g. SFL-12345678"
      autocomplete="off"
    />
  `;

  mobileInput.parentElement?.insertAdjacentElement(
    "beforebegin",
    wrapper
  );

  if ($("loanApplicationId")) {
    $("loanApplicationId").value =
      currentApplicationId ||
      localStorage.getItem(
        "shyam_application_id"
      ) ||
      "";
  }
}

function setupMyLoan() {

  ensureApplicationIdField();

  const button =
    $("loadLoanBtn");

  if (!button) return;

  button.addEventListener(
    "click",
    loadCustomerLoan
  );

  const mobileInput =
    $("loanMobile");

  if (
    mobileInput &&
    currentMobile
  ) {
    mobileInput.value =
      currentMobile;
  }
}

async function loadCustomerLoan() {

  ensureApplicationIdField();

  const applicationId =
    $("loanApplicationId")
      ?.value.trim() ||
    currentApplicationId ||
    localStorage.getItem(
      "shyam_application_id"
    ) ||
    "";

  const mobile =
    $("loanMobile")
      ?.value.trim() ||
    currentMobile ||
    localStorage.getItem(
      "shyam_mobile"
    ) ||
    "";

  if (!applicationId) {
    showMessage(
      "loanMessage",
      "Please enter your Application ID.",
      "error"
    );
    return;
  }

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    showMessage(
      "loanMessage",
      "Please enter a valid registered mobile number.",
      "error"
    );
    return;
  }

  const button =
    $("loadLoanBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Loading...";
  }

  try {

    currentApplicationId =
      applicationId;

    currentMobile =
      mobile;

    localStorage.setItem(
      "shyam_application_id",
      applicationId
    );

    localStorage.setItem(
      "shyam_mobile",
      mobile
    );

    const response =
      await fetch(
        `${API_BASE}/api/customer/loan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            application_id: applicationId,
            mobile
          })
        }
      );

    const data =
      await getJson(response);

    displayLoan(data);

    hideMessage("loanMessage");

    openScreen("dashboard");

  } catch (error) {

    console.error(
      "Customer loan error:",
      error
    );

    showMessage(
      "loanMessage",
      error.message ||
      "Loan details could not be loaded.",
      "error"
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = "View My Loan";
    }
  }
}


/* =========================
   DISPLAY LOAN
========================= */

function displayLoan(data) {

  currentLoan =
    data.loan ||
    data.loan_account ||
    data.account ||
    data;

  const loan =
    currentLoan || {};

  const accountNo =
    getValue(
      loan,
      [
        "loan_account_no",
        "loanAccountNo",
        "account_no"
      ],
      "-"
    );

  const applicationId =
    getValue(
      loan,
      [
        "application_id"
      ],
      currentApplicationId
    );

  const customerName =
    getValue(
      loan,
      [
        "customer_name",
        "full_name",
        "name"
      ],
      "Customer"
    );

  const principal =
    Number(
      getValue(
        loan,
        [
          "principal",
          "loan_amount",
          "amount",
          "requested_amount"
        ],
        0
      )
    );

  const emi =
    Number(
      getValue(
        loan,
        [
          "emi_amount",
          "emi",
          "monthly_emi"
        ],
        0
      )
    );

  const tenure =
    Number(
      getValue(
        loan,
        [
          "tenure_months",
          "tenure"
        ],
        0
      )
    );

  const rate =
    Number(
      getValue(
        loan,
        [
          "annual_interest_rate",
          "interest_rate",
          "rate"
        ],
        0
      )
    );

  const status =
    getValue(
      loan,
      [
        "status",
        "loan_status"
      ],
      "active"
    );

  const outstanding =
    Number(
      getValue(
        loan,
        [
          "outstanding_amount",
          "outstanding",
          "balance",
          "remaining_amount"
        ],
        0
      )
    );

  if ($("displayLoanAccount")) {
    $("displayLoanAccount").textContent =
      accountNo;
  }

  if ($("displayCustomerName")) {
    $("displayCustomerName").textContent =
      customerName;
  }

  if ($("displayLoanAmount")) {
    $("displayLoanAmount").textContent =
      money(principal);
  }

  if ($("displayEmi")) {
    $("displayEmi").textContent =
      money(emi);
  }

  if ($("displayTenure")) {
    $("displayTenure").textContent =
      `${tenure} Months`;
  }

  if ($("displayOutstanding")) {
    $("displayOutstanding").textContent =
      money(outstanding);
  }

  if ($("displayLoanStatus")) {
    $("displayLoanStatus").textContent =
      String(status)
        .replace(/_/g, " ")
        .toUpperCase();
  }

  if ($("dashboardWelcomeName")) {
    $("dashboardWelcomeName").textContent =
      customerName;
  }

  if ($("dashboardAccountPill")) {
    $("dashboardAccountPill").textContent =
      accountNo;
  }

  if ($("paymentSummaryAmount")) {
    $("paymentSummaryAmount").textContent =
      money(emi);
  }

  const schedule =
    data.emi_schedule ||
    data.schedule ||
    loan.emi_schedule ||
    loan.schedule ||
    [];

  renderSchedule(schedule);

  /*
    IMPORTANT:
    Payment History ko direct loan response se
    render karne ke bajay API se separately load
    kar rahe hain.
  */

  loadPaymentHistory();
}


/* =========================
   EMI SCHEDULE
========================= */

function renderSchedule(schedule) {

  const container =
    $("emiScheduleContainer");

  if (!container) return;

  if (!Array.isArray(schedule) ||
      schedule.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        EMI schedule is not available yet.
      </div>
    `;

    fillPaymentInstallments([]);

    return;
  }

  let pendingTotal = 0;

  const rows =
    schedule.map((item, index) => {

      const installment =
        getValue(
          item,
          [
            "installment_no",
            "installment",
            "emi_no",
            "number"
          ],
          index + 1
        );

      const principalDue =
        Number(
          getValue(
            item,
            [
              "principal_due",
              "principal"
            ],
            0
          )
        );

      const interestDue =
        Number(
          getValue(
            item,
            [
              "interest_due",
              "interest"
            ],
            0
          )
        );

      const totalDue =
        Number(
          getValue(
            item,
            [
              "total_due",
              "emi_amount",
              "amount",
              "emi"
            ],
            principalDue + interestDue
          )
        );

      const paidAmount =
        Number(
          getValue(
            item,
            [
              "paid_amount",
              "amount_paid"
            ],
            0
          )
        );

      const status =
        String(
          getValue(
            item,
            ["status"],
            paidAmount > 0
              ? "paid"
              : "pending"
          )
        ).toLowerCase();

      const dueDate =
        getValue(
          item,
          [
            "due_date",
            "date"
          ],
          ""
        );

      if (
        status !== "paid" &&
        status !== "completed"
      ) {
        pendingTotal +=
          Math.max(
            totalDue - paidAmount,
            0
          );
      }

      let statusClass =
        "pending";

      if (
        status === "paid" ||
        status === "completed"
      ) {
        statusClass = "paid";
      }

      if (
        status === "overdue"
      ) {
        statusClass = "overdue";
      }

      let formattedDate = "-";

      if (dueDate) {

        const parsedDate =
          new Date(dueDate);

        if (!Number.isNaN(
          parsedDate.getTime()
        )) {

          formattedDate =
            parsedDate.toLocaleDateString(
              "en-IN"
            );
        }
      }

      return `
        <div class="emi-row">

          <div>
            <strong>
              EMI ${installment}
            </strong>

            <small>
              Due: ${formattedDate}
            </small>
          </div>

          <div>
            <small>Principal</small>
            <strong>
              ${money(principalDue)}
            </strong>
          </div>

          <div>
            <small>Interest</small>
            <strong>
              ${money(interestDue)}
            </strong>
          </div>

          <div>
            <small>Total</small>
            <strong>
              ${money(totalDue)}
            </strong>
          </div>

          <div>
            <span class="status ${statusClass}">
              ${status.toUpperCase()}
            </span>
          </div>

        </div>
      `;
    });

  container.innerHTML =
    rows.join("");

  fillPaymentInstallments(schedule);
}


/* =========================
   PAYMENT INSTALLMENT
========================= */

function fillPaymentInstallments(
  schedule
) {

  const select =
    $("paymentInstallment");

  const amountInput =
    $("paymentAmount");

  if (!select) return;

  select.innerHTML = "";

  const pending =
    Array.isArray(schedule)
      ? schedule.filter((item) => {

          const status =
            String(
              getValue(
                item,
                ["status"],
                ""
              )
            ).toLowerCase();

          const paid =
            Number(
              getValue(
                item,
                [
                  "paid_amount",
                  "amount_paid"
                ],
                0
              )
            );

          return (
            status !== "paid" &&
            status !== "completed" &&
            paid <
              Number(
                getValue(
                  item,
                  [
                    "total_due",
                    "emi_amount",
                    "amount",
                    "emi"
                  ],
                  0
                )
              )
          );
        })
      : [];

  if (!pending.length) {

    const option =
      document.createElement("option");

    option.value = "";

    option.textContent =
      "No pending EMI";

    select.appendChild(option);

    if (amountInput) {
      amountInput.value = "";
    }

    return;
  }

  pending.forEach((item, index) => {

    const installment =
      getValue(
        item,
        [
          "installment_no",
          "installment",
          "emi_no",
          "number"
        ],
        index + 1
      );

    const amount =
      Number(
        getValue(
          item,
          [
            "total_due",
            "emi_amount",
            "amount",
            "emi"
          ],
          0
        )
      );

    const paid =
      Number(
        getValue(
          item,
          [
            "paid_amount",
            "amount_paid"
          ],
          0
        )
      );

    const remaining =
      Math.max(
        amount - paid,
        0
      );

    const option =
      document.createElement("option");

    option.value =
      installment;

    option.dataset.amount =
      remaining;

    option.textContent =
      `EMI ${installment} - ${money(remaining)}`;

    select.appendChild(option);
  });

  const updateAmount = () => {

    const selected =
      select.options[
        select.selectedIndex
      ];

    if (!selected) return;

    const amount =
      selected.dataset.amount || "";

    if (amountInput) {
      amountInput.value =
        amount;
    }
  };

  /*
    onChange assign kar rahe hain,
    addEventListener nahi,
    taaki repeated loan loading par
    multiple listeners na bane.
  */

  select.onchange =
    updateAmount;

  updateAmount();
}


/* =========================
   PAYMENT
========================= */

function setupPayment() {

  const form =
    $("paymentForm");

  if (!form) return;

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const installment =
        $("paymentInstallment")
          ?.value;

      const amount =
        Number(
          $("paymentAmount")
            ?.value
        );

      const paymentMode =
        $("paymentMode")
          ?.value ||
        "online";

      const applicationId =
        currentApplicationId ||
        localStorage.getItem(
          "shyam_application_id"
        );

      const mobile =
        currentMobile ||
        localStorage.getItem(
          "shyam_mobile"
        );

      if (!applicationId) {

        showMessage(
          "paymentMessage",
          "Application ID is missing.",
          "error"
        );

        return;
      }

      if (!mobile) {

        showMessage(
          "paymentMessage",
          "Registered mobile number is missing.",
          "error"
        );

        return;
      }

      if (!installment) {

        showMessage(
          "paymentMessage",
          "Please select an EMI.",
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

      const button =
        form.querySelector(
          "button[type='submit']"
        );

      if (button) {
        button.disabled = true;
        button.textContent = "Processing...";
      }

      hideMessage("paymentMessage");

      try {

        const loanAccountId =
          getValue(
            currentLoan,
            [
              "loan_account_id",
              "loan_account_no",
              "id"
            ],
            ""
          );

        const response =
          await fetch(
            `${API_BASE}/api/customer/pay-emi-test`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                application_id:
                  applicationId,

                loan_account_id:
                  loanAccountId,

                mobile,

                installment_no:
                  installment,

                amount,

                payment_method:
                  paymentMode
              })
            }
          );

        const data =
          await getJson(response);

        showMessage(
          "paymentMessage",
          getValue(
            data,
            [
              "message"
            ],
            "Payment recorded successfully."
          ),
          "success"
        );

        /*
          Payment successful hone ke baad
          loan + EMI schedule + payment history
          dobara load hoga.
        */

        setTimeout(() => {
          loadCustomerLoan();
        }, 700);

      } catch (error) {

        console.error(
          "Payment error:",
          error
        );

        showMessage(
          "paymentMessage",
          error.message ||
          "Payment could not be processed.",
          "error"
        );

      } finally {

        if (button) {
          button.disabled = false;
          button.textContent = "Pay EMI";
        }
      }
    }
  );
}


/* =========================
   PAYMENT HISTORY
========================= */

async function loadPaymentHistory() {

  const applicationId =
    currentApplicationId ||
    localStorage.getItem(
      "shyam_application_id"
    );

  const mobile =
    currentMobile ||
    localStorage.getItem(
      "shyam_mobile"
    );

  if (!applicationId || !mobile) {
    renderPaymentHistory([]);
    return;
  }

  const container =
    $("paymentHistoryContainer");

  if (container) {

    container.innerHTML = `
      <div class="loading-state">
        Loading payment history...
      </div>
    `;
  }

  try {

    const response =
      await fetch(
        `${API_BASE}/api/customer/payment-history`,
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

    const data =
      await getJson(response);

    /*
      Backend agar direct array return kare
      ya object return kare, dono handle honge.
    */

    let history = [];

    if (Array.isArray(data)) {

      history = data;

    } else if (
      Array.isArray(
        data.payment_history
      )
    ) {

      history =
        data.payment_history;

    } else if (
      Array.isArray(
        data.payments
      )
    ) {

      history =
        data.payments;

    } else if (
      Array.isArray(
        data.history
      )
    ) {

      history =
        data.history;

    } else if (
      Array.isArray(
        data.data
      )
    ) {

      history =
        data.data;
    }

    renderPaymentHistory(history);

  } catch (error) {

    console.warn(
      "Payment history error:",
      error
    );

    if (container) {

      container.innerHTML = `
        <div class="empty-state">
          Payment history could not be loaded.
        </div>
      `;
    }
  }
}


/* =========================
   RENDER PAYMENT HISTORY
========================= */

function renderPaymentHistory(
  history
) {

  const container =
    $("paymentHistoryContainer");

  if (!container) return;

  if (
    !Array.isArray(history) ||
    history.length === 0
  ) {

    container.innerHTML = `
      <div class="empty-state">
        No payment history available.
      </div>
    `;

    return;
  }

  container.innerHTML =
    history.map(
      (payment, index) => {

        const amount =
          Number(
            getValue(
              payment,
              [
                "amount",
                "paid_amount"
              ],
              0
            )
          );

        const installment =
          getValue(
            payment,
            [
              "installment_no",
              "installment",
              "emi_no"
            ],
            "-"
          );

        const mode =
          getValue(
            payment,
            [
              "payment_method",
              "payment_mode",
              "mode"
            ],
            "-"
          );

        const status =
          getValue(
            payment,
            [
              "status",
              "payment_status"
            ],
            "success"
          );

        const transactionId =
          getValue(
            payment,
            [
              "transaction_reference",
              "transaction_id",
              "payment_id",
              "reference"
            ],
            "-"
          );

        const rawDate =
          getValue(
            payment,
            [
              "created_at",
              "payment_date",
              "paid_at",
              "date"
            ],
            ""
          );

        let date = "-";

        if (rawDate) {

          const parsedDate =
            new Date(rawDate);

          if (
            !Number.isNaN(
              parsedDate.getTime()
            )
          ) {

            date =
              parsedDate.toLocaleDateString(
                "en-IN",
                {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                }
              );
          }
        }

        return `
          <div class="payment-history-row">

            <div class="payment-history-main">

              <strong>
                Payment ${index + 1}
              </strong>

              <span>
                EMI ${installment}
              </span>

            </div>

            <div class="payment-history-amount">
              ${money(amount)}
            </div>

            <div class="payment-history-info">

              <span>
                Mode: ${String(mode).toUpperCase()}
              </span>

              <span>
                Date: ${date}
              </span>

              <span>
                Status:
                ${String(status).toUpperCase()}
              </span>

              <span>
                Transaction:
                ${transactionId}
              </span>

            </div>

          </div>
        `;
      }
    )
    .join("");
}


/* =========================
   EMI CALCULATOR
========================= */

function setupCalculator() {

  const amountInput =
    $("calcAmount");

  const rateInput =
    $("calcRate");

  const monthsInput =
    $("calcMonths");

  const emiValue =
    $("emiValue");

  const heroEmi =
    $("heroEmi");

  if (
    !amountInput ||
    !rateInput ||
    !monthsInput
  ) {
    return;
  }

  function calculate() {

    const principal =
      Number(
        amountInput.value
      );

    const annualRate =
      Number(
        rateInput.value
      );

    const months =
      Number(
        monthsInput.value
      );

    if (
      !principal ||
      !annualRate ||
      !months
    ) {

      if (emiValue) {
        emiValue.textContent =
          "₹0";
      }

      if (heroEmi) {
        heroEmi.textContent =
          "₹0";
      }

      return;
    }

    const monthlyRate =
      annualRate / 12 / 100;

    let emi;

    if (monthlyRate === 0) {

      emi =
        principal / months;

    } else {

      emi =
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
    }

    if (emiValue) {
      emiValue.textContent =
        money(emi);
    }

    if (heroEmi) {
      heroEmi.textContent =
        money(emi);
    }
  }

  amountInput.addEventListener(
    "input",
    calculate
  );

  rateInput.addEventListener(
    "input",
    calculate
  );

  monthsInput.addEventListener(
    "input",
    calculate
  );

  calculate();
}


/* =========================
   CONTACT / EXTRA BUTTONS
========================= */

function setupGeneralButtons() {

  document.querySelectorAll(
    "[data-open-screen]"
  ).forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        const screen =
          button.getAttribute(
            "data-open-screen"
          );

        if (screen) {
          openScreen(screen);
        }
      }
    );
  });
}


/* =========================
   INITIALIZATION
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupNavigation();

    setupMobileMenu();

    setupEligibility();

    setupLoanApplication();

    setupDocuments();

    setupMyLoan();

    setupPayment();

    setupCalculator();

    setupGeneralButtons();

    /*
      Saved details restore
    */

    if ($("loanMobile")) {

      $("loanMobile").value =
        currentMobile;
    }

    ensureApplicationIdField();

    /*
      Application ID document field
    */

    if (
      $("documentApplicationId") &&
      currentApplicationId
    ) {

      $("documentApplicationId").value =
        currentApplicationId;
    }

    /*
      Open saved hash screen
    */

    const hash =
      window.location.hash
        .replace("#", "")
        .trim();

    if (
      hash &&
      $(hash)
    ) {

      openScreen(hash);

    } else {

      openScreen("home");
    }
  }
);


/* =========================
   PAGE LOAD
========================= */

window.addEventListener(
  "load",
  () => {

    if ($("loanMobile")) {

      $("loanMobile").value =
        currentMobile;
    }

    ensureApplicationIdField();

    if (
      $("loanApplicationId") &&
      currentApplicationId
    ) {

      $("loanApplicationId").value =
        currentApplicationId;
    }

    if (
      $("documentApplicationId") &&
      currentApplicationId
    ) {

      $("documentApplicationId").value =
        currentApplicationId;
    }
  }
);
