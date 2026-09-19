const API_BASE = "https://shyam-fincorp.onrender.com";

function money(n){
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function calc(){
  const P = Number(document.getElementById("calcAmount").value) || 0;
  const annual = Number(document.getElementById("rate").value) || 0;
  const n = Number(document.getElementById("months").value) || 0;
  const r = annual / 12 / 100;

  const emi = r && n
    ? P * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1)
    : (n ? P/n : 0);

  document.getElementById("emiValue").textContent = money(emi);
  document.getElementById("heroEmi").textContent = money(emi) + " / month";
}

["calcAmount","rate","months"].forEach(id =>
  document.getElementById(id).addEventListener("input", calc)
);

document.getElementById("loanForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = document.getElementById("applicationMessage");
  message.textContent = "Submitting application...";

  const payload = {
    full_name: document.getElementById("name").value.trim(),
    mobile: document.getElementById("mobile").value.trim(),
    email: document.getElementById("email").value.trim(),
    monthly_income: Number(document.getElementById("income").value),
    requested_amount: Number(document.getElementById("amount").value),
    tenure_months: Number(document.getElementById("tenure").value),
    address: document.getElementById("address").value.trim()
  };

  try {
    const response = await fetch(API_BASE + "/api/applications", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Application submission failed");
    }

    document.getElementById("appId").textContent = result.application_id;
    document.getElementById("status").textContent = result.status;
    message.textContent =
      "Application submitted successfully. Application ID: " + result.application_id;
    message.style.color = "#176b45";

  } catch (err) {
    console.error(err);
    message.textContent =
      "Backend connection nahi hua. API URL aur server check karein.";
    message.style.color = "#b42318";
  }
});

calc();
