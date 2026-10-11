
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 10000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(",").map(x => x.trim())
    : true
}));
app.use(express.json({ limit: "1mb" }));

let supabase = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

const sessions = new Map();
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function apiError(res, status, message) {
  return res.status(status).json({
    ok: false,
    error: message
  });
}

function requireDatabase(req, res, next) {
  if (!supabase) {
    return apiError(
      res,
      503,
      "Database configuration missing. Check Render environment variables."
    );
  }
  next();
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : "";

  const session = sessions.get(token);

  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return apiError(res, 401, "Session expired. Please log in again.");
  }

  session.expiresAt = Date.now() + SESSION_DURATION_MS;
  next();
}

function cleanText(value, max = 300) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function validMobile(value) {
  return /^[6-9]\d{9}$/.test(String(value || "").trim());
}

function validAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= 100000000;
}

function safeDbMessage(error) {
  // Do not expose database credentials or raw internal details.
  console.error("Supabase error:", error?.message || error);
  return "Database operation failed. Check the server logs and table schema.";
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Shyam Fincorp Loan API",
    version: "3.0"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    databaseConfigured: Boolean(supabase),
    adminConfigured: Boolean(ADMIN_KEY)
  });
});

/* ---------------- ADMIN LOGIN ---------------- */

app.post("/api/admin/login", (req, res) => {
  if (!ADMIN_KEY) {
    return apiError(res, 503, "ADMIN_KEY is not configured on the server.");
  }

  // Supports adminKey, key, or password field.
  // If your current frontend has email/password fields, enter ADMIN_KEY
  // in the password field until the frontend login is aligned.
  const submittedKey = cleanText(
    req.body?.adminKey || req.body?.key || req.body?.password,
    500
  );

  const expected = Buffer.from(ADMIN_KEY);
  const supplied = Buffer.from(submittedKey);

  if (
    !submittedKey ||
    expected.length !== supplied.length ||
    !crypto.timingSafeEqual(expected, supplied)
  ) {
    return apiError(res, 401, "Invalid Admin Key.");
  }

  const token = crypto.randomBytes(32).toString("hex");

  sessions.set(token, {
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS
  });

  res.json({
    ok: true,
    token,
    tokenType: "Bearer",
    expiresIn: SESSION_DURATION_MS / 1000
  });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  const token = (req.headers.authorization || "").slice(7).trim();
  sessions.delete(token);
  res.json({ ok: true, message: "Logged out successfully." });
});

/* ---------------- DASHBOARD SUMMARY ---------------- */

app.get(
  "/api/admin/summary",
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    try {
      const { data: applications, error } = await supabase
        .from("loan_applications")
        .select("application_id, requested_amount, status, created_at");

      if (error) throw error;

      const rows = applications || [];
      const normalized = rows.map(row => ({
        ...row,
        status: String(row.status || "submitted").toLowerCase()
      }));

      const totalApplications = rows.length;
      const pendingApplications = normalized.filter(row =>
        ["submitted", "under_review", "pending"].includes(row.status)
      ).length;

      const approvedApplications = normalized.filter(row =>
        ["approved", "disbursed", "closed"].includes(row.status)
      ).length;

      const totalRequestedAmount = rows.reduce(
        (sum, row) => sum + (Number(row.requested_amount) || 0),
        0
      );

      const disbursedAmount = normalized
        .filter(row => ["disbursed", "closed"].includes(row.status))
        .reduce(
          (sum, row) => sum + (Number(row.requested_amount) || 0),
          0
        );

      let paidEmiAmount = 0;
      let pendingEmiAmount = 0;
      let pendingEmis = 0;
      let nextEmiDate = null;

      const emiResult = await supabase
        .from("emis")
        .select("emi_amount, due_date, status, paid_at");

      if (!emiResult.error) {
        const emis = emiResult.data || [];
        const today = new Date().toISOString().slice(0, 10);

        paidEmiAmount = emis
          .filter(emi => String(emi.status).toLowerCase() === "paid")
          .reduce((sum, emi) => sum + (Number(emi.emi_amount) || 0), 0);

        const unpaid = emis.filter(
          emi => String(emi.status || "").toLowerCase() !== "paid"
        );

        pendingEmis = unpaid.length;
        pendingEmiAmount = unpaid.reduce(
          (sum, emi) => sum + (Number(emi.emi_amount) || 0),
          0
        );

        const upcoming = unpaid
          .filter(emi => emi.due_date && emi.due_date >= today)
          .sort((a, b) => a.due_date.localeCompare(b.due_date));

        nextEmiDate = upcoming[0]?.due_date || null;
      } else {
        console.warn(
          "EMI summary unavailable. Check the emis table/schema:",
          emiResult.error.message
        );
      }

      res.json({
        ok: true,
        summary: {
          totalApplications,
          pendingApplications,
          approvedApplications,
          totalRequestedAmount,
          disbursedAmount,
          paidEmiAmount,
          pendingEmiAmount,
          pendingEmis,
          nextEmiDate
        }
      });
    } catch (error) {
      return apiError(res, 500, safeDbMessage(error));
    }
  }
);

/* ---------------- LOAN APPLICATIONS ---------------- */

app.get(
  "/api/admin/applications",
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("loan_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json({
        ok: true,
        applications: data || [],
        total: (data || []).length
      });
    } catch (error) {
      return apiError(res, 500, safeDbMessage(error));
    }
  }
);

app.patch(
  "/api/admin/applications/:applicationId/status",
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    const applicationId = cleanText(req.params.applicationId, 100);
    const status = cleanText(req.body?.status, 40).toLowerCase();

    const allowedStatuses = [
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "disbursed",
      "closed"
    ];

    if (!applicationId) {
      return apiError(res, 400, "Application ID is required.");
    }

    if (!allowedStatuses.includes(status)) {
      return apiError(res, 400, "Invalid application status.");
    }

    try {
      const { data, error } = await supabase
        .from("loan_applications")
        .update({ status })
        .eq("application_id", applicationId)
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (!data) return apiError(res, 404, "Application not found.");

      res.json({
        ok: true,
        message: "Application status updated.",
        application: data
      });
    } catch (error) {
      return apiError(res, 500, safeDbMessage(error));
    }
  }
);

/* ---------------- CUSTOMERS ---------------- */

app.get(
  "/api/admin/customers",
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json({
        ok: true,
        customers: data || [],
        total: (data || []).length
      });
    } catch (error) {
      return apiError(res, 500, safeDbMessage(error));
    }
  }
);

/* ---------------- EMI TRACKING ---------------- */

app.get(
  "/api/admin/emis",
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("emis")
        .select("*")
        .order("due_date", { ascending: true });

      if (error) throw error;

      res.json({
        ok: true,
        emis: data || [],
        total: (data || []).length
      });
    } catch (error) {
      return apiError(res, 500, safeDbMessage(error));
    }
  }
);

app.patch(
  "/api/admin/emis/:emiId/paid",
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    const emiId = cleanText(req.params.emiId, 100);

    if (!emiId) {
      return apiError(res, 400, "EMI ID is required.");
    }

    try {
      const { data, error } = await supabase
        .from("emis")
        .update({
          status: "paid",
          paid_at: new Date().toISOString()
        })
        .eq("id", emiId)
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (!data) return apiError(res, 404, "EMI record not found.");

      res.json({
        ok: true,
        message: "EMI marked as paid.",
        emi: data
      });
    } catch (error) {
      return apiError(res, 500, safeDbMessage(error));
    }
  }
);

/* ---------------- PUBLIC LOAN APPLICATION ---------------- */

app.post("/api/applications", requireDatabase, async (req, res) => {
  const body = req.body || {};

  const full_name = cleanText(body.full_name || body.fullName, 120);
  const mobile = cleanText(body.mobile, 10);
  const email = cleanText(body.email, 180);
  const address = cleanText(body.address, 500);
  const monthly_income = Number(body.monthly_income ?? body.monthlyIncome);
  const requested_amount = Number(
    body.requested_amount ?? body.requestedAmount
  );
  const tenure_months = Number(body.tenure_months ?? body.tenureMonths);

  if (!full_name || !validMobile(mobile) || !address) {
    return apiError(res, 400, "Enter a valid name, mobile number and address.");
  }

  if (
    !Number.isFinite(monthly_income) ||
    monthly_income <= 0 ||
    !validAmount(requested_amount) ||
    !Number.isInteger(tenure_months) ||
    tenure_months < 1 ||
    tenure_months > 360
  ) {
    return apiError(res, 400, "Please check income, loan amount and tenure.");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return apiError(res, 400, "Enter a valid email address.");
  }

  try {
    const application_id =
      "SFL-" +
      Date.now().toString(36).toUpperCase() +
      crypto.randomBytes(2).toString("hex").toUpperCase();

    const record = {
      application_id,
      full_name,
      mobile,
      email: email || null,
      monthly_income,
      requested_amount,
      tenure_months,
      address,
      status: "submitted"
    };

    const { data, error } = await supabase
      .from("loan_applications")
      .insert(record)
      .select("application_id, full_name, status, created_at")
      .single();

    if (error) throw error;

    res.status(201).json({
      ok: true,
      message: "Loan application submitted successfully.",
      application: data
    });
  } catch (error) {
    return apiError(res, 500, safeDbMessage(error));
  }
});

/* ---------------- UNKNOWN ROUTES ---------------- */

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "API endpoint not found."
  });
});

/* ---------------- START SERVER ---------------- */

app.listen(PORT, () => {
  console.log(`Shyam Fincorp API running on port ${PORT}`);
  console.log(`Supabase configured: ${Boolean(supabase)}`);
  console.log(`Admin key configured: ${Boolean(ADMIN_KEY)}`);
});
