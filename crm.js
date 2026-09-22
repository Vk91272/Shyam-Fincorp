const API_BASE =
  "https://shyam-fincorp.onrender.com";


/* =========================
   BASIC HELPERS
========================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================
   CRM NAVIGATION
========================= */

const pageData = {

  overview: {
    title: "Business Overview",
    subtitle:
      "Monitor your lending operations from one place."
  },

  customers: {
    title: "Customer Management",
    subtitle:
      "Manage customer profiles, loans and repayment history."
  },

  applications: {
    title: "Loan Applications",
    subtitle:
      "Review and manage customer loan applications."
  },

  loans: {
    title: "Loan Portfolio",
    subtitle:
      "Track active, closed and overdue loan accounts."
  },

  collections: {
    title: "Collection Center",
    subtitle:
      "Monitor EMI collections and repayment performance."
  },

  emi: {
    title: "EMI Center",
    subtitle:
      "Track today's dues, upcoming EMIs and overdue accounts."
  },

  documents: {
    title: "Document Verification",
    subtitle:
      "Review customer KYC and income documents."
  },

  inquiries: {
    title: "Eligibility Inquiries",
    subtitle:
      "Review preliminary customer eligibility inquiries."
  },

  followups: {
    title: "Customer Follow-ups",
    subtitle:
      "Manage calls, reminders and customer follow-ups."
  },

  reports: {
    title: "Reports & Analytics",
    subtitle:
      "Analyze loan portfolio and collection performance."
  }

};


/* =========================
   PAGE OPEN
========================= */

function openCRMPage(page) {

  document
    .querySelectorAll(".crm-nav")
    .forEach((button) => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });


  const overview =
    $("overviewPage");

  const generic =
    $("genericPage");


  if (page === "overview") {

    overview.classList.add("active");

    generic.classList.remove("active");

  } else {

    overview.classList.remove("active");

    generic.classList.add("active");

    const data =
      pageData[page] || pageData.overview;

    $("genericTitle").textContent =
      data.title;

    $("genericText").textContent =
      data.subtitle;

  }


  const data =
    pageData[page] || pageData.overview;

  $("pageTitle").textContent =
    data.title;

  $("pageSubtitle").textContent =
    data.subtitle;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================
   SIDEBAR EVENTS
========================= */

document
  .querySelectorAll(".crm-nav")
  .forEach((button) => {

    button.addEventListener("click", () => {

      openCRMPage(
        button.dataset.page
      );

    });

  });


/* =========================
   VIEW ALL
========================= */

document
  .querySelectorAll("[data-page]")
  .forEach((button) => {

    if (
      !button.classList.contains("crm-nav")
    ) {

      button.addEventListener(
        "click",
        () => {

          openCRMPage(
            button.dataset.page
          );

        }
      );

    }

  });


/* =========================
   REFRESH
========================= */

$("refreshBtn")
  .addEventListener("click", () => {

    const button =
      $("refreshBtn");

    const oldText =
      button.textContent;

    button.textContent =
      "↻ Refreshing...";

    button.disabled = true;

    setTimeout(() => {

      button.textContent =
        oldText;

      button.disabled = false;

    }, 700);

  });


/* =========================
   NEW APPLICATION
========================= */

$("newApplicationBtn")
  .addEventListener("click", () => {

    /*
      Existing main website
      application page
    */

    window.location.href =
      "index.html#apply";

  });


/* =========================
   GLOBAL SEARCH
========================= */

$("globalSearch")
  .addEventListener("keydown", (event) => {

    if (event.key !== "Enter") {
      return;
    }

    const value =
      event.target.value.trim();

    if (!value) {
      return;
    }

    alert(
      `CRM Search:\n\n${value}\n\nLive customer search API can be connected here.`
    );

  });


/* =========================
   MOBILE MENU
========================= */

$("mobileMenu")
  .addEventListener("click", () => {

    document
      .querySelector(".crm-sidebar")
      .classList.toggle("open");

  });


/* =========================
   LOGOUT
========================= */

$("logoutBtn")
  .addEventListener("click", () => {

    const confirmLogout =
      confirm(
        "Do you want to logout from CRM?"
      );

    if (!confirmLogout) {
      return;
    }

    localStorage.removeItem(
      "shyam_admin_authenticated"
    );

    window.location.href =
      "index.html";

  });


/* =========================
   COLLECTION PERIOD
========================= */

$("collectionPeriod")
  .addEventListener("change", (event) => {

    console.log(
      "Collection period:",
      event.target.value
    );

  });


/* =========================
   LOAD CRM DATA
========================= */

async function loadCRMData() {

  try {

    /*
      Existing backend can be connected
      here as APIs are finalized.
    */

    const response =
      await fetch(
        `${API_BASE}/api/admin/inquiries`
      );

    if (!response.ok) {
      return;
    }

    const data =
      await response.json();

    console.log(
      "CRM inquiry data:",
      data
    );

  } catch (error) {

    console.log(
      "CRM live data not available yet."
    );

  }

}


/* =========================
   INIT
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    openCRMPage("overview");

    loadCRMData();

  }
);
