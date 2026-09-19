const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 10000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(
  SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY || ""
);

function makeApplicationId() {
  return "SFL-" + Date.now().toString().slice(-8);
}

function requireAdmin(req, res, next) {
  if (!ADMIN_KEY || req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/", (req, res) => {
  res.json({ ok: true, service: "Shyam Fincorp Loan API" });
});

app.get("/api/health", async (req, res) => {
  res.json({
    ok: true,
    service: "Shyam Fincorp Loan API",
    databaseConfigured: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  });
});

app.post("/api/applications", async (req, res) => {
  try {
    const {
      full_name,
      mobile,
      email,
      monthly_income,
      requested_amount,
      tenure_months,
      address
    } = req.body;

    if (!full_name || !mobile || !monthly_income ||
        !requested_amount || !tenure_months || !address) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    if (!/^[0-9]{10}$/.test(String(mobile))) {
      return res.status(400).json({ error: "Mobile number must be 10 digits" });
    }

    const application_id = makeApplicationId();

    const { data, error } = await supabase
      .from("loan_applications")
      .insert({
        application_id,
        full_name,
        mobile,
        email: email || null,
        monthly_income: Number(monthly_income),
        requested_amount: Number(requested_amount),
        tenure_months: Number(tenure_months),
        address,
        status: "submitted"
      })
      .select("application_id,status")
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Could not save application" });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/applications", requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from("loan_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Could not load applications" });
  }

  res.json(data);
});

app.patch("/api/applications/:applicationId/status", requireAdmin, async (req, res) => {
  const allowed = ["submitted","under_review","approved","rejected","disbursed","closed"];
  const { status } = req.body;

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const { data, error } = await supabase
    .from("loan_applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("application_id", req.params.applicationId)
    .select("application_id,status")
    .single();

  if (error) {
    return res.status(500).json({ error: "Could not update application" });
  }

  res.json(data);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Shyam Fincorp Loan API running on port ${PORT}`);
});
