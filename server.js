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

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function makeApplicationId() {
  return "SFL-" + Date.now().toString().slice(-8);
}

function makeLoanAccountNo() {
  return "SFLA-" + Date.now().toString().slice(-8);
}

function requireAdmin(req, res, next) {
  if (!ADMIN_KEY || req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

// --------------------------------------------------
// Basic routes
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Shyam Fincorp Loan API"
  });
});

app.get("/api/health", async (req, res) => {
  res.json({
    ok: true,
    service: "Shyam Fincorp Loan API",
    databaseConfigured: Boolean(
      SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    )
  });
});

// --------------------------------------------------
// Loan Application
// --------------------------------------------------

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

    if (
      !full_name ||
      !mobile ||
      !monthly_income ||
      !requested_amount ||
      !tenure_months ||
      !address
    ) {
      return res.status(400).json({
        error: "Required fields are missing"
      });
    }

    if (!/^[0-9]{10}$/.test(String(mobile))) {
      return res.status(400).json({
        error: "Mobile number must be 10 digits"
      });
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

      return res.status(500).json({
        error: "Could not save application"
      });
    }

    res.status(201).json(data);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

// --------------------------------------------------
// Admin: Applications
// --------------------------------------------------

app.get("/api/applications", requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from("loan_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not load applications"
    });
  }

  res.json(data);
});

app.patch(
  "/api/applications/:applicationId/status",
  requireAdmin,
  async (req, res) => {
    try {
      const allowed = [
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "disbursed",
        "closed"
      ];

      const { status } = req.body;

      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: "Invalid status"
        });
      }

      const { data, error } = await supabase
        .from("loan_applications")
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq("application_id", req.params.applicationId)
        .select("application_id,status")
        .single();

      if (error) {
        console.error(error);

        return res.status(500).json({
          error: "Could not update application"
        });
      }

      res.json(data);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Server error"
      });
    }
  }
);

// --------------------------------------------------
// ADMIN: Create Loan Account
// --------------------------------------------------

app.post("/api/admin/loan-accounts", requireAdmin, async (req, res) => {
  try {
    const {
      application_id,
      principal,
      annual_interest_rate,
      tenure_months
    } = req.body;

    if (
      !application_id ||
      !principal ||
      annual_interest_rate === undefined ||
      !tenure_months
    ) {
      return res.status(400).json({
        error: "Required loan fields are missing"
      });
    }

    // Find application
    const { data: application, error: applicationError } =
      await supabase
        .from("loan_applications")
        .select("*")
        .eq("application_id", application_id)
        .single();

    if (applicationError || !application) {
      return res.status(404).json({
        error: "Application not found"
      });
    }

    // Create / find customer
    let { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("mobile", application.mobile)
      .maybeSingle();

    if (!customer) {
      const { data: newCustomer, error: customerError } =
        await supabase
          .from("customers")
          .insert({
            full_name: application.full_name,
            mobile: application.mobile,
            email: application.email,
            address: application.address
          })
          .select("*")
          .single();

      if (customerError) {
        console.error(customerError);

        return res.status(500).json({
          error: "Could not create customer"
        });
      }

      customer = newCustomer;
    }

    const loan_account_no = makeLoanAccountNo();

    const principalAmount = Number(principal);
    const rate = Number(annual_interest_rate);
    const tenure = Number(tenure_months);

    // EMI calculation
    const monthlyRate = rate / 12 / 100;

    let emi;

    if (monthlyRate === 0) {
      emi = principalAmount / tenure;
    } else {
      emi =
        (principalAmount *
          monthlyRate *
          Math.pow(1 + monthlyRate, tenure)) /
        (Math.pow(1 + monthlyRate, tenure) - 1);
    }

    emi = Number(emi.toFixed(2));

    // Create loan account
    const { data: loan, error: loanError } = await supabase
      .from("loan_accounts")
      .insert({
        loan_account_no,
        application_id: application.id,
        customer_id: customer.id,
        principal: principalAmount,
        annual_interest_rate: rate,
        tenure_months: tenure,
        emi,
        status: "active",
        disbursed_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (loanError) {
      console.error(loanError);

      return res.status(500).json({
        error: "Could not create loan account"
      });
    }

    // Create EMI schedule
    const schedule = [];

    let balance = principalAmount;

    for (let i = 1; i <= tenure; i++) {
      let interestDue;

      if (monthlyRate === 0) {
        interestDue = 0;
      } else {
        interestDue = balance * monthlyRate;
      }

      interestDue = Number(interestDue.toFixed(2));

      let principalDue = Number(
        (emi - interestDue).toFixed(2)
      );

      // Correct final installment rounding
      if (i === tenure) {
        principalDue = Number(balance.toFixed(2));
      }

      let totalDue = Number(
        (principalDue + interestDue).toFixed(2)
      );

      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        loan_account_id: loan.id,
        installment_no: i,
        due_date: dueDate.toISOString().slice(0, 10),
        principal_due: principalDue,
        interest_due: interestDue,
        total_due: totalDue,
        paid_amount: 0,
        status: "pending"
      });

      balance = Number(
        (balance - principalDue).toFixed(2)
      );

      if (balance < 0) {
        balance = 0;
      }
    }

    const { error: scheduleError } = await supabase
      .from("emi_schedule")
      .insert(schedule);

    if (scheduleError) {
      console.error(scheduleError);

      return res.status(500).json({
        error: "Loan created but EMI schedule could not be created"
      });
    }

    res.status(201).json({
      success: true,
      loan_account_no,
      emi,
      tenure_months: tenure
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

// --------------------------------------------------
// CUSTOMER: Find Loan
// --------------------------------------------------

app.post("/api/customer/loan", async (req, res) => {
  try {
    const {
      application_id,
      mobile
    } = req.body;

    if (!application_id || !mobile) {
      return res.status(400).json({
        error: "Application ID and mobile are required"
      });
    }

    if (!/^[0-9]{10}$/.test(String(mobile))) {
      return res.status(400).json({
        error: "Mobile number must be 10 digits"
      });
    }

    // First verify application + mobile
    const { data: application, error: applicationError } =
      await supabase
        .from("loan_applications")
        .select("*")
        .eq("application_id", application_id)
        .eq("mobile", mobile)
        .maybeSingle();

    if (applicationError || !application) {
      return res.status(404).json({
        error: "Loan record not found"
      });
    }

    // Find loan account
    const { data: loan, error: loanError } =
      await supabase
        .from("loan_accounts")
        .select("*")
        .eq("application_id", application.id)
        .maybeSingle();

    if (loanError || !loan) {
      return res.status(404).json({
        error: "Active loan account not found"
      });
    }

    // EMI schedule
    const { data: schedule, error: scheduleError } =
      await supabase
        .from("emi_schedule")
        .select("*")
        .eq("loan_account_id", loan.id)
        .order("installment_no", { ascending: true });

    if (scheduleError) {
      return res.status(500).json({
        error: "Could not load EMI schedule"
      });
    }

    res.json({
      customer: {
        full_name: application.full_name,
        mobile: application.mobile
      },
      loan: {
        loan_account_no: loan.loan_account_no,
        principal: loan.principal,
        annual_interest_rate: loan.annual_interest_rate,
        tenure_months: loan.tenure_months,
        emi: loan.emi,
        status: loan.status
      },
      emi_schedule: schedule
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

// --------------------------------------------------
// CUSTOMER: Test/Demo EMI Payment
// --------------------------------------------------

app.post("/api/customer/pay-emi-test", async (req, res) => {
  try {
    const {
      application_id,
      mobile,
      installment_no,
      payment_method
    } = req.body;

    if (
      !application_id ||
      !mobile ||
      !installment_no
    ) {
      return res.status(400).json({
        error: "Application ID, mobile and installment number are required"
      });
    }

    if (!/^[0-9]{10}$/.test(String(mobile))) {
      return res.status(400).json({
        error: "Mobile number must be 10 digits"
      });
    }

    // Verify application
    const { data: application, error: applicationError } =
      await supabase
        .from("loan_applications")
        .select("*")
        .eq("application_id", application_id)
        .eq("mobile", mobile)
        .maybeSingle();

    if (applicationError || !application) {
      return res.status(404).json({
        error: "Loan record not found"
      });
    }

    // Find loan
    const { data: loan, error: loanError } =
      await supabase
        .from("loan_accounts")
        .select("*")
        .eq("application_id", application.id)
        .maybeSingle();

    if (loanError || !loan) {
      return res.status(404).json({
        error: "Loan account not found"
      });
    }

    // Find EMI
    const { data: emi, error: emiError } =
      await supabase
        .from("emi_schedule")
        .select("*")
        .eq("loan_account_id", loan.id)
        .eq("installment_no", Number(installment_no))
        .maybeSingle();

    if (emiError || !emi) {
      return res.status(404).json({
        error: "EMI installment not found"
      });
    }

    if (emi.status === "paid") {
      return res.status(400).json({
        error: "This EMI is already paid"
      });
    }

    const amount = Number(
      (Number(emi.total_due) - Number(emi.paid_amount || 0)).toFixed(2)
    );

    if (amount <= 0) {
      return res.status(400).json({
        error: "No amount is due for this EMI"
      });
    }

    const method = payment_method || "demo";

    // Demo transaction reference
    const transaction_reference =
      "TEST-" +
      Date.now().toString() +
      "-" +
      Math.floor(Math.random() * 10000);

    // Record payment
    const { data: payment, error: paymentError } =
      await supabase
        .from("payments")
        .insert({
          loan_account_id: loan.id,
          amount,
          payment_method: method,
          transaction_reference,
          status: "received"
        })
        .select("*")
        .single();

    if (paymentError) {
      console.error(paymentError);

      return res.status(500).json({
        error: "Could not create payment record"
      });
    }

    // Mark EMI paid
    const { data: updatedEmi, error: updateError } =
      await supabase
        .from("emi_schedule")
        .update({
          paid_amount: amount,
          status: "paid",
          paid_at: new Date().toISOString()
        })
        .eq("id", emi.id)
        .select("*")
        .single();

    if (updateError) {
      console.error(updateError);

      return res.status(500).json({
        error: "Payment recorded but EMI status could not be updated"
      });
    }

    res.json({
      success: true,
      demo: true,
      message: "Demo EMI payment successful",
      transaction_reference,
      amount,
      installment_no: emi.installment_no,
      emi: updatedEmi
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

// --------------------------------------------------
// CUSTOMER: Payment History
// --------------------------------------------------

app.post("/api/customer/payment-history", async (req, res) => {
  try {
    const {
      application_id,
      mobile
    } = req.body;

    if (!application_id || !mobile) {
      return res.status(400).json({
        error: "Application ID and mobile are required"
      });
    }

    const { data: application } = await supabase
      .from("loan_applications")
      .select("id")
      .eq("application_id", application_id)
      .eq("mobile", mobile)
      .maybeSingle();

    if (!application) {
      return res.status(404).json({
        error: "Loan record not found"
      });
    }

    const { data: loan } = await supabase
      .from("loan_accounts")
      .select("id,loan_account_no")
      .eq("application_id", application.id)
      .maybeSingle();

    if (!loan) {
      return res.status(404).json({
        error: "Loan account not found"
      });
    }

    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("loan_account_id", loan.id)
      .order("payment_date", { ascending: false });

    if (error) {
      return res.status(500).json({
        error: "Could not load payment history"
      });
    }

    res.json({
      loan_account_no: loan.loan_account_no,
      payments: payments || []
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

// --------------------------------------------------
// ADMIN: Payment List
// --------------------------------------------------

app.get("/api/admin/payments", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        loan_accounts (
          loan_account_no,
          customer_id
        )
      `)
      .order("payment_date", { ascending: false });

    if (error) {
      console.error(error);

      return res.status(500).json({
        error: "Could not load payments"
      });
    }

    res.json(data || []);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Shyam Fincorp Loan API running on port ${PORT}`
  );
});
