const API_BASE = "https://shyam-fincorp.onrender.com";

function money(n){ return "₹" + Math.round(Number(n)||0).toLocaleString("en-IN"); }
function calc(){
  const P=Number(document.getElementById("calcAmount").value)||0, annual=Number(document.getElementById("rate").value)||0, n=Number(document.getElementById("months").value)||0, r=annual/12/100;
  const emi=r&&n ? P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1) : (n?P/n:0);
  document.getElementById("emiValue").textContent=money(emi); document.getElementById("heroEmi").textContent=money(emi)+" / month";
}
["calcAmount","rate","months"].forEach(id=>document.getElementById(id).addEventListener("input",calc));

document.getElementById("loanForm").addEventListener("submit",async e=>{
 e.preventDefault(); const message=document.getElementById("applicationMessage"); message.textContent="Submitting application...";
 const payload={full_name:document.getElementById("name").value.trim(),mobile:document.getElementById("mobile").value.trim(),email:document.getElementById("email").value.trim(),monthly_income:Number(document.getElementById("income").value),requested_amount:Number(document.getElementById("amount").value),tenure_months:Number(document.getElementById("tenure").value),address:document.getElementById("address").value.trim()};
 try{const r=await fetch(API_BASE+"/api/applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const result=await r.json();if(!r.ok)throw new Error(result.error||"Application submission failed");message.textContent="Application submitted successfully. Application ID: "+result.application_id;message.style.color="#176b45";}catch(err){console.error(err);message.textContent="Backend connection nahi hua. API URL check karein.";message.style.color="#b42318";}
});

document.getElementById("loadLoanBtn").addEventListener("click",async()=>{
 const mobile=document.getElementById("loanMobile").value.trim(), msg=document.getElementById("loanMessage"), box=document.getElementById("loanDetails");
 box.hidden=true; if(!/^\d{10}$/.test(mobile)){msg.textContent="Please enter a valid 10-digit mobile number.";return;}
 msg.textContent="Loading loan details...";
 try{const r=await fetch(API_BASE+"/api/customer/loan?mobile="+encodeURIComponent(mobile));const data=await r.json();if(!r.ok)throw new Error(data.error||"Loan details not found");
   box.hidden=false; box.innerHTML=`<div class="card"><p><b>Loan Account:</b> ${data.loan_account_no}</p><p><b>EMI:</b> ${money(data.emi)}</p><p><b>Next Due:</b> ${data.next_emi?.due_date||"—"}</p><p><b>Next EMI Status:</b> ${data.next_emi?.status||"—"}</p><p><b>Payment Gateway:</b> Not connected</p><button class="btn" type="button" id="payEmiBtn">Pay EMI</button><p id="payMessage"></p><small>Prototype: this button does not collect money until an approved payment gateway is connected.</small></div>`;
   document.getElementById("payEmiBtn").onclick=()=>{document.getElementById("payMessage").textContent="Payment gateway setup is required before real EMI payments can be accepted.";};
   msg.textContent="Loan details loaded.";
 }catch(err){msg.textContent=err.message;}
});
calc();
