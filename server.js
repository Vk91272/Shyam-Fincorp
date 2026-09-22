const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 10000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(
  SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY || ""
);

// ==================================================
// HELPERS
// ==================================================

function makeApplicationId() {
  return "SFL-" + Date.now().toString().slice(-8);
}

function makeLoanAccountNo() {
  return "SFLA-" + Date.now().toString().slice(-8);
}

function makeInquiryId() {
  return "INQ-" + Date.now().toString().slice(-8);
}

function requireAdmin(req, res, next) {
  if (
    !ADMIN_KEY ||
    req.headers["x-admin-key"] !== ADMIN_KEY
  ) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  next();
}

// ==================================================
// EMI CALCULATOR
// ==================================================

function calculateEmi(
  principal,
  annualRate,
  tenureMonths
) {
  const p = Number(principal);
  const rate = Number(annualRate);
  const n = Number(tenureMonths);

  if (!p || !n) {
    return 0;
  }

  const monthlyRate = rate / 12 / 100;

  let emi;

  if (monthlyRate === 0) {
    emi = p / n;
  } else {
    emi =
      (p *
        monthlyRate *
        Math.pow(1 + monthlyRate, n)) /
      (Math.pow(1 + monthlyRate, n) - 1);
  }

  return Number(emi.toFixed(2));
}

// ==================================================
// EMI SCHEDULE BUILDER
// ==================================================

function buildEmiSchedule(
  loanAccountId,
  principal,
  annualRate,
  tenureMonths,
  startDate = new Date()
) {
  const p = Number(principal);
  const rate = Number(annualRate);
  const tenure = Number(tenureMonths);

  const monthlyRate = rate / 12 / 100;

  const emi = calculateEmi(
    p,
    rate,
    tenure
  );

  const schedule = [];

  let balance = p;

  for (let i = 1; i <= tenure; i++) {
    let interestDue = 0;

    if (monthlyRate > 0) {
      interestDue =
        balance * monthlyRate;
    }

    interestDue = Number(
      interestDue.toFixed(2)
    );

    let principalDue =
      emi - interestDue;

    // Last EMI rounding correction
    if (i === tenure) {
      principalDue = balance;
    }

    principalDue = Number(
      principalDue.toFixed(2)
    );

    if (principalDue < 0) {
      principalDue = 0;
    }

    let totalDue =
      principalDue + interestDue;

    totalDue = Number(
      totalDue.toFixed(2)
    );

    const dueDate = new Date(startDate);

    dueDate.setMonth(
      dueDate.getMonth() + i
    );

    schedule.push({
      loan_account_id: loanAccountId,
      installment_no: i,
      due_date: dueDate
        .toISOString()
        .slice(0, 10),

      principal_due: principalDue,
      interest_due: interestDue,
      total_due: totalDue,

      paid_amount: 0,
      status: "pending"
    });

    balance =
      balance - principalDue;

    balance = Number(
      balance.toFixed(2)
    );

    if (balance < 0) {
      balance = 0;
    }
  }

  return {
    emi,
    schedule
  };
}

// ==================================================
// BASIC
// ==================================================

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
      SUPABASE_URL &&
        SUPABASE_SERVICE_ROLE_KEY
    )
  });
});

// ==================================================
// DOCUMENT UPLOAD
// ==================================================

const ALLOWED_DOCUMENT_TYPES = [
  "identity_proof",
  "pan_card",
  "address_proof",
  "income_proof",
  "applicant_photo"
];

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf"
];

const MAX_DOCUMENT_SIZE =
  5 * 1024 * 1024;

app.post(
  "/api/documents/upload-url",
  async (req, res) => {
    try {
      const {
        application_id,
        document_type,
        file_name,
        file_type,
        file_size
      } = req.body;

      if (
        !application_id ||
        !document_type ||
        !file_name ||
        !file_type ||
        !file_size
      ) {
        return res.status(400).json({
          error:
            "Document information is missing"
        });
      }

      if (
        !ALLOWED_DOCUMENT_TYPES.includes(
          document_type
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid document type"
        });
      }

      if (
        !ALLOWED_FILE_TYPES.includes(
          file_type
        )
      ) {
        return res.status(400).json({
          error:
            "Only JPG, PNG and PDF files are allowed"
        });
      }

      if (
        Number(file_size) <= 0 ||
        Number(file_size) >
          MAX_DOCUMENT_SIZE
      ) {
        return res.status(400).json({
          error:
            "Each document must be 5 MB or smaller"
        });
      }

      const {
        data: application,
        error: applicationError
      } = await supabase
        .from("loan_applications")
        .select(
          "id, application_id"
        )
        .eq(
          "application_id",
          application_id
        )
        .single();

      if (
        applicationError ||
        !application
      ) {
        return res.status(404).json({
          error:
            "Loan application not found"
        });
      }

      const extension =
        file_name
          .split(".")
          .pop()
          .toLowerCase();

      const safeExtension =
        /^[a-z0-9]+$/.test(
          extension
        )
          ? extension
          : "bin";

      const uniqueName =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}.${safeExtension}`;

      const storagePath =
        `${application_id}/${document_type}/${uniqueName}`;

      const {
        data: signedUpload,
        error: signedUploadError
      } = await supabase
        .storage
        .from("loan-documents")
        .createSignedUploadUrl(
          storagePath
        );

      if (signedUploadError) {
        console.error(
          signedUploadError
        );

        return res.status(500).json({
          error:
            "Could not create document upload URL"
        });
      }

      res.json({
        success: true,
        path: storagePath,
        token:
          signedUpload.token,
        signedUrl:
          signedUpload.signedUrl
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Document upload setup failed"
      });
    }
  }
);

// ==================================================
// ELIGIBILITY
// ==================================================

app.post(
  "/api/eligibility",
  async (req, res) => {
    try {
      const {
        full_name,
        mobile,
        email,
        age,
        employment_type,
        monthly_income,
        existing_emi,
        requested_amount,
        tenure_months
      } = req.body;

      if (
        !full_name ||
        !mobile ||
        !age ||
        !employment_type ||
        monthly_income ===
          undefined ||
        existing_emi ===
          undefined ||
        !requested_amount ||
        !tenure_months
      ) {
        return res.status(400).json({
          error:
            "Required eligibility fields are missing"
        });
      }

      if (
        !/^[0-9]{10}$/.test(
          String(mobile)
        )
      ) {
        return res.status(400).json({
          error:
            "Mobile number must be 10 digits"
        });
      }

      const ageNumber =
        Number(age);

      const income =
        Number(monthly_income);

      const existingEmi =
        Number(existing_emi);

      const requestedAmount =
        Number(requested_amount);

      const tenure =
        Number(tenure_months);

      if (
        ageNumber < 18 ||
        ageNumber > 80
      ) {
        return res.status(400).json({
          error:
            "Age must be between 18 and 80"
        });
      }

      if (
        income < 0 ||
        existingEmi < 0
      ) {
        return res.status(400).json({
          error:
            "Income and existing EMI cannot be negative"
        });
      }

      if (requestedAmount <= 0) {
        return res.status(400).json({
          error:
            "Requested loan amount must be greater than zero"
        });
      }

      if (
        tenure < 1 ||
        tenure > 120
      ) {
        return res.status(400).json({
          error:
            "Tenure must be between 1 and 120 months"
        });
      }

      const estimatedRate = 12;

      const estimatedEmi =
        calculateEmi(
          requestedAmount,
          estimatedRate,
          tenure
        );

      const totalEmi =
        existingEmi +
        estimatedEmi;

      const emiRatio =
        income > 0
          ? totalEmi / income
          : 1;

      let eligibilityStatus;
      let eligibilityReason;

      if (emiRatio <= 0.40) {
        eligibilityStatus =
          "likely_eligible";

        eligibilityReason =
          "Estimated existing and proposed EMI is within the preliminary affordability range.";
      } else if (
        emiRatio <= 0.55
      ) {
        eligibilityStatus =
          "needs_review";

        eligibilityReason =
          "Estimated EMI burden requires further review of income, existing obligations and documents.";
      } else {
        eligibilityStatus =
          "not_eligible";

        eligibilityReason =
          "Estimated EMI burden is high compared with the declared monthly income.";
      }

      const inquiry_id =
        makeInquiryId();

      const {
        data,
        error
      } = await supabase
        .from("loan_inquiries")
        .insert({
          inquiry_id,
          full_name,
          mobile,
          email:
            email || null,
          age: ageNumber,
          employment_type,
          monthly_income:
            income,
          existing_emi:
            existingEmi,
          requested_amount:
            requestedAmount,
          tenure_months:
            tenure,
          estimated_interest_rate:
            estimatedRate,
          estimated_emi:
            estimatedEmi,
          eligibility_status:
            eligibilityStatus,
          eligibility_reason:
            eligibilityReason
        })
        .select(`
          inquiry_id,
          estimated_interest_rate,
          estimated_emi,
          eligibility_status,
          eligibility_reason
        `)
        .single();

      if (error) {
        console.error(error);

        return res.status(500).json({
          error:
            "Could not save eligibility inquiry"
        });
      }

      res.status(201).json({
        success: true,
        ...data,
        disclaimer:
          "This is a preliminary eligibility indication only and is not a loan approval."
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);

app.get(
  "/api/admin/inquiries",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from("loan_inquiries")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );

      if (error) {
        console.error(error);

        return res.status(500).json({
          error:
            "Could not load loan inquiries"
        });
      }

      res.json({
        inquiries: data || []
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);

// ==================================================
// LOAN APPLICATION
// ==================================================

app.post(
  "/api/applications",
  async (req, res) => {
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
          error:
            "Required fields are missing"
        });
      }

      if (
        !/^[0-9]{10}$/.test(
          String(mobile)
        )
      ) {
        return res.status(400).json({
          error:
            "Mobile number must be 10 digits"
        });
      }

      const application_id =
        makeApplicationId();

      const {
        data,
        error
      } = await supabase
        .from("loan_applications")
        .insert({
          application_id,
          full_name,
          mobile,
          email:
            email || null,
          monthly_income:
            Number(monthly_income),
          requested_amount:
            Number(requested_amount),
          tenure_months:
            Number(tenure_months),
          address,
          status: "submitted"
        })
        .select(
          "application_id,status"
        )
        .single();

      if (error) {
        console.error(error);

        return res.status(500).json({
          error:
            "Could not save application"
        });
      }

      res.status(201).json(data);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);

// ==================================================
// ADMIN APPLICATIONS
// ==================================================

app.get(
  "/api/applications",
  requireAdmin,
  async (req, res) => {
    const {
      data,
      error
    } = await supabase
      .from("loan_applications")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Could not load applications"
      });
    }

    res.json(data);
  }
);

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

      const { status } =
        req.body;

      if (
        !allowed.includes(status)
      ) {
        return res.status(400).json({
          error:
            "Invalid status"
        });
      }

      const {
        data,
        error
      } = await supabase
        .from("loan_applications")
        .update({
          status,
          updated_at:
            new Date().toISOString()
        })
        .eq(
          "application_id",
          req.params.applicationId
        )
        .select(
          "application_id,status"
        )
        .single();

      if (error) {
        console.error(error);

        return res.status(500).json({
          error:
            "Could not update application"
        });
      }

      res.json(data);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);

// ==================================================
// ADMIN CREATE LOAN ACCOUNT
// ==================================================

app.post(
  "/api/admin/loan-accounts",
  requireAdmin,
  async (req, res) => {
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
        annual_interest_rate ===
          undefined ||
        !tenure_months
      ) {
        return res.status(400).json({
          error:
            "Required loan fields are missing"
        });
      }

      // Find application
      const {
        data: application,
        error: applicationError
      } = await supabase
        .from("loan_applications")
        .select("*")
        .eq(
          "application_id",
          application_id
        )
        .single();

      if (
        applicationError ||
        !application
      ) {
        return res.status(404).json({
          error:
            "Application not found"
        });
      }

      // Prevent accidental duplicate loan
      const {
        data: existingLoan
      } = await supabase
        .from("loan_accounts")
        .select("*")
        .eq(
          "application_id",
          application.id
        )
        .maybeSingle();

      if (existingLoan) {
        return res.status(409).json({
          error:
            "Loan account already exists",
          loan_account_no:
            existingLoan.loan_account_no
        });
      }

      // Find/create customer
      let {
        data: customer
      } = await supabase
        .from("customers")
        .select("*")
        .eq(
          "mobile",
          application.mobile
        )
        .maybeSingle();

      if (!customer) {
        const {
          data: newCustomer,
          error:
            customerError
        } = await supabase
          .from("customers")
          .insert({
            full_name:
              application.full_name,
            mobile:
              application.mobile,
            email:
              application.email,
            address:
              application.address
          })
          .select("*")
          .single();

        if (customerError) {
          console.error(
            customerError
          );

          return res.status(500).json({
            error:
              "Could not create customer"
          });
        }

        customer =
          newCustomer;
      }

      const principalAmount =
        Number(principal);

      const rate =
        Number(
          annual_interest_rate
        );

      const tenure =
        Number(tenure_months);

      const loan_account_no =
        makeLoanAccountNo();

      const {
        emi,
        schedule
      } =
        buildEmiSchedule(
          "TEMP",
          principalAmount,
          rate,
          tenure
        );

      // Create loan
      const {
        data: loan,
        error: loanError
      } = await supabase
        .from("loan_accounts")
        .insert({
          loan_account_no,
          application_id:
            application.id,
          customer_id:
            customer.id,
          principal:
            principalAmount,
          annual_interest_rate:
            rate,
          tenure_months:
            tenure,
          emi,
          status: "active",
          disbursed_at:
            new Date().toISOString()
        })
        .select("*")
        .single();

      if (loanError) {
        console.error(
          loanError
        );

        return res.status(500).json({
          error:
            "Could not create loan account"
        });
      }

      // Replace temporary loan ID
      const finalSchedule =
        schedule.map(
          (row) => ({
            ...row,
            loan_account_id:
              loan.id
          })
        );

      const {
        error:
          scheduleError
      } = await supabase
        .from("emi_schedule")
        .insert(
          finalSchedule
        );

      if (scheduleError) {
        console.error(
          scheduleError
        );

        // Attempt cleanup
        await supabase
          .from("loan_accounts")
          .delete()
          .eq(
            "id",
            loan.id
          );

        return res.status(500).json({
          error:
            "Loan created but EMI schedule could not be created"
        });
      }

      // Mark application disbursed
      await supabase
        .from("loan_applications")
        .update({
          status: "disbursed",
          updated_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          application.id
        );

      res.status(201).json({
        success: true,
        loan_account_no,
        emi,
        tenure_months:
          tenure,
        principal:
          principalAmount,
        annual_interest_rate:
          rate
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);

// ==================================================
// ADMIN REBUILD EMI SCHEDULE
// ==================================================

app.post(
  "/api/admin/loan-accounts/rebuild-schedule",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        application_id
      } = req.body;

      if (!application_id) {
        return res.status(400).json({
          error:
            "Application ID is required"
        });
      }

      const {
        data: application
      } = await supabase
        .from("loan_applications")
        .select("id")
        .eq(
          "application_id",
          application_id
        )
        .maybeSingle();

      if (!application) {
        return res.status(404).json({
          error:
            "Application not found"
        });
      }

      const {
        data: loan,
        error: loanError
      } = await supabase
        .from("loan_accounts")
        .select("*")
        .eq(
          "application_id",
          application.id
        )
        .maybeSingle();

      if (
        loanError ||
        !loan
      ) {
        return res.status(404).json({
          error:
            "Loan account not found"
        });
      }

      const {
        data: oldSchedule,
        error:
          oldScheduleError
      } = await supabase
        .from("emi_schedule")
        .select("*")
        .eq(
          "loan_account_id",
          loan.id
        )
        .order(
          "installment_no",
          {
            ascending: true
          }
        );

      if (oldScheduleError) {
        return res.status(500).json({
          error:
            "Could not load old EMI schedule"
        });
      }

      // If actual payments exist, do not destroy them
      const hasRealPayments =
        (oldSchedule || []).some(
          (row) =>
            Number(
              row.paid_amount || 0
            ) > 0
        );

      if (hasRealPayments) {
        return res.status(400).json({
          error:
            "Schedule cannot be rebuilt because payments already exist"
        });
      }

      const {
        schedule
      } =
        buildEmiSchedule(
          loan.id,
          loan.principal,
          loan.annual_interest_rate,
          loan.tenure_months
        );

      const {
        error:
          deleteError
      } = await supabase
        .from("emi_schedule")
        .delete()
        .eq(
          "loan_account_id",
          loan.id
        );

      if (deleteError) {
        console.error(
          deleteError
        );

        return res.status(500).json({
          error:
            "Could not clear old EMI schedule"
        });
      }

      const {
        error:
          insertError
      } = await supabase
        .from("emi_schedule")
        .insert(
          schedule
        );

      if (insertError) {
        console.error(
          insertError
        );

        return res.status(500).json({
          error:
            "Could not rebuild EMI schedule"
        });
      }

      res.json({
        success: true,
        message:
          "EMI schedule rebuilt successfully",
        loan_account_no:
          loan.loan_account_no,
        emi: loan.emi,
        installments:
          schedule.length
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);

// ==================================================
// CUSTOMER FIND LOAN
// ==================================================

app.post(
  "/api/customer/loan",
  async (req, res) => {
    try {
      const {
        application_id,
        mobile
      } = req.body;

      if (
        !application_id ||
        !mobile
      ) {
        return res.status(400).json({
          error:
            "Application ID and mobile are required"
        });
      }

      if (
        !/^[0-9]{10}$/.test(
          String(mobile)
        )
      ) {
        return res.status(400).json({
          error:
            "Mobile number must be 10 digits"
        });
      }

      // Verify application
      const {
        data: application,
        error:
          applicationError
      } = await supabase
        .from("loan_applications")
        .select("*")
        .eq(
          "application_id",
          application_id
        )
        .eq(
          "mobile",
          mobile
        )
        .maybeSingle();

      if (
        applicationError ||
        !application
      ) {
        return res.status(404).json({
          error:
            "Loan record not found"
        });
      }

      // Find loan
      const {
        data: loan,
        error: loanError
      } = await supabase
        .from("loan_accounts")
        .select("*")
        .eq(
          "application_id",
          application.id
        )
        .maybeSingle();

      if (
        loanError ||
        !loan
      ) {
        return res.status(404).json({
          error:
            "Loan account not found"
        });
      }

      // EMI schedule
      const {
        data: schedule,
        error:
          scheduleError
      } = await supabase
        .from("emi_schedule")
        .select("*")
        .eq(
          "loan_account_id",
          loan.id
        )
        .order(
          "installment_no",
          {
            ascending: true
          }
        );

      if (scheduleError) {
        return res.status(500).json({
          error:
            "Could not load EMI schedule"
        });
      }

      const totalPaid =
        (schedule || []).reduce(
          (sum, row) =>
            sum +
            Number(
              row.paid_amount || 0
            ),
          0
        );

      const totalDue =
        (schedule || []).reduce(
          (sum, row) =>
            sum +
            Number(
              row.total_due || 0
            ),
          0
        );

      const outstandingAmount =
        Math.max(
          0,
          Number(
            (
              totalDue -
              totalPaid
            ).toFixed(2)
          )
        );

      const totalInterest =
        (schedule || []).reduce(
          (sum, row) =>
            sum +
            Number(
              row.interest_due || 0
            ),
          0
        );

      const paidInstallments =
        (schedule || []).filter(
          (row) =>
            row.status === "paid"
        ).length;

      const remainingInstallments =
        Math.max(
          0,
          (schedule || []).length -
            paidInstallments
        );

      res.json({
        customer: {
          full_name:
            application.full_name,
          mobile:
            application.mobile,
          email:
            application.email
        },

        application: {
          application_id:
            application.application_id,
          status:
            application.status
        },

        loan: {
          id: loan.id,
          loan_account_no:
            loan.loan_account_no,
          application_id:
            application.application_id,
          principal:
            loan.principal,
          annual_interest_rate:
            loan.annual_interest_rate,
          tenure_months:
            loan.tenure_months,
          emi: loan.emi,
          status:
            loan.status,

          total_interest:
            Number(
              totalInterest.toFixed(2)
            ),

          total_paid:
            Number(
              totalPaid.toFixed(2)
            ),

          total_due:
            Number(
              totalDue.toFixed(2)
            ),

          outstanding_amount:
            outstandingAmount,

          paid_installments:
            paidInstallments,

          remaining_installments:
            remainingInstallments
        },

        emi_schedule:
          schedule || []
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);

// ==================================================
// CUSTOMER PAY EMI
// ==================================================

app.post(
  "/api/customer/pay-emi-test",
  async (req, res) => {
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
          error:
            "Application ID, mobile and installment number are required"
        });
      }

      if (
        !/^[0-9]{10}$/.test(
          String(mobile)
        )
      ) {
        return res.status(400).json({
          error:
            "Mobile number must be 10 digits"
        });
      }

      // Verify application
      const {
        data: application,
        error:
          applicationError
      } = await supabase
        .from("loan_applications")
        .select("*")
        .eq(
          "application_id",
          application_id
        )
        .eq(
          "mobile",
          mobile
        )
        .maybeSingle();

      if (
        applicationError ||
        !application
      ) {
        return res.status(404).json({
          error:
            "Loan record not found"
        });
      }

      // Find loan
      const {
        data: loan,
        error: loanError
      } = await supabase
        .from("loan_accounts")
        .select("*")
        .eq(
          "application_id",
          application.id
        )
        .maybeSingle();

      if (
        loanError ||
        !loan
      ) {
        return res.status(404).json({
          error:
            "Loan account not found"
        });
      }

      // Already closed
      if (
        loan.status === "closed"
      ) {
        return res.status(400).json({
          error:
            "This loan has already been fully paid and closed."
        });
      }

      // Find EMI
      const {
        data: emi,
        error: emiError
      } = await supabase
        .from("emi_schedule")
        .select("*")
        .eq(
          "loan_account_id",
          loan.id
        )
        .eq(
          "installment_no",
          Number(installment_no)
        )
        .maybeSingle();

      if (
        emiError ||
        !emi
      ) {
        return res.status(404).json({
          error:
            "EMI installment not found"
        });
      }

      if (
        emi.status === "paid"
      ) {
        return res.status(400).json({
          error:
            "This EMI is already paid"
        });
      }

      const amount =
        Number(
          (
            Number(
              emi.total_due
            ) -
            Number(
              emi.paid_amount || 0
            )
          ).toFixed(2)
        );

      if (amount <= 0) {
        return res.status(400).json({
          error:
            "No amount is due for this EMI"
        });
      }

      const method =
        payment_method ||
        "demo";

      // Demo transaction
      const transaction_reference =
        "TEST-" +
        Date.now().toString() +
        "-" +
        Math.floor(
          Math.random() * 10000
        );

      // Record payment
      const {
        data: payment,
        error:
          paymentError
      } = await supabase
        .from("payments")
        .insert({
          loan_account_id:
            loan.id,
          amount,
          payment_method:
            method,
          transaction_reference,
          status:
            "received"
        })
        .select("*")
        .single();

      if (paymentError) {
        console.error(
          paymentError
        );

        return res.status(500).json({
          error:
            "Could not create payment record"
        });
      }

      // Mark EMI paid
      const {
        data: updatedEmi,
        error:
          updateError
      } = await supabase
        .from("emi_schedule")
        .update({
          paid_amount:
            amount,
          status:
            "paid",
          paid_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          emi.id
        )
        .select("*")
        .single();

      if (updateError) {
        console.error(
          updateError
        );

        return res.status(500).json({
          error:
            "Payment recorded but EMI status could not be updated"
        });
      }

      // ==================================================
      // CHECK WHETHER ALL EMIs ARE PAID
      // ==================================================

      const {
        data: allSchedule,
        error:
          allScheduleError
      } = await supabase
        .from("emi_schedule")
        .select(
          "id, installment_no, total_due, paid_amount, status"
        )
        .eq(
          "loan_account_id",
          loan.id
        );

      if (!allScheduleError) {

        const allPaid =
          allSchedule &&
          allSchedule.length > 0 &&
          allSchedule.every(
            (row) =>
              row.status ===
                "paid" &&
              Number(
                row.paid_amount || 0
              ) >=
                Number(
                  row.total_due || 0
                ) - 0.01
          );

        // ==================================================
        // AUTOMATIC LOAN CLOSURE
        // ==================================================

        if (allPaid) {

          const {
            error:
              closeLoanError
          } = await supabase
            .from("loan_accounts")
            .update({
              status:
                "closed"
            })
            .eq(
              "id",
              loan.id
            );

          if (closeLoanError) {
            console.error(
              "Loan close error:",
              closeLoanError
            );
          }

          const {
            error:
              closeApplicationError
          } = await supabase
            .from("loan_applications")
            .update({
              status:
                "closed",
              updated_at:
                new Date().toISOString()
            })
            .eq(
              "id",
              application.id
            );

          if (
            closeApplicationError
          ) {
            console.error(
              "Application close error:",
              closeApplicationError
            );
          }
        }
      }

      // Get latest loan status
      const {
        data: latestLoan
      } = await supabase
        .from("loan_accounts")
        .select(
          "loan_account_no,status"
        )
        .eq(
          "id",
          loan.id
        )
        .single();

      const isLoanClosed =
        latestLoan?.status ===
        "closed";

      res.json({
        success: true,

        demo: true,

        message:
          isLoanClosed
            ? "Final EMI paid successfully. Loan is now fully paid and automatically closed."
            : "Demo EMI payment successful",

        transaction_reference,

        amount,

        installment_no:
          emi.installment_no,

        emi: updatedEmi,

        loan_status:
          latestLoan?.status ||
          loan.status,

        loan_closed:
          isLoanClosed
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);

// ==================================================
// CUSTOMER PAYMENT HISTORY
// ==================================================

app.post(
  "/api/customer/payment-history",
  async (req, res) => {
    try {
      const {
        application_id,
        mobile
      } = req.body;

      if (
        !application_id ||
        !mobile
      ) {
        return res.status(400).json({
          error:
            "Application ID and mobile are required"
        });
      }

      const {
        data: application
      } = await supabase
        .from("loan_applications")
        .select(
          "id,full_name"
        )
        .eq(
          "application_id",
          application_id
        )
        .eq(
          "mobile",
          mobile
        )
        .maybeSingle();

      if (!application) {
        return res.status(404).json({
          error:
            "Loan record not found"
        });
      }

      const {
        data: loan
      } = await supabase
        .from("loan_accounts")
        .select(
          "id,loan_account_no,status"
        )
        .eq(
          "application_id",
          application.id
        )
        .maybeSingle();

      if (!loan) {
        return res.status(404).json({
          error:
            "Loan account not found"
        });
      }

      const {
        data: payments,
        error
      } = await supabase
        .from("payments")
        .select("*")
        .eq(
          "loan_account_id",
          loan.id
        )
        .order(
          "payment_date",
          {
            ascending: false
          }
        );

      if (error) {
        return res.status(500).json({
          error:
            "Could not load payment history"
        });
      }

      res.json({
        loan_account_no:
          loan.loan_account_no,

        loan_status:
          loan.status,

        payments:
          payments || []
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);

// ==================================================
// ADMIN PAYMENT LIST
// ==================================================

app.get(
  "/api/admin/payments",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from("payments")
        .select(`
          *,
          loan_accounts (
            loan_account_no,
            customer_id
          )
        `)
        .order(
          "payment_date",
          {
            ascending: false
          }
        );

      if (error) {
        console.error(error);

        return res.status(500).json({
          error:
            "Could not load payments"
        });
      }

      res.json(data || []);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);

// ==================================================
// START SERVER
// ==================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Shyam Fincorp Loan API running on port ${PORT}`
    );
  }
);
