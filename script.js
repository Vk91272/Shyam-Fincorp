(() => {
  const API_BASE = "https://shyam-fincorp.onrender.com";
  const $ = id => document.getElementById(id);
  const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Math.round(n || 0));

  $("year").textContent = new Date().getFullYear();
  $("menu").addEventListener("click", () => {
    const nav = $("nav"), opened = nav.classList.toggle("open");
    $("menu").setAttribute("aria-expanded", String(opened));
    $("menu").textContent = opened ? "×" : "☰";
  });
  $("nav").querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    $("nav").classList.remove("open"); $("menu").setAttribute("aria-expanded","false"); $("menu").textContent = "☰";
  }));

  function calculate() {
    const p = Number($("amount").value), annual = Number($("rate").value), n = Number($("tenure").value), r = annual / 1200;
    const emi = r === 0 ? p/n : p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
    $("amountText").textContent = money(p); $("rateText").textContent = annual; $("tenureText").textContent = `${n} months`;
    $("emi").textContent = money(emi); $("interest").textContent = money(emi*n-p);
    $("requestedAmount").value = p;
    $("applyTenure").value = String(n <= 6 ? 6 : n <= 12 ? 12 : n <= 18 ? 18 : n <= 24 ? 24 : n <= 36 ? 36 : n <= 48 ? 48 : 60);
  }
  ["amount","rate","tenure"].forEach(id => $(id).addEventListener("input", calculate)); calculate();

  const dialog = $("applicationDialog");
  $("openForm").addEventListener("click", () => dialog.showModal());
  $("closeForm").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });

  async function api(path, options={}) {
    const response = await fetch(API_BASE + path, {...options, headers:{"Content-Type":"application/json",...(options.headers||{})}});
    let data={}; try { data=await response.json(); } catch {}
    if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
    return data;
  }
  function message(el, text, ok=false) { el.textContent=text; el.className="message"+(ok?" success":""); }

  // Confirm these route names and parameter names against your existing server.js before launch.
  $("trackForm").addEventListener("submit", async e => {
    e.preventDefault(); const id=$("appId").value.trim(), mobile=$("mobile").value.trim();
    const button=$("trackBtn"), msg=$("trackMessage"), result=$("status");
    result.hidden=true; button.disabled=true; message(msg,"Checking your application…");
    try {
      let data, firstError;
      try { data=await api(`/api/my-loan?application_id=${encodeURIComponent(id)}&mobile=${encodeURIComponent(mobile)}`); }
      catch (err) { firstError=err; try { data=await api(`/api/loan-status?application_id=${encodeURIComponent(id)}&mobile=${encodeURIComponent(mobile)}`); } catch { throw firstError; } }
      const item=data.application||data.loan||data.data||data, appId=item.application_id||item.applicationId||id;
      const status=item.status||item.application_status||data.status||"Status received";
      result.replaceChildren();
      const title=document.createElement("strong"); title.textContent="Application status"; result.appendChild(title);
      for (const [label,value] of [["Application ID",appId],["Status",String(status).replaceAll("_"," ")],...(item.full_name||item.name?[["Applicant",item.full_name||item.name]]:[]),...(item.requested_amount||item.amount?[["Requested amount",money(item.requested_amount||item.amount)]]:[])]) {
        const row=document.createElement("div"); row.textContent=`${label}: ${value}`; result.appendChild(row);
      }
      result.hidden=false; message(msg,"Latest available status retrieved.",true);
    } catch(err) { message(msg,`${err.message}. Verify the application ID and registered mobile, or contact official support.`); }
    finally { button.disabled=false; }
  });

  $("applicationForm").addEventListener("submit", async e => {
    e.preventDefault(); const button=$("submitBtn"), msg=$("applyMessage"), form=new FormData(e.currentTarget);
    const mobile=String(form.get("mobile")||"").trim();
    if(!/^[0-9]{10}$/.test(mobile)){message(msg,"Enter a valid 10-digit mobile number.");return;}
    const payload={full_name:String(form.get("fullName")||"").trim(),mobile,email:String(form.get("email")||"").trim(),monthly_income:Number(form.get("monthlyIncome")),requested_amount:Number(form.get("requestedAmount")),tenure_months:Number(form.get("tenureMonths")),address:String(form.get("address")||"").trim()};
    button.disabled=true; message(msg,"Submitting your application…");
    try {
      let data, firstError;
      try { data=await api("/api/loan-applications",{method:"POST",body:JSON.stringify(payload)}); }
      catch(err) { firstError=err; try { data=await api("/api/apply",{method:"POST",body:JSON.stringify(payload)}); } catch { throw firstError; } }
      const item=data.application||data.data||data, id=item.application_id||item.applicationId||data.application_id||data.applicationId;
      if(id){$("appId").value=id;message(msg,`Application submitted. Your application ID is ${id}. Save it to track your status.`,true);}
      else message(msg,data.message||"The API responded successfully. Check the official response for your application ID.",true);
      $("track").scrollIntoView({behavior:"smooth",block:"center"});
    } catch(err) { message(msg,`${err.message}. Submission was not confirmed. Check the API routes in server.js and try again.`); }
    finally { button.disabled=false; }
  });
})();