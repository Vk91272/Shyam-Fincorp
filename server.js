
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

/* ---------------- RECORD EMI PAYMENT ---------------- */

app.post(
  "/api/admin/emis/:emiId/record-payment",
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    const emiId = cleanText(req.params.emiId, 100);
    const paymentMethod = cleanText(req.body?.payment_method, 40);
    const notes = cleanText(req.body?.notes, 200);

    const allowedMethods = [
      "cash",
      "bank_transfer",
      "upi_manual",
      "cheque",
      "manual_collection"
    ];

    if (!emiId || !allowedMethods.includes(paymentMethod)) {
      return apiError(res, 400, "Invalid EMI ID or payment method.");
    }

    let paymentId = null;

    try {
      // 1. Find the EMI
      const { data: emi, error: emiError } = await supabase
        .from("emis")
        .select("*")
        .eq("id", emiId)
        .maybeSingle();

      if (emiError) throw emiError;
      if (!emi) return apiError(res, 404, "EMI record not found.");

      if (String(emi.status).toLowerCase() === "paid") {
        return apiError(res, 409, "This EMI is already marked as paid.");
      }

      // 2. Find the application
      const { data: application, error: appError } = await supabase
        .from("loan_applications")
        .select("id, application_id")
        .eq("application_id", emi.application_id)
        .maybeSingle();

      if (appError) throw appError;
      if (!application) {
        return apiError(res, 404, "Related loan application not found.");
      }

      // 3. Find the related loan account
      const { data: account, error: accountError } = await supabase
        .from("loan_accounts")
        .select("id")
        .eq("application_id", application.id)
        .maybeSingle();

      if (accountError) throw accountError;
      if (!account) {
        return apiError(res, 404, "Related loan account not found.");
      }

      const amount = Number(emi.emi_amount ?? emi.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        return apiError(res, 400, "Invalid EMI amount.");
      }

      const receivedAt = new Date().toISOString();
      const reference =
        notes ||
        "SFL-PAY-" +
          Date.now().toString(36).toUpperCase() +
          crypto.randomBytes(3).toString("hex").toUpperCase();

      // 4. Record the receipt
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          loan_account_id: account.id,
          amount,
          payment_method: paymentMethod,
          transaction_reference: reference,
          payment_date: receivedAt,
          status: "completed"
        })
        .select("id")
        .single();

      if (paymentError) throw paymentError;
      paymentId = payment.id;

      // 5. Mark the EMI as paid
      const { data: updatedEmi, error: updateError } = await supabase
        .from("emis")
        .update({
          status: "paid",
          paid_at: receivedAt
        })
        .eq("id", emiId)
        .neq("status", "paid")
        .select("*")
        .maybeSingle();

      if (updateError) throw updateError;

      if (!updatedEmi) {
        throw new Error(
          "EMI was not updated. Another action may have changed its status."
        );
      }

      return res.json({
        ok: true,
        message: "Payment recorded and EMI marked as paid.",
        paymentId: payment.id,
        amount,
        emi: updatedEmi
      });
    } catch (error) {
      // Remove the receipt if the EMI update failed
      if (paymentId) {
        const { error: cleanupError } = await supabase
          .from("payments")
          .delete()
          .eq("id", paymentId);

        if (cleanupError) {
          console.error(
            "Payment cleanup failed:",
            cleanupError.message
          );
        }
      }

      console.error("Record EMI payment failed:", error?.message || error);

      return apiError(
        res,
        500,
        safeDbMessage(error)
      );
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

/* -------- LMS: LOAN ACCOUNTS -------- */
app.get(
  "/api/admin/loan-accounts",
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    try {
      const { data: accounts, error } = await supabase
        .from("loan_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = accounts || [];
      const customerIds = [...new Set(
        rows.map(x => x.customer_id).filter(Boolean)
      )];
      const applicationIds = [...new Set(
        rows.map(x => x.application_id).filter(Boolean)
      )];

      const [customerResult, applicationResult] = await Promise.all([
        customerIds.length
          ? supabase.from("customers").select("*").in("id", customerIds)
          : Promise.resolve({ data: [], error: null }),
        applicationIds.length
          ? supabase.from("loan_applications")
              .select("id,application_id,full_name,mobile")
              .in("id", applicationIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (customerResult.error) throw customerResult.error;
      if (applicationResult.error) throw applicationResult.error;

      const customers = new Map(
        (customerResult.data || []).map(x => [x.id, x])
      );
      const applications = new Map(
        (applicationResult.data || []).map(x => [x.id, x])
      );

      res.json({
        ok: true,
        loanAccounts: rows.map(x => {
          const customer = customers.get(x.customer_id) || {};
          const application = applications.get(x.application_id) || {};
          return {
            ...x,
            application_id: application.application_id || "",
            customer_name: customer.full_name || application.full_name || "",
            mobile: customer.mobile || application.mobile || "",
            emi_amount: x.emi ?? x.emi_amount ?? 0
          };
        })
      });
    } catch (error) {
      return apiError(res, 500, safeDbMessage(error));
    }
  }
);

/* -------- LMS: PAYMENT REGISTER -------- */
app.get(
  "/api/admin/payments",
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    try {
      const { data: payments, error } = await supabase
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false });

      if (error) throw error;

      const rows = payments || [];
      const accountIds = [...new Set(
        rows.map(x => x.loan_account_id).filter(Boolean)
      )];

      const { data: accounts, error: accountError } = accountIds.length
        ? await supabase.from("loan_accounts").select("*").in("id", accountIds)
        : { data: [], error: null };

      if (accountError) throw accountError;

      const accountRows = accounts || [];
      const customerIds = [...new Set(
        accountRows.map(x => x.customer_id).filter(Boolean)
      )];
      const applicationIds = [...new Set(
        accountRows.map(x => x.application_id).filter(Boolean)
      )];

      const [customerResult, applicationResult] = await Promise.all([
        customerIds.length
          ? supabase.from("customers").select("*").in("id", customerIds)
          : Promise.resolve({ data: [], error: null }),
        applicationIds.length
          ? supabase.from("loan_applications")
              .select("id,application_id,full_name,mobile")
              .in("id", applicationIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (customerResult.error) throw customerResult.error;
      if (applicationResult.error) throw applicationResult.error;

      const accountMap = new Map(accountRows.map(x => [x.id, x]));
      const customerMap = new Map(
        (customerResult.data || []).map(x => [x.id, x])
      );
      const applicationMap = new Map(
        (applicationResult.data || []).map(x => [x.id, x])
      );

      res.json({
        ok: true,
        payments: rows.map(p => {
          const account = accountMap.get(p.loan_account_id) || {};
          const customer = customerMap.get(account.customer_id) || {};
          const application = applicationMap.get(account.application_id) || {};
          return {
            ...p,
            payment_ref: p.transaction_reference || p.id,
            customer_name: customer.full_name || application.full_name || "",
            mobile: customer.mobile || application.mobile || "",
            application_id: application.application_id || "",
            paid_at: p.payment_date
          };
        })
      });
    } catch (error) {
      return apiError(res, 500, safeDbMessage(error));
    }
  }
);

/* ---------------- LMS: RECORD LOAN DISBURSEMENT ---------------- */

app.post(
  "/api/admin/disburse",
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    const applicationId = cleanText(req.body?.application_id, 100);
    const annualRate = Number(req.body?.annual_interest_rate ?? 12);

    if (!applicationId) {
      return apiError(res, 400, "Application ID is required.");
    }

    if (
      !Number.isFinite(annualRate) ||
      annualRate < 0 ||
      annualRate > 100
    ) {
      return apiError(res, 400, "Interest rate must be between 0 and 100.");
    }

    try {
      // Find application
      const { data: application, error: appError } = await supabase
        .from("loan_applications")
        .select("*")
        .eq("application_id", applicationId)
        .maybeSingle();

      if (appError) throw appError;

      if (!application) {
        return apiError(res, 404, "Loan application not found.");
      }

      if (String(application.status).toLowerCase() !== "approved") {
        return apiError(
          res,
          400,
          "Only approved applications can be disbursed."
        );
      }

      const principal = Number(application.requested_amount);
      const months = Number(application.tenure_months);

      if (
        !Number.isFinite(principal) ||
        principal <= 0 ||
        !Number.isInteger(months) ||
        months < 1 ||
        months > 360
      ) {
        return apiError(res, 400, "Invalid loan amount or tenure.");
      }

      // Prevent duplicate account creation
      const { data: existing, error: existingError } = await supabase
        .from("loan_accounts")
        .select("id, loan_account_no")
        .eq("application_id", application.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        return apiError(
          res,
          409,
          `Loan account already exists: ${existing.loan_account_no}`
        );
      }

      // Find customer by mobile
      const { data: foundCustomer, error: customerFindError } =
        await supabase
          .from("customers")
          .select("*")
          .eq("mobile", application.mobile)
          .maybeSingle();

      if (customerFindError) throw customerFindError;

      let customer = foundCustomer;

      // Create customer if needed
      if (!customer) {
        const { data, error } = await supabase
          .from("customers")
          .insert({
            full_name: application.full_name,
            mobile: application.mobile,
            email: application.email || null,
            address: application.address || null
          })
          .select("*")
          .single();

        if (error) throw error;
        customer = data;
      }

      // Calculate monthly EMI
      const monthlyRate = annualRate / 1200;

      const calculatedEmi = monthlyRate === 0
        ? principal / months
        : principal *
          monthlyRate *
          Math.pow(1 + monthlyRate, months) /
          (Math.pow(1 + monthlyRate, months) - 1);

      const emi = Math.round(calculatedEmi * 100) / 100;
      const disbursedAt = new Date();

      const loanAccountNo =
        "SFLA-" +
        Date.now().toString(36).toUpperCase() +
        crypto.randomBytes(3).toString("hex").toUpperCase();

      // Create loan account
      const { data: account, error: accountError } = await supabase
        .from("loan_accounts")
        .insert({
          loan_account_no: loanAccountNo,
          application_id: application.id,
          customer_id: customer.id,
          principal: principal,
          annual_interest_rate: annualRate,
          tenure_months: months,
          emi: emi,
          status: "active",
          disbursed_at: disbursedAt.toISOString()
        })
        .select("*")
        .single();

      if (accountError) throw accountError;

      // Calculate monthly due dates
      function getDueDate(startDate, monthOffset) {
        const year = startDate.getUTCFullYear();
        const month = startDate.getUTCMonth() + monthOffset;
        const day = startDate.getUTCDate();

        const firstOfMonth = new Date(Date.UTC(year, month, 1));
        const lastDay = new Date(Date.UTC(
          firstOfMonth.getUTCFullYear(),
          firstOfMonth.getUTCMonth() + 1,
          0
        )).getUTCDate();

        firstOfMonth.setUTCDate(Math.min(day, lastDay));
        return firstOfMonth.toISOString().slice(0, 10);
      }

      // Create EMI schedule
      const emiRows = Array.from({ length: months }, (_, index) => ({
        application_id: application.application_id,
        customer: application.full_name,
        amount: emi,
        emi_amount: emi,
        due_date: getDueDate(disbursedAt, index + 1),
        status: "pending"
      }));

      const { error: emiError } = await supabase
        .from("emis")
        .insert(emiRows);

      if (emiError) {
        // Best-effort cleanup if EMI schedule creation fails
        const { error: cleanupError } = await supabase
          .from("loan_accounts")
          .delete()
          .eq("id", account.id);

        if (cleanupError) {
          console.error("Loan account cleanup failed:", cleanupError.message);
        }

        throw emiError;
      }

      // Mark application disbursed after account and EMIs are created
      const { data: updatedApplication, error: statusError } =
        await supabase
          .from("loan_applications")
          .update({ status: "disbursed" })
          .eq("id", application.id)
          .select("application_id, status")
          .single();

      if (statusError) {
        console.error(
          "Application status update failed:",
          statusError.message
        );

        return apiError(
          res,
          500,
          "Loan account and EMI schedule were created, but application status update failed. Check Supabase before retrying."
        );
      }

      return res.status(201).json({
        ok: true,
        message: "Loan account created and EMI schedule generated.",
        application: updatedApplication,
        loanAccount: {
          id: account.id,
          loan_account_no: account.loan_account_no,
          principal: account.principal,
          emi: account.emi,
          tenure_months: account.tenure_months,
          annual_interest_rate: account.annual_interest_rate
        },
        emiCount: emiRows.length
      });
    } catch (error) {
      return apiError(res, 500, safeDbMessage(error));
    }
  }
);



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
