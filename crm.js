const API_BASE = "https://shyam-fincorp.onrender.com";
const AUTH_KEY = "shyam_admin_key";
const AUTH_FLAG = "shyam_admin_authenticated";

let adminKey = localStorage.getItem(AUTH_KEY) || "";
let applications = [];
let inquiries = [];
let payments = [];

const $ = id => document.getElementById(id);

function money(v){
  const n = Number(v || 0);
  return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
}
function date(v){
  if(!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
}
function esc(v){
  return String(v ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
function status(v){
  const s = String(v || "unknown").toLowerCase();
  return `<span class="status ${s}">${esc(s.replaceAll("_"," "))}</span>`;
}
function toast(msg){
  const el=$("toast"); el.textContent=msg; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2400);
}
function showError(msg){ $("loginError").textContent=msg || ""; }

async function api(path, options={}){
  const headers = {...(options.headers||{}),"x-admin-key":adminKey};
  const res = await fetch(API_BASE+path,{...options,headers});
  const text = await res.text();
  let data={}; try{data=text?JSON.parse(text):{}}catch{data={message:text}};
  if(!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
  return data;
}
function arr(data, keys=[]){
  if(Array.isArray(data)) return data;
  for(const k of keys) if(Array.isArray(data?.[k])) return data[k];
  return [];
}

async function login(){
  const key=$("adminKey").value.trim();
  if(!key){showError("Please enter the admin key.");return}
  adminKey=key;
  try{
    await api("/api/applications");
    localStorage.setItem(AUTH_KEY,key);
    localStorage.setItem(AUTH_FLAG,"1");
    showApp();
    await loadAll();
  }catch(e){
    adminKey="";
    showError(e.message || "Login failed.");
  }
}
function showApp(){
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
}
function logout(){
  adminKey="";
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_FLAG);
  $("appView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
  $("adminKey").value="";
}

async function loadAll(){
  $("apiDot").className="";
  $("apiStatus").textContent="Loading live data…";
  try{
    const [a,i,p] = await Promise.all([
      api("/api/applications"),
      api("/api/admin/inquiries"),
      api("/api/admin/payments")
    ]);
    applications=arr(a,["applications","data","results"]);
    inquiries=arr(i,["inquiries","data","results"]);
    payments=arr(p,["payments","data","results"]);
    $("apiDot").className="ok";
    $("apiStatus").textContent="API Connected";
    renderAll();
  }catch(e){
    $("apiDot").className="bad";
    $("apiStatus").textContent="API Error";
    toast(e.message || "Could not load CRM data");
  }
}

function renderAll(){
  renderDashboard();
  renderApplications();
  renderCustomers();
  renderPortfolio();
  renderPayments();
  renderInquiries();
  renderReports();
}
function amountOf(x){
  return Number(x.requested_amount ?? x.loan_amount ?? x.amount ?? x.approved_amount ?? 0);
}
function nameOf(x){return x.full_name || x.customer_name || x.name || "—"}
function mobileOf(x){return x.mobile || x.phone || "—"}
function appIdOf(x){return x.application_id || x.applicationId || x.id || "—"}
function createdOf(x){return x.created_at || x.createdAt || x.date}
function normalizeStatus(x){return String(x.status || "submitted").toLowerCase()}

function renderDashboard(){
  const counts={submitted:0,under_review:0,approved:0,rejected:0,disbursed:0,closed:0};
  applications.forEach(a=>counts[normalizeStatus(a)]=(counts[normalizeStatus(a)]||0)+1);
  const activeApproved=counts.approved+counts.disbursed+counts.closed;
  $("kpiApplications").textContent=applications.length;
  $("kpiReview").textContent=counts.under_review;
  $("kpiApproved").textContent=activeApproved;
  $("kpiAmount").textContent=money(applications.filter(a=>["approved","disbursed","closed"].includes(normalizeStatus(a))).reduce((s,a)=>s+amountOf(a),0));
  const max=Math.max(1,...Object.values(counts));
  $("statusBars").innerHTML=Object.entries(counts).map(([k,v])=>`<div class="status-row"><span>${k.replaceAll("_"," ")}</span><div class="bar"><i style="width:${Math.round(v/max*100)}%"></i></div><strong>${v}</strong></div>`).join("");
  $("recentApplications").innerHTML=applications.slice().sort((a,b)=>new Date(createdOf(b)||0)-new Date(createdOf(a)||0)).slice(0,7).map(a=>`
    <tr><td><strong>${esc(appIdOf(a))}</strong></td><td>${esc(nameOf(a))}</td><td>${money(amountOf(a))}</td><td>${status(normalizeStatus(a))}</td><td>${date(createdOf(a))}</td></tr>`).join("") || emptyRow(5);
}
function emptyRow(n){return `<tr><td colspan="${n}" class="muted">No records found.</td></tr>`}

function renderApplications(){
  const q=($("applicationFilter")?.value||"").toLowerCase();
  const sf=$("statusFilter")?.value||"";
  const rows=applications.filter(a=>{
    const hay=[appIdOf(a),nameOf(a),mobileOf(a)].join(" ").toLowerCase();
    return (!q||hay.includes(q))&&(!sf||normalizeStatus(a)===sf);
  });
  $("applicationsTable").innerHTML=rows.map(a=>`
    <tr>
      <td><strong>${esc(appIdOf(a))}</strong></td><td>${esc(nameOf(a))}</td><td>${esc(mobileOf(a))}</td>
      <td>${money(amountOf(a))}</td><td>${esc(a.tenure_months||a.tenure||"—")} ${a.tenure_months?"months":""}</td>
      <td>${status(normalizeStatus(a))}</td><td>${date(createdOf(a))}</td>
      <td><button class="action-btn" onclick="viewApplication('${encodeURIComponent(appIdOf(a))}')">View</button></td>
    </tr>`).join("") || emptyRow(8);
}

function renderCustomers(){
  const map=new Map();
  applications.forEach(a=>{
    const key=mobileOf(a);
    if(!map.has(key)) map.set(key,{name:nameOf(a),mobile:key,email:a.email||"—",count:0,status:normalizeStatus(a)});
    const c=map.get(key); c.count++; c.status=normalizeStatus(a);
  });
  $("customersTable").innerHTML=[...map.values()].map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.mobile)}</td><td>${esc(c.email)}</td><td>${c.count}</td><td>${status(c.status)}</td></tr>`).join("")||emptyRow(5);
}

function renderPortfolio(){
  const portfolio=applications.filter(a=>["approved","disbursed","closed"].includes(normalizeStatus(a)));
  $("portfolioApproved").textContent=applications.filter(a=>normalizeStatus(a)==="approved").length;
  $("portfolioDisbursed").textContent=applications.filter(a=>normalizeStatus(a)==="disbursed").length;
  $("portfolioAmount").textContent=money(portfolio.reduce((s,a)=>s+amountOf(a),0));
  $("portfolioTable").innerHTML=portfolio.map(a=>`<tr><td>${esc(appIdOf(a))}</td><td>${esc(nameOf(a))}</td><td>${money(amountOf(a))}</td><td>${esc(a.tenure_months||a.tenure||"—")}</td><td>${status(normalizeStatus(a))}</td><td>${date(createdOf(a))}</td></tr>`).join("")||emptyRow(6);
}

function paymentAmount(p){return Number(p.amount ?? p.payment_amount ?? p.paid_amount ?? 0)}
function paymentId(p){return p.payment_id||p.transaction_id||p.id||"—"}
function renderPayments(){
  const total=payments.reduce((s,p)=>s+paymentAmount(p),0);
  $("collectionTotal").textContent=money(total);
  $("collectionCount").textContent=payments.length;
  $("paymentsTable").innerHTML=payments.slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).map(p=>`
    <tr><td><strong>${esc(paymentId(p))}</strong></td><td>${esc(p.application_id||p.loan_account_no||p.loan_id||"—")}</td><td>${esc(p.full_name||p.customer_name||"—")}</td><td>${money(paymentAmount(p))}</td><td>${status(p.status||"paid")}</td><td>${date(p.created_at||p.paid_at)}</td></tr>`).join("")||emptyRow(6);
}

function renderInquiries(){
  $("inquiriesTable").innerHTML=inquiries.map(i=>`
    <tr><td><strong>${esc(i.inquiry_id||i.id||"—")}</strong></td><td>${esc(nameOf(i))}</td><td>${esc(mobileOf(i))}</td>
    <td>${money(i.monthly_income)}</td><td>${money(i.requested_amount)}</td><td>${money(i.estimated_emi)}</td><td>${status(i.eligibility_status||"pending")}</td></tr>`).join("")||emptyRow(7);
}

function renderReports(){
  const approved=applications.filter(a=>["approved","disbursed","closed"].includes(normalizeStatus(a)));
  $("reportSummary").innerHTML=`
    <div><div><span class="muted">Total applications</span><strong>${applications.length}</strong></div>
    <div><span class="muted">Portfolio applications</span><strong>${approved.length}</strong></div>
    <div><span class="muted">Portfolio value</span><strong>${money(approved.reduce((s,a)=>s+amountOf(a),0))}</strong></div>
    <div><span class="muted">Total payments recorded</span><strong>${money(payments.reduce((s,p)=>s+paymentAmount(p),0))}</strong></div>
    <div><span class="muted">Eligibility inquiries</span><strong>${inquiries.length}</strong></div>
    <div><span class="muted">Unique customers</span><strong>${new Set(applications.map(mobileOf)).size}</strong></div></div>`;
}

function viewApplication(encoded){
  const id=decodeURIComponent(encoded), a=applications.find(x=>String(appIdOf(x))===id);
  if(!a)return;
  $("modalBody").innerHTML=`<h2>Application Details</h2><div class="detail-grid">
    <div class="detail-item"><span>Application ID</span><strong>${esc(appIdOf(a))}</strong></div>
    <div class="detail-item"><span>Status</span><strong>${status(normalizeStatus(a))}</strong></div>
    <div class="detail-item"><span>Applicant</span><strong>${esc(nameOf(a))}</strong></div>
    <div class="detail-item"><span>Mobile</span><strong>${esc(mobileOf(a))}</strong></div>
    <div class="detail-item"><span>Email</span><strong>${esc(a.email||"—")}</strong></div>
    <div class="detail-item"><span>Monthly Income</span><strong>${money(a.monthly_income)}</strong></div>
    <div class="detail-item"><span>Requested Amount</span><strong>${money(a.requested_amount)}</strong></div>
    <div class="detail-item"><span>Tenure</span><strong>${esc(a.tenure_months||"—")} months</strong></div>
    <div class="detail-item"><span>Address</span><strong>${esc(a.address||"—")}</strong></div>
    <div class="detail-item"><span>Created</span><strong>${date(createdOf(a))}</strong></div>
  </div>`;
  $("modal").classList.remove("hidden");
}

function exportCSV(){
  const cols=["application_id","full_name","mobile","email","monthly_income","requested_amount","tenure_months","status","created_at"];
  const lines=[cols.join(",")];
  applications.forEach(a=>lines.push(cols.map(k=>`"${String(a[k]??"").replaceAll('"','""')}"`).join(",")));
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download="shyam-fincorp-applications.csv"; link.click(); URL.revokeObjectURL(url);
}

function navigate(section){
  document.querySelectorAll(".page-section").forEach(s=>s.classList.toggle("active",s.id===section));
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.section===section));
  document.querySelector(".sidebar")?.classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}

document.addEventListener("click",e=>{
  const el=e.target.closest("[data-section]");
  if(el) navigate(el.dataset.section);
});
$("loginButton").addEventListener("click",login);
$("adminKey").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
$("logoutButton").addEventListener("click",logout);
$("refreshButton").addEventListener("click",loadAll);
$("applicationsRefresh").addEventListener("click",loadAll);
$("paymentsRefresh").addEventListener("click",loadAll);
$("inquiriesRefresh").addEventListener("click",loadAll);
$("applicationFilter").addEventListener("input",renderApplications);
$("statusFilter").addEventListener("change",renderApplications);
$("menuButton").addEventListener("click",()=>document.querySelector(".sidebar").classList.toggle("open"));
$("modalClose").addEventListener("click",()=>$("modal").classList.add("hidden"));
$("modal").addEventListener("click",e=>{if(e.target.id==="modal")$("modal").classList.add("hidden")});
$("exportCsv").addEventListener("click",exportCSV);

$("globalSearch").addEventListener("keydown",e=>{
  if(e.key!=="Enter")return;
  const q=e.target.value.trim().toLowerCase();
  if(!q)return;
  const a=applications.find(x=>[appIdOf(x),nameOf(x),mobileOf(x)].join(" ").toLowerCase().includes(q));
  if(a){navigate("applications");$("applicationFilter").value=q;renderApplications();return}
  toast("No matching application found.");
});

if(adminKey && localStorage.getItem(AUTH_FLAG)==="1"){
  showApp();
  loadAll();
}
