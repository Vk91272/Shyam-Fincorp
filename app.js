const API_BASE = "https://shyam-fincorp.onrender.com";

let currentApplicationId =
  localStorage.getItem("shyam_application_id") || "";

let currentMobile =
  localStorage.getItem("shyam_mobile") || "";

let currentLoan = null;


/* =========================================================
   COMMON HELPERS
========================================================= */

function $(id) {
  return document.getElementById(id);
}

function money(value) {
  const n = Number(value || 0);
  return "₹" + n.toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function showMessage(id, message, type = "") {
  const el = $(id);
  if (!el) return;

  el.textContent = message;
  el.className = "form-message";

  if (type) {
    el.classList.add(type);
  }
}

function hideAllScreens() {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });
}

function openScreen(screenId) {
  const screen = $(screenId);

  if (!screen) {
    console.error("Screen not found:", screenId);
    return;
  }

  hideAllScreens();
  screen.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  history.replaceState(null, "", "#" + screenId);
}

async function getJson(response) {
  const text = await response.text();

  if (!text) {
    throw new Error("Server ne empty response diya.");
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    console.error("Non JSON response:", text);

    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error(
        "Server ke badle HTML page mila. Backend URL/route check karein."
      );
    }

    throw new Error("Server ne valid JSON response nahi diya.");
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch (error) {
    console.error("JSON parse error:", text);
    throw new Error("Server response invalid hai.");
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      "Request failed."
    );
  }

  return data;
}

function getValue(obj, keys, fallback = "") {
  for (const key of keys) {
    if (
      obj &&
      obj[key] !== undefined &&
      obj[key] !== null
    ) {
      return obj[key];
    }
  }

  return fallback;
}


/* =========================================================
   SCREEN NAVIGATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* Navigation */
  document.querySelectorAll("[data-screen]").forEach(btn => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();

      const screen = this.getAttribute("data-screen");

      if (screen) {
        openScreen(screen);
      }

      const nav = $("mainNav");

      if (nav) {
        nav.classList.remove("open");
      }
    });
  });


  /* Mobile menu */
  const mobileMenu = $("mobileMenu");
  const mainNav = $("mainNav");

  if (mobileMenu && mainNav) {
    mobileMenu.addEventListener("click", () => {
      mainNav.classList.toggle("open");
    });
  }


  /* Eligibility */
  setupEligibility();


  /* Loan application */
  setupLoanApplication();


  /* Documents */
  setupDocuments();


  /* My Loan */
  setupMyLoan();


  /* Payment */
  setupPayment();


  /* EMI Calculator */
  setupCalculator();


  /* Initial screen */
  const hash = window.location.hash.replace("#", "");

  if (hash && $(hash)) {
    openScreen(hash);
  } else {
    openScreen("home");
  }

});


/* =========================================================
   ELIGIBILITY
========================================================= */

function setupEligibility() {

  const form = $("eligibilityForm");
  const next = $("eligNext");
  const back = $("eligBack");

  if (!form) return;


  function showStep(number) {

    const step1 = $("eligibilityStep1");
    const step2 = $("eligibilityStep2");
    const result = $("eligibilityResult");

    if (step1) {
      step1.classList.toggle(
        "hidden",
        number !== 1
      );
    }

    if (step2) {
      step2.classList.toggle(
        "hidden",
        number !== 2
      );
    }

    if (result && number !== 3) {
      result.classList.add("hidden");
    }

    const stepper = document.querySelectorAll(
      "#eligibility .stepper span"
    );

    stepper.forEach((item, index) => {
      item.classList.toggle(
        "active",
        index === number - 1
      );
    });
  }


  if (next) {

    next.addEventListener("click", () => {

      const name = $("eligName")?.value.trim();
      const mobile = $("eligMobile")?.value.trim();
      const age = Number($("eligAge")?.value);

      if (!name) {
        alert("Please enter your full name.");
        $("eligName")?.focus();
        return;
      }

      if (!/^[0-9]{10}$/.test(mobile)) {
        alert("Please enter a valid 10-digit mobile number.");
        $("eligMobile")?.focus();
        return;
      }

      if (age < 18 || age > 80) {
        alert("Age must be between 18 and 80 years.");
        $("eligAge")?.focus();
        return;
      }

      showStep(2);
    });

  }


  if (back) {
    back.addEventListener("click", () => {
      showStep(1);
    });
  }


  form.addEventListener("submit", async e => {

    e.preventDefault();

    const name = $("eligName")?.value.trim();
    const mobile = $("eligMobile")?.value.trim();
    const age = Number($("eligAge")?.value);

    const employment =
      $("eligEmployment")?.value || "other";

    const income =
      Number($("eligIncome")?.value || 0);

    const existingEmi =
      Number($("eligExistingEmi")?.value || 0);

    const amount =
      Number($("eligAmount")?.value || 0);

    const tenure =
      Number($("eligTenure")?.value || 0);


    if (!name) {
      alert("Please enter your name.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      alert("Please enter valid 10-digit mobile number.");
      return;
    }

    if (age < 18 || age > 80) {
      alert("Age must be between 18 and 80.");
      return;
    }

    if (income <= 0) {
      alert("Please enter monthly income.");
      return;
    }

    if (amount < 10000) {
      alert("Requested amount must be at least ₹10,000.");
      return;
    }

    if (tenure <= 0) {
      alert("Please select tenure.");
      return;
    }


    const submitButton =
      form.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Checking...";
    }


    try {

      const response = await fetch(
        API_BASE + "/api/eligibility",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            full_name: name,
            mobile: mobile,
            email: "",
            age: age,
            employment_type: employment,
            monthly_income: income,
            existing_emi: existingEmi,
            requested_amount: amount,
            tenure_months: tenure
          })
        }
      );


      const data = await getJson(response);

      console.log("Eligibility response:", data);


      const result =
        data.inquiry ||
        data.result ||
        data;


      const inquiryId =
        getValue(
          result,
          [
            "inquiry_id",
            "inquiryId",
            "application_id"
          ],
          "Generated"
        );


      const status =
        getValue(
          result,
          [
            "eligibility_status",
            "status"
          ],
          "needs_review"
        );


      const reason =
        getValue(
          result,
          [
            "eligibility_reason",
            "reason",
            "message"
          ],
          "Your inquiry has been received."
        );


      const rate =
        Number(
          getValue(
            result,
            [
              "estimated_interest_rate",
              "interest_rate"
            ],
            12
          )
        );


      const emi =
        Number(
          getValue(
            result,
            [
              "estimated_emi",
              "emi"
            ],
            0
          )
        );


      window.eligibilityData = {
        full_name: name,
        mobile: mobile,
        age: age,
        employment_type: employment,
        monthly_income: income,
        existing_emi: existingEmi,
        requested_amount: amount,
        tenure_months: tenure
      };


      localStorage.setItem(
        "shyam_eligibility_mobile",
        mobile
      );


      const resultBox = $("eligibilityResult");

      if (!resultBox) {
        throw new Error(
          "Eligibility result section nahi mila."
        );
      }


      let statusText = "Needs Review";

      if (
        String(status).toLowerCase()
          .includes("likely")
      ) {
        statusText = "Likely Eligible";
      }

      if (
        String(status).toLowerCase()
          .includes("not")
      ) {
        statusText = "Not Eligible";
      }


      resultBox.innerHTML = `
        <div class="result-inner">

          <span class="eyebrow">
            <span></span> PRELIMINARY RESULT
          </span>

          <h3>${statusText}</h3>

          <p>${reason}</p>

          <div class="result-stats">

            <div>
              <span>Inquiry ID</span>
              <strong>${inquiryId}</strong>
            </div>

            <div>
              <span>Estimated Rate</span>
              <strong>${rate}%</strong>
            </div>

            <div>
              <span>Estimated EMI</span>
              <strong>${money(emi)}</strong>
            </div>

          </div>

          <div class="result-actions">

            <button
              type="button"
              class="btn btn-gold"
              id="continueApplicationButton">
              Continue to Loan Application →
            </button>

            <button
              type="button"
              class="btn btn-light"
              id="eligibilityStartAgain">
              Start Again
            </button>

          </div>

          <small>
            This is a preliminary eligibility indication only.
            It is not a loan approval or sanction.
          </small>

        </div>
      `;


      $("eligibilityStep1")?.classList.add("hidden");
      $("eligibilityStep2")?.classList.add("hidden");

      resultBox.classList.remove("hidden");


      const stepper =
        document.querySelectorAll(
          "#eligibility .stepper span"
        );

      stepper.forEach((item, index) => {
        item.classList.toggle(
          "active",
          index === 2
        );
      });


      const continueButton =
        $("continueApplicationButton");

      if (continueButton) {

        continueButton.addEventListener(
          "click",
          () => {

            const d =
              window.eligibilityData;

            if (d) {

              if ($("appName"))
                $("appName").value =
                  d.full_name || "";

              if ($("appMobile"))
                $("appMobile").value =
                  d.mobile || "";

              if ($("appIncome"))
                $("appIncome").value =
                  d.monthly_income || "";

              if ($("appAmount"))
                $("appAmount").value =
                  d.requested_amount || "";

              if ($("appTenure"))
                $("appTenure").value =
                  String(d.tenure_months || "");
            }

            openScreen("apply");
          }
        );

      }


      $("eligibilityStartAgain")
        ?.addEventListener(
          "click",
          () => {

            form.reset();

            if ($("eligAge"))
              $("eligAge").value = 30;

            if ($("eligExistingEmi"))
              $("eligExistingEmi").value = 0;

            resultBox.classList.add("hidden");

            showStep(1);
          }
        );


    } catch (error) {

      console.error("Eligibility error:", error);

      alert(
        error.message ||
        "Eligibility check failed. Please try again."
      );

    } finally {

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML =
          'Check Eligibility <span>→</span>';
      }

    }

  });

}


/* =========================================================
   LOAN APPLICATION
========================================================= */

function setupLoanApplication() {

  const form = $("loanForm");

  if (!form) return;


  form.addEventListener("submit", async e => {

    e.preventDefault();


    const name =
      $("appName")?.value.trim();

    const mobile =
      $("appMobile")?.value.trim();

    const email =
      $("appEmail")?.value.trim();

    const income =
      Number($("appIncome")?.value || 0);

    const amount =
      Number($("appAmount")?.value || 0);

    const tenure =
      Number($("appTenure")?.value || 0);

    const address =
      $("appAddress")?.value.trim();


    if (!name) {
      alert("Please enter full name.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      alert("Please enter valid 10-digit mobile number.");
      return;
    }

    if (income <= 0) {
      alert("Please enter monthly income.");
      return;
    }

    if (amount < 10000) {
      alert("Loan amount must be at least ₹10,000.");
      return;
    }

    if (!tenure) {
      alert("Please select tenure.");
      return;
    }

    if (!address) {
      alert("Please enter residential address.");
      return;
    }


    const button =
      form.querySelector(
        'button[type="submit"]'
      );

    if (button) {
      button.disabled = true;
      button.textContent = "Submitting...";
    }


    showMessage(
      "applicationMessage",
      "Submitting your application..."
    );


    try {

      const response = await fetch(
        API_BASE + "/api/applications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            full_name: name,
            mobile: mobile,
            email: email,
            monthly_income: income,
            requested_amount: amount,
            tenure_months: tenure,
            address: address
          })
        }
      );


      const data = await getJson(response);

      console.log(
        "Application response:",
        data
      );


      const application =
        data.application ||
        data.loan_application ||
        data;


      const applicationId =
        getValue(
          application,
          [
            "application_id",
            "applicationId",
            "id"
          ],
          ""
        );


      if (!applicationId) {
        throw new Error(
          "Application ID server se nahi mila."
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


      if ($("documentApplicationId")) {
        $("documentApplicationId")
          .textContent =
          currentApplicationId;
      }


      showMessage(
        "applicationMessage",
        "Application submitted successfully. Application ID: " +
          currentApplicationId,
        "success"
      );


      setTimeout(() => {
        openScreen("documents");
      }, 800);


    } catch (error) {

      console.error(
        "Application error:",
        error
      );

      showMessage(
        "applicationMessage",
        error.message ||
          "Application submit failed.",
        "error"
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.innerHTML =
          'Submit Application <span>→</span>';
      }

    }

  });

}


/* =========================================================
   DOCUMENT UPLOAD
========================================================= */

function setupDocuments() {

  const form = $("documentForm");

  if (!form) return;


  form.addEventListener("submit", async e => {

    e.preventDefault();


    const applicationId =
      currentApplicationId ||
      localStorage.getItem(
        "shyam_application_id"
      );


    if (!applicationId) {

      alert(
        "Application ID nahi mila. Please pehle loan application submit karein."
      );

      openScreen("apply");

      return;
    }


    const type =
      $("documentType")?.value;

    const file =
      $("documentFile")?.files?.[0];


    if (!file) {
      alert("Please select a document.");
      return;
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
      form.querySelector(
        'button[type="submit"]'
      );


    if (button) {
      button.disabled = true;
      button.textContent =
        "Uploading...";
    }


    showMessage(
      "documentMessage",
      "Preparing secure upload..."
    );


    try {

      /*
       * STEP 1
       * Get signed upload URL
       */

      const urlResponse =
        await fetch(
          API_BASE +
            "/api/documents/upload-url",
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
                type,
              file_name:
                file.name,
              file_type:
                file.type,
              file_size:
                file.size
            })
          }
        );


      const uploadData =
        await getJson(
          urlResponse
        );


      console.log(
        "Upload URL response:",
        uploadData
      );


      const signedUrl =
        uploadData.signedUrl ||
        uploadData.signed_url ||
        uploadData.url;


      const path =
        uploadData.path ||
        uploadData.file_path ||
        uploadData.storage_path ||
        "";


      const token =
        uploadData.token ||
        uploadData.signedToken ||
        "";


      if (!signedUrl) {
        throw new Error(
          "Secure upload URL server se nahi mila."
        );
      }


      /*
       * STEP 2
       * Upload actual file
       */

      showMessage(
        "documentMessage",
        "Uploading document..."
      );


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

        const errorText =
          await uploadResponse.text();

        console.error(
          "Storage upload error:",
          errorText
        );

        throw new Error(
          "File storage upload failed."
        );
      }


      /*
       * STEP 3
       * Save document metadata
       */

      showMessage(
        "documentMessage",
        "Saving document details..."
      );


      try {

        const recordResponse =
          await fetch(
            API_BASE +
              "/api/documents/record",
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
                  type,
                file_name:
                  file.name,
                file_type:
                  file.type,
                file_size:
                  file.size,
                storage_path:
                  path
              })
            }
          );


        if (!recordResponse.ok) {

          console.warn(
            "Document record route failed."
          );

        } else {

          try {
            await getJson(
              recordResponse
            );
          } catch (recordError) {
            console.warn(
              "Record response:",
              recordError
            );
          }

        }

      } catch (recordError) {

        console.warn(
          "Metadata record error:",
          recordError
        );

      }


      showMessage(
        "documentMessage",
        "Document uploaded successfully.",
        "success"
      );


      if ($("documentFile")) {
        $("documentFile").value = "";
      }


      /*
       * IMPORTANT:
       * Document upload complete hone ke baad
       * My Loan page open hoga.
       */

      setTimeout(() => {

        openScreen("myloan");

        ensureApplicationIdField();

      }, 1000);


    } catch (error) {

      console.error(
        "Document upload error:",
        error
      );

      showMessage(
        "documentMessage",
        error.message ||
          "Document upload failed.",
        "error"
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.innerHTML =
          'Upload Document <span>↑</span>';
      }

    }

  });

}


/* =========================================================
   MY LOAN
========================================================= */

function ensureApplicationIdField() {

  const portal =
    document.querySelector(
      "#myloan .portal-login"
    );

  if (!portal) return;


  if ($("loanApplicationId")) {

    if (
      currentApplicationId &&
      !$("loanApplicationId").value
    ) {
      $("loanApplicationId").value =
        currentApplicationId;
    }

    return;
  }


  const mobileLabel =
    portal.querySelector(
      "label"
    );


  const label =
    document.createElement(
      "label"
    );


  label.innerHTML = `
    Application ID
    <input
      id="loanApplicationId"
      type="text"
      placeholder="e.g. SFL-12345678"
      value="${currentApplicationId || ""}">
  `;


  if (mobileLabel) {
    portal.insertBefore(
      label,
      mobileLabel
    );
  } else {
    portal.insertBefore(
      label,
      portal.firstChild
    );
  }

}


/* Run immediately */
ensureApplicationIdField();


function setupMyLoan() {

  /*
   * Application ID field dynamically add karein
   */
  ensureApplicationIdField();


  const button =
    $("loadLoanBtn");

  if (!button) return;


  button.addEventListener(
    "click",
    loadCustomerLoan
  );

}


async function loadCustomerLoan() {

  ensureApplicationIdField();


  const applicationId =
    $("loanApplicationId")?.value.trim() ||
    currentApplicationId ||
    localStorage.getItem(
      "shyam_application_id"
    ) ||
    "";


  const mobile =
    $("loanMobile")?.value.trim() ||
    currentMobile ||
    localStorage.getItem(
      "shyam_mobile"
    ) ||
    "";


  if (!applicationId) {

    showMessage(
      "loanMessage",
      "Please enter Application ID.",
      "error"
    );

    $("loanApplicationId")?.focus();

    return;
  }


  if (!/^[0-9]{10}$/.test(mobile)) {

    showMessage(
      "loanMessage",
      "Please enter valid 10-digit mobile number.",
      "error"
    );

    $("loanMobile")?.focus();

    return;
  }


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


  const button =
    $("loadLoanBtn");


  if (button) {
    button.disabled = true;
    button.textContent =
      "Loading...";
  }


  showMessage(
    "loanMessage",
    "Loading your loan details..."
  );


  try {

    const response =
      await fetch(
        API_BASE +
          "/api/customer/loan",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            application_id:
              applicationId,
            mobile: mobile
          })
        }
      );


    const data =
      await getJson(response);


    console.log(
      "Customer loan response:",
      data
    );


    displayLoan(data);


    showMessage(
      "loanMessage",
      "Loan details loaded successfully.",
      "success"
    );


    setTimeout(() => {
      openScreen("dashboard");
    }, 400);


  } catch (error) {

    console.error(
      "My Loan error:",
      error
    );

    showMessage(
      "loanMessage",
      error.message ||
        "Loan details load nahi ho paye.",
      "error"
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.innerHTML =
        'View My Loan <span>→</span>';
    }

  }

}


/* =========================================================
   DISPLAY DASHBOARD
========================================================= */

function displayLoan(data) {

  const loan =
    data.loan ||
    data.loan_account ||
    data.account ||
    data;


  currentLoan =
    loan;


  const loanAccount =
    getValue(
      loan,
      [
        "loan_account_no",
        "loan_account_number",
        "account_no",
        "loan_account_id",
        "id"
      ],
      "—"
    );


  const applicationId =
    getValue(
      loan,
      [
        "application_id",
        "applicationId"
      ],
      currentApplicationId
    );


  const customerName =
    getValue(
      loan,
      [
        "full_name",
        "customer_name",
        "name"
      ],
      "Customer"
    );


  const amount =
    Number(
      getValue(
        loan,
        [
          "principal_amount",
          "loan_amount",
          "approved_amount",
          "requested_amount"
        ],
        0
      )
    );


  const rate =
    Number(
      getValue(
        loan,
        [
          "interest_rate",
          "annual_interest_rate",
          "rate"
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


  let emi =
    Number(
      getValue(
        loan,
        [
          "emi_amount",
          "monthly_emi",
          "emi"
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
      "—"
    );


  const schedule =
    data.emi_schedule ||
    data.schedule ||
    loan.emi_schedule ||
    loan.schedule ||
    [];


  /*
   * If EMI is missing but schedule exists,
   * calculate it from first installment.
   */

  if (
    !emi &&
    Array.isArray(schedule) &&
    schedule.length
  ) {

    emi = Number(
      getValue(
        schedule[0],
        [
          "total_due",
          "emi_amount",
          "emi"
        ],
        0
      )
    );

  }


  /*
   * Dashboard values
   */

  if ($("displayLoanAccount"))
    $("displayLoanAccount")
      .textContent =
      loanAccount;


  if ($("displayCustomerName"))
    $("displayCustomerName")
      .textContent =
      customerName;


  if ($("displayLoanAmount"))
    $("displayLoanAmount")
      .textContent =
      money(amount);


  if ($("displayEmi"))
    $("displayEmi")
      .textContent =
      money(emi);


  if ($("displayTenure"))
    $("displayTenure")
      .textContent =
      tenure
        ? tenure + " months"
        : "—";


  if ($("displayLoanStatus"))
    $("displayLoanStatus")
      .textContent =
      status;


  /*
   * Outstanding
   */

  let outstanding = 0;

  if (
    loan.outstanding_amount !== undefined
  ) {

    outstanding =
      Number(
        loan.outstanding_amount
      );

  } else if (
    loan.outstanding !== undefined
  ) {

    outstanding =
      Number(
        loan.outstanding
      );

  } else {

    schedule.forEach(item => {

      const itemStatus =
        String(
          item.status || ""
        ).toLowerCase();

      if (
        itemStatus !== "paid"
      ) {

        outstanding +=
          Number(
            getValue(
              item,
              [
                "total_due",
                "amount",
                "emi_amount"
              ],
              0
            )
          );

      }

    });

  }


  if ($("displayOutstanding"))
    $("displayOutstanding")
      .textContent =
      money(outstanding);


  /*
   * Store application ID
   */

  if (applicationId) {

    currentApplicationId =
      applicationId;

    localStorage.setItem(
      "shyam_application_id",
      applicationId
    );

  }


  renderSchedule(schedule);

  renderPaymentHistory(
    data.payment_history ||
    data.payments ||
    []
  );

}


/* =========================================================
   EMI SCHEDULE
========================================================= */

function renderSchedule(schedule) {

  const container =
    $("emiScheduleContainer");


  if (!container) return;


  container.innerHTML = "";


  if (
    !Array.isArray(schedule) ||
    schedule.length === 0
  ) {

    container.innerHTML = `
      <div class="empty-state">
        EMI schedule is not available yet.
      </div>
    `;

    if ($("paymentSummaryAmount"))
      $("paymentSummaryAmount")
        .textContent =
        "₹0 pending";

    if ($("paymentInstallment"))
      $("paymentInstallment").innerHTML =
        `<option value="">No pending EMI</option>`;

    return;
  }


  let pendingTotal = 0;

  let pendingItems = [];


  schedule.forEach((item, index) => {

    const installment =
      Number(
        getValue(
          item,
          [
            "installment_no",
            "installment",
            "emi_no",
            "number"
          ],
          index + 1
        )
      );


    const principal =
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


    const interest =
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


    const total =
      Number(
        getValue(
          item,
          [
            "total_due",
            "emi_amount",
            "amount",
            "emi"
          ],
          principal + interest
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


    const status =
      String(
        item.status || "pending"
      ).toLowerCase();


    const isPaid =
      status === "paid" ||
      paid >= total && total > 0;


    if (!isPaid) {

      pendingTotal +=
        Math.max(
          total - paid,
          0
        );

      pendingItems.push({
        installment,
        amount:
          Math.max(
            total - paid,
            0
          )
      });

    }


    const row =
      document.createElement(
        "div"
      );

    row.className =
      "schedule-item";


    const date =
      getValue(
        item,
        [
          "due_date",
          "date"
        ],
        ""
      );


    const statusLabel =
      isPaid
        ? "Paid"
        : "Pending";


    row.innerHTML = `
      <div class="schedule-main">

        <strong>
          EMI ${installment}
        </strong>

        ${
          date
            ? `<small>${date}</small>`
            : ""
        }

      </div>

      <div class="schedule-amount">

        <strong>
          ${money(total)}
        </strong>

        <small>
          ${statusLabel}
        </small>

      </div>
    `;


    container.appendChild(row);

  });


  if ($("paymentSummaryAmount")) {

    $("paymentSummaryAmount")
      .textContent =
      money(pendingTotal) +
      " pending";

  }


  fillPaymentInstallments(
    pendingItems
  );

}


/* =========================================================
   PAYMENT INSTALLMENT DROPDOWN
========================================================= */

function fillPaymentInstallments(
  pendingItems
) {

  const select =
    $("paymentInstallment");


  if (!select) return;


  select.innerHTML = "";


  if (
    !pendingItems ||
    pendingItems.length === 0
  ) {

    select.innerHTML =
      `<option value="">No pending EMI</option>`;

    if ($("paymentAmount"))
      $("paymentAmount").value = "";

    return;
  }


  pendingItems.forEach(item => {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      item.installment;

    option.textContent =
      "EMI " +
      item.installment +
      " - " +
      money(item.amount);

    option.dataset.amount =
      item.amount;

    select.appendChild(option);

  });


  updatePaymentAmount();


  select.addEventListener(
    "change",
    updatePaymentAmount
  );

}


function updatePaymentAmount() {

  const select =
    $("paymentInstallment");

  const amount =
    $("paymentAmount");


  if (!select || !amount) return;


  const option =
    select.options[
      select.selectedIndex
    ];


  if (
    option &&
    option.dataset.amount
  ) {

    amount.value =
      Number(
        option.dataset.amount
      );

  }

}


/* =========================================================
   PAYMENT
========================================================= */

function setupPayment() {

  const form =
    $("paymentForm");

  if (!form) return;


  form.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


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


      const installment =
        Number(
          $("paymentInstallment")
            ?.value || 0
        );


      const amount =
        Number(
          $("paymentAmount")
            ?.value || 0
        );


      const paymentMode =
        $("paymentMode")
          ?.value ||
        "online";


      if (!applicationId) {

        showMessage(
          "paymentMessage",
          "Application ID not found.",
          "error"
        );

        return;
      }


      if (!/^[0-9]{10}$/.test(mobile)) {

        showMessage(
          "paymentMessage",
          "Registered mobile number not found.",
          "error"
        );

        return;
      }


      if (!installment) {

        showMessage(
          "paymentMessage",
          "Please select installment.",
          "error"
        );

        return;
      }


      if (amount <= 0) {

        showMessage(
          "paymentMessage",
          "Please enter valid payment amount.",
          "error"
        );

        return;
      }


      const button =
        form.querySelector(
          'button[type="submit"]'
        );


      if (button) {

        button.disabled = true;

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
            API_BASE +
              "/api/customer/pay-emi-test",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify({
                application_id:
                  applicationId,

                loan_account_id:
                  getValue(
                    currentLoan,
                    [
                      "loan_account_id",
                      "loan_account_no",
                      "id"
                    ],
                    ""
                  ),

                mobile:
                  mobile,

                installment_no:
                  installment,

                amount:
                  amount,

                payment_method:
                  paymentMode
              })
            }
          );


        const data =
          await getJson(response);


        console.log(
          "Payment response:",
          data
        );


        showMessage(
          "paymentMessage",
          data.message ||
            "Payment recorded successfully.",
          "success"
        );


        /*
         * Reload loan details
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
            "Payment failed.",
          "error"
        );

      } finally {

        if (button) {

          button.disabled = false;

          button.innerHTML =
            'Pay EMI <span>→</span>';

        }

      }

    }
  );

}


/* =========================================================
   PAYMENT HISTORY
========================================================= */

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
    return;
  }


  try {

    const response =
      await fetch(
        API_BASE +
          "/api/customer/payment-history",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
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


    renderPaymentHistory(
      data.payment_history ||
      data.payments ||
      data.history ||
      []
    );


  } catch (error) {

    console.warn(
      "Payment history:",
      error
    );

  }

}


function renderPaymentHistory(history) {

  const container =
    $("paymentHistoryContainer");


  if (!container) return;


  container.innerHTML = "";


  if (
    !Array.isArray(history) ||
    history.length === 0
  ) {

    container.innerHTML = `
      <div class="empty-state">
        No payment transactions found.
      </div>
    `;

    return;
  }


  history.forEach(payment => {

    const item =
      document.createElement(
        "div"
      );

    item.className =
      "history-item";


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
          "installment"
        ],
        "—"
      );


    const mode =
      getValue(
        payment,
        [
          "payment_method",
          "payment_mode",
          "mode"
        ],
        "—"
      );


    const date =
      getValue(
        payment,
        [
          "created_at",
          "payment_date",
          "date"
        ],
        ""
      );


    item.innerHTML = `
      <div>
        <strong>
          EMI ${installment}
        </strong>

        <small>
          ${mode}
        </small>
      </div>

      <div>
        <strong>
          ${money(amount)}
        </strong>

        <small>
          ${date
            ? new Date(date)
                .toLocaleDateString("en-IN")
            : ""}
        </small>
      </div>
    `;


    container.appendChild(item);

  });

}


/* =========================================================
   EMI CALCULATOR
========================================================= */

function setupCalculator() {

  const amount =
    $("calcAmount");

  const rate =
    $("calcRate");

  const months =
    $("calcMonths");

  const output =
    $("emiValue");

  const hero =
    $("heroEmi");


  if (
    !amount ||
    !rate ||
    !months
  ) {
    return;
  }


  function calculate() {

    const P =
      Number(
        amount.value || 0
      );

    const annualRate =
      Number(
        rate.value || 0
      );

    const n =
      Number(
        months.value || 0
      );


    if (
      P <= 0 ||
      n <= 0
    ) {

      if (output)
        output.textContent =
          "₹0";

      if (hero)
        hero.textContent =
          "₹0";

      return;
    }


    const monthlyRate =
      annualRate / 12 / 100;


    let emi;


    if (
      monthlyRate === 0
    ) {

      emi =
        P / n;

    } else {

      emi =
        P *
        monthlyRate *
        Math.pow(
          1 + monthlyRate,
          n
        ) /
        (
          Math.pow(
            1 + monthlyRate,
            n
          ) - 1
        );

    }


    if (output)
      output.textContent =
        money(emi);


    if (hero)
      hero.textContent =
        money(emi);

  }


  amount.addEventListener(
    "input",
    calculate
  );

  rate.addEventListener(
    "input",
    calculate
  );

  months.addEventListener(
    "input",
    calculate
  );


  calculate();

}


/* =========================================================
   EXTRA: KEEP APPLICATION ID UPDATED
========================================================= */

document.addEventListener(
  "click",
  e => {

    const target =
      e.target.closest(
        '[data-screen="myloan"]'
      );

    if (!target) return;

    setTimeout(() => {

      ensureApplicationIdField();

      if ($("loanMobile")) {

        const savedMobile =
          currentMobile ||
          localStorage.getItem(
            "shyam_mobile"
          );

        if (
          savedMobile &&
          !$("loanMobile").value
        ) {

          $("loanMobile").value =
            savedMobile;

        }

      }

    }, 100);

  }
);


/* =========================================================
   AUTO LOAD SAVED CUSTOMER INFORMATION
========================================================= */

window.addEventListener(
  "load",
  () => {

    ensureApplicationIdField();


    if ($("loanMobile")) {

      const savedMobile =
        currentMobile ||
        localStorage.getItem(
          "shyam_mobile"
        );

      if (savedMobile) {

        $("loanMobile").value =
          savedMobile;

      }

    }


    if ($("loanApplicationId")) {

      const savedApplication =
        currentApplicationId ||
        localStorage.getItem(
          "shyam_application_id"
        );

      if (savedApplication) {

        $("loanApplicationId").value =
          savedApplication;

      }

    }

  }
);
