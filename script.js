(() => {
  "use strict";
  const API_BASE = "https://shyam-fincorp.onrender.com";
  const $ = (id) => document.getElementById(id);
  const formatINR = (value) => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(Number(value) || 0);

  // Responsive navigation
  $("menuToggle").addEventListener("click", () => $("mainNav").classList.toggle("open"));
  $("mainNav").querySelectorAll("a").forEach(link => link.addEventListener("click", () => $("mainNav").classList.remove("open")));
  $("year").textContent = new Date().getFullYear();

  // EMI estimate
  function calculateEMI(principal, annualRate, months) {
    const r = annualRate / 1200;
    if (!months || principal <= 0) return 0;
    if (r === 0) return principal / months;
    const factor = Math.pow(1 + r, months);
    return principal * r * factor / (factor - 1);
  }
  function updateCalculator() {
    const amount = Number($("loanAmount").value);
    const rate = Number($("rate").value);
    const months = Number($("tenure").value);
    const emi = calculateEMI(amount, rate, months);
    const total = emi * months;
    $("amountLabel").textContent = formatINR(amount);
    $("rateLabel").textContent = `${rate}%`;
    $("tenureLabel").textContent = `${months} months`;
    $("emiAmount").textContent = formatINR(emi);
    $("principalLabel").textContent = formatINR(amount);
    $("interestLabel").textContent = formatINR(total - amount);
    $("totalLabel").textContent = formatINR(total);
  }
  ["loanAmount", "rate", "tenure"].forEach(id => $(id).addEventListener("input", updateCalculator));
  updateCalculator();

  const dialog = $("applyDialog");
  document.querySelectorAll("[data-open-apply]").forEach(button => button.addEventListener("click", () => {
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "");
    $("mainNav").classList.remove("open");
  }));
  $("closeDialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  const setMessage = (el, message, kind = "") => {
    el.textContent = message;
    el.className = `form-message ${kind}`.trim();
  };
  async function requestJSON(url, options = {}) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      throw new Error("Could not connect to the API. Please try again in a moment.");
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || payload.message || `Request failed (${response.status}).`);
    }
    return payload;
  }

  // This matches the real POST route in the supplied server.js: /api/applications.
  $("applyForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = $("submitApplication");
    const message = $("applyMessage");
    if (!form.reportValidity()) return;

    const body = {
      full_name: $("fullName").value.trim(),
      mobile: $("mobile").value.trim(),
      email: $("email").value.trim(),
      monthly_income: Number($("income").value),
      requested_amount: Number($("requestedAmount").value),
      tenure_months: Number($("tenureMonths").value),
      address: $("address").value.trim()
    };
    if (!/^[6-9]\d{9}$/.test(body.mobile)) {
      setMessage(message, "Enter a valid 10-digit Indian mobile number.", "error");
      return;
    }
    if (!(body.monthly_income > 0) || !(body.requested_amount > 0) ||
        !Number.isInteger(body.tenure_months) || body.tenure_months < 1 || body.tenure_months > 360) {
      setMessage(message, "Please check your income, loan amount and tenure.", "error");
      return;
    }

    submit.disabled = true;
    submit.textContent = "Submitting…";
    setMessage(message, "Sending your application securely…");
    try {
      const result = await requestJSON(`${API_BASE}/api/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const application = result.application || {};
      const appId = application.application_id || result.application_id || "";
      setMessage(message,
        `Application submitted successfully${appId ? `. Your application ID is ${appId}. Save it for future reference.` : "."} Submission is not loan approval.`,
        "success");
      form.reset();
      if (appId) $("trackId").value = appId;
      submit.textContent = "Submitted ✓";
    } catch (error) {
      setMessage(message, `${error.message} If this continues, contact support and do not submit repeatedly.`, "error");
      submit.innerHTML = 'Submit application <span>↗</span>';
    } finally {
      submit.disabled = false;
      if (submit.textContent === "Submitting…") submit.innerHTML = 'Submit application <span>↗</span>';
    }
  });

  // The uploaded server.js does not currently have a public tracking endpoint.
  // Do not make a request to a guessed endpoint or claim status was checked.
  $("trackForm").addEventListener("submit", event => {
    event.preventDefault();
    const mobile = $("trackMobile").value.trim();
    const id = $("trackId").value.trim();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setMessage($("trackMessage"), "Enter the same valid 10-digit mobile number used in the application.", "error");
      return;
    }
    if (!id) {
      setMessage($("trackMessage"), "Enter your application ID.", "error");
      return;
    }
    setMessage($("trackMessage"),
      "The application submission API is configured. Public status lookup is not present in the current server.js yet; add the tracking route described in README.md and redeploy the API.",
      "error");
  });

  // Apply the calculator inputs to the application form for convenience.
  document.querySelectorAll("[data-open-apply]").forEach(button => button.addEventListener("click", () => {
    if (!$("requestedAmount").value) $("requestedAmount").value = $("loanAmount").value;
    if (!$("tenureMonths").value) $("tenureMonths").value = $("tenure").value;
  }));
})();