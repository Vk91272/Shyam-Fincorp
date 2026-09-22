const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 10000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_KEY = process.env.ADMIN_KEY;

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME;

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD;

const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  ADMIN_KEY;


/* =====================================================
   SUPABASE
===================================================== */

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  console.warn(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(
  SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY || ""
);


/* =====================================================
   HELPERS
===================================================== */

function makeApplicationId() {
  return (
    "SFL-" +
    Date.now()
      .toString()
      .slice(-8)
  );
}

function makeLoanAccountNo() {
  return (
    "SFLA-" +
    Date.now()
      .toString()
      .slice(-8)
  );
}

function makeInquiryId() {
  return (
    "INQ-" +
    Date.now()
      .toString()
      .slice(-8)
  );
}


/* =====================================================
   ADMIN TOKEN AUTH
===================================================== */

function createAdminToken() {
  const expiresAt =
    Date.now() +
    8 * 60 * 60 * 1000;

  const payload =
    `admin.${expiresAt}`;

  const signature =
    crypto
      .createHmac(
        "sha256",
        ADMIN_SESSION_SECRET
      )
      .update(payload)
      .digest("hex");

  return (
    `${payload}.${signature}`
  );
}


function verifyAdminToken(token) {
  if (!token) {
    return false;
  }

  const parts =
    token.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const role = parts[0];
  const expiresAt =
    Number(parts[1]);
  const signature = parts[2];

  if (role !== "admin") {
    return false;
  }

  if (
    !expiresAt ||
    Date.now() > expiresAt
  ) {
    return false;
  }

  const payload =
    `${role}.${expiresAt}`;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        ADMIN_SESSION_SECRET
      )
      .update(payload)
      .digest("hex");

  if (
    signature.length !==
    expectedSignature.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}


function requireAdmin(
  req,
  res,
  next
) {
  /* Old ADMIN_KEY support */

  if (
    ADMIN_KEY &&
    req.headers["x-admin-key"] ===
      ADMIN_KEY
  ) {
    return next();
  }

  /* New Bearer token support */

  const authorization =
    req.headers.authorization || "";

  if (
    authorization.startsWith(
      "Bearer "
    )
  ) {
    const token =
      authorization.substring(7);

    if (
      verifyAdminToken(token)
    ) {
      return next();
    }
  }

  return res.status(401).json({
    error: "Unauthorized"
  });
}


/* =====================================================
   DOCUMENT CONFIGURATION
===================================================== */

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


/* =====================================================
   BASIC ROUTES
===================================================== */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service:
      "Shyam Fincorp Loan API"
  });
});


app.get(
  "/api/health",
  async (req, res) => {
    res.json({
      ok: true,
      service:
        "Shyam Fincorp Loan API",
      databaseConfigured:
        Boolean(
          SUPABASE_URL &&
          SUPABASE_SERVICE_ROLE_KEY
        )
    });
  }
);


/* =====================================================
   ADMIN LOGIN
===================================================== */

app.post(
  "/api/admin/login",
  async (req, res) => {
    try {
      const {
        username,
        password
      } = req.body;

      if (
        !username ||
        !password
      ) {
        return res.status(400).json({
          error:
            "Username and password are required"
        });
      }

      if (
        !ADMIN_USERNAME ||
        !ADMIN_PASSWORD ||
        !ADMIN_SESSION_SECRET
      ) {
        return res.status(500).json({
          error:
            "Admin login is not configured on server"
        });
      }

      const usernameMatch =
        String(username) ===
        String(ADMIN_USERNAME);

      const passwordMatch =
        String(password) ===
        String(ADMIN_PASSWORD);

      if (
        !usernameMatch ||
        !passwordMatch
      ) {
        return res.status(401).json({
          error:
            "Invalid username or password"
        });
      }

      const token =
        createAdminToken();

      return res.json({
        success: true,
        token,
        username:
          ADMIN_USERNAME,
        expiresIn:
          8 * 60 * 60
      });

    } catch (error) {
      console.error(
        "Admin login error:",
        error
      );

      return res.status(500).json({
        error:
          "Admin login failed"
      });
    }
  }
);


/* =====================================================
   DOCUMENT UPLOAD URL
===================================================== */

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


/* =====================================================
   ELIGIBILITY INQUIRY
===================================================== */

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

      if (
        requestedAmount <= 0
      ) {
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

      const estimatedRate =
        12;

      const monthlyRate =
        estimatedRate /
        12 /
        100;

      let estimatedEmi;

      if (
        monthlyRate === 0
      ) {
        estimatedEmi =
          requestedAmount /
          tenure;
      } else {
        estimatedEmi =
          (
            requestedAmount *
            monthlyRate *
            Math.pow(
              1 + monthlyRate,
              tenure
            )
          ) /
          (
            Math.pow(
              1 + monthlyRate,
              tenure
            ) - 1
          );
      }

      estimatedEmi =
        Number(
          estimatedEmi.toFixed(2)
        );

      const totalExistingAndNewEmi =
        existingEmi +
        estimatedEmi;

      const emiRatio =
        income > 0
          ? totalExistingAndNewEmi /
            income
          : 1;

      let eligibilityStatus;
      let eligibilityReason;

      if (
        income <= 0
      ) {
        eligibilityStatus =
          "not_eligible";

        eligibilityReason =
          "Monthly income is required for preliminary assessment.";

      } else if (
        emiRatio <= 0.40
      ) {
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


/* =====================================================
   ADMIN: INQUIRIES
===================================================== */

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
        inquiries:
          data || []
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


/* =====================================================
   LOAN APPLICATION
===================================================== */

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
            Number(
              monthly_income
            ),
          requested_amount:
            Number(
              requested_amount
            ),
          tenure_months:
            Number(
              tenure_months
            ),
          address,
          status:
            "submitted"
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

      res.status(201).json(
        data
      );

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);


/* =====================================================
   ADMIN: APPLICATIONS
===================================================== */

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

    res.json(
      data
    );
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

      const {
        status
      } = req.body;

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

      res.json(
        data
      );

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);


/* =====================================================
   ADMIN CRM SEARCH
===================================================== */

app.get(
  "/api/admin/search",
  requireAdmin,
  async (req, res) => {
    try {
      const q =
        String(
          req.query.q || ""
        ).trim();

      if (!q) {
        return res.status(400).json({
          error:
            "Search query is required"
        });
      }

      const results = {
        customers: [],
        applications: [],
        loans: []
      };


      /* CUSTOMERS */

      const {
        data: customers,
        error: customerError
      } = await supabase
        .from("customers")
        .select("*")
        .or(
          `full_name.ilike.%${q}%,mobile.ilike.%${q}%`
        )
        .limit(20);

      if (customerError) {
        console.error(
          "Customer search error:",
          customerError
        );
      } else {
        results.customers =
          customers || [];
      }


      /* APPLICATIONS */

      const {
        data: applications,
        error: applicationError
      } = await supabase
        .from("loan_applications")
        .select("*")
        .or(
          `application_id.ilike.%${q}%,full_name.ilike.%${q}%,mobile.ilike.%${q}%`
        )
        .limit(20);

      if (applicationError) {
        console.error(
          "Application search error:",
          applicationError
        );
      } else {
        results.applications =
          applications || [];
      }


      /* LOANS */

      const {
        data: loans,
        error: loanError
      } = await supabase
        .from("loan_accounts")
        .select("*")
        .or(
          `loan_account_no.ilike.%${q}%`
        )
        .limit(20);

      if (loanError) {
        console.error(
          "Loan search error:",
          loanError
        );
      } else {
        results.loans =
          loans || [];
      }


      res.json({
        success: true,
        query: q,
        ...results
      });

    } catch (error) {
      console.error(
        "CRM search error:",
        error
      );

      res.status(500).json({
        error:
          "CRM search failed"
      });
    }
  }
);


/* =====================================================
   ADMIN CRM REPORTS
===================================================== */

app.get(
  "/api/admin/report/:type",
  requireAdmin,
  async (req, res) => {
    try {
      const type =
        req.params.type;

      let data = [];


      if (
        type ===
        "applications"
      ) {
        const result =
          await supabase
            .from(
              "loan_applications"
            )
            .select("*")
            .order(
              "created_at",
              {
                ascending:
                  false
              }
            );

        if (result.error) {
          throw result.error;
        }

        data =
          result.data || [];
      }


      else if (
        type ===
        "customers"
      ) {
        const result =
          await supabase
            .from(
              "customers"
            )
            .select("*")
            .order(
              "created_at",
              {
                ascending:
                  false
              }
            );

        if (result.error) {
          throw result.error;
        }

        data =
          result.data || [];
      }


      else if (
        type ===
        "loans"
      ) {
        const result =
          await supabase
            .from(
              "loan_accounts"
            )
            .select("*")
            .order(
              "disbursed_at",
              {
                ascending:
                  false
              }
            );

        if (result.error) {
          throw result.error;
        }

        data =
          result.data || [];
      }


      else if (
        type ===
        "payments"
      ) {
        const result =
          await supabase
            .from(
              "payments"
            )
            .select("*")
            .order(
              "payment_date",
              {
                ascending:
                  false
              }
            );

        if (result.error) {
          throw result.error;
        }

        data =
          result.data || [];
      }


      else if (
        type ===
        "inquiries"
      ) {
        const result =
          await supabase
            .from(
              "loan_inquiries"
            )
            .select("*")
            .order(
              "created_at",
              {
                ascending:
                  false
              }
            );

        if (result.error) {
          throw result.error;
        }

        data =
          result.data || [];
      }


      else {
        return res.status(400).json({
          error:
            "Invalid report type"
        });
      }


      res.json({
        success: true,
        report: type,
        count:
          data.length,
        data
      });

    } catch (error) {
      console.error(
        "Report error:",
        error
      );

      res.status(500).json({
        error:
          "Could not generate report"
      });
    }
  }
);


/* =====================================================
   ADMIN: CREATE LOAN ACCOUNT
===================================================== */

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


      const {
        data: application,
        error:
          applicationError
      } = await supabase
        .from(
          "loan_applications"
        )
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


      const loan_account_no =
        makeLoanAccountNo();

      const principalAmount =
        Number(principal);

      const rate =
        Number(
          annual_interest_rate
        );

      const tenure =
        Number(
          tenure_months
        );

      const monthlyRate =
        rate / 12 / 100;

      let emi;

      if (
        monthlyRate === 0
      ) {
        emi =
          principalAmount /
          tenure;
      } else {
        emi =
          (
            principalAmount *
            monthlyRate *
            Math.pow(
              1 + monthlyRate,
              tenure
            )
          ) /
          (
            Math.pow(
              1 + monthlyRate,
              tenure
            ) - 1
          );
      }

      emi =
        Number(
          emi.toFixed(2)
        );


      const {
        data: loan,
        error: loanError
      } = await supabase
        .from(
          "loan_accounts"
        )
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
          status:
            "active",
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


      const schedule = [];

      let balance =
        principalAmount;


      for (
        let i = 1;
        i <= tenure;
        i++
      ) {
        let interestDue;

        if (
          monthlyRate === 0
        ) {
          interestDue = 0;
        } else {
          interestDue =
            balance *
            monthlyRate;
        }

        interestDue =
          Number(
            interestDue.toFixed(2)
          );


        let principalDue =
          Number(
            (
              emi -
              interestDue
            ).toFixed(2)
          );


        if (
          i === tenure
        ) {
          principalDue =
            Number(
              balance.toFixed(2)
            );
        }


        let totalDue =
          Number(
            (
              principalDue +
              interestDue
            ).toFixed(2)
          );


        const dueDate =
          new Date();

        dueDate.setMonth(
          dueDate.getMonth() +
            i
        );


        schedule.push({
          loan_account_id:
            loan.id,
          installment_no:
            i,
          due_date:
            dueDate
              .toISOString()
              .slice(
                0,
                10
              ),
          principal_due:
            principalDue,
          interest_due:
            interestDue,
          total_due:
            totalDue,
          paid_amount:
            0,
          status:
            "pending"
        });


        balance =
          Number(
            (
              balance -
              principalDue
            ).toFixed(2)
          );

        if (
          balance < 0
        ) {
          balance = 0;
        }
      }


      const {
        error:
          scheduleError
      } = await supabase
        .from(
          "emi_schedule"
        )
        .insert(
          schedule
        );

      if (scheduleError) {
        console.error(
          scheduleError
        );

        return res.status(500).json({
          error:
            "Loan created but EMI schedule could not be created"
        });
      }


      res.status(201).json({
        success: true,
        loan_account_no,
        emi,
        tenure_months:
          tenure
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


/* =====================================================
   CUSTOMER: FIND LOAN
===================================================== */

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


      const {
        data: application,
        error:
          applicationError
      } = await supabase
        .from(
          "loan_applications"
        )
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


      const {
        data: loan,
        error: loanError
      } = await supabase
        .from(
          "loan_accounts"
        )
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
            "Active loan account not found"
        });
      }


      const {
        data: schedule,
        error:
          scheduleError
      } = await supabase
        .from(
          "emi_schedule"
        )
        .select("*")
        .eq(
          "loan_account_id",
          loan.id
        )
        .order(
          "installment_no",
          {
            ascending:
              true
          }
        );


      if (scheduleError) {
        return res.status(500).json({
          error:
            "Could not load EMI schedule"
        });
      }


      res.json({
        customer: {
          full_name:
            application.full_name,
          mobile:
            application.mobile
        },

        loan: {
          loan_account_no:
            loan.loan_account_no,
          principal:
            loan.principal,
          annual_interest_rate:
            loan.annual_interest_rate,
          tenure_months:
            loan.tenure_months,
          emi:
            loan.emi,
          status:
            loan.status
        },

        emi_schedule:
          schedule
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


/* =====================================================
   CUSTOMER: TEST EMI PAYMENT
===================================================== */

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


      const {
        data: application,
        error:
          applicationError
      } = await supabase
        .from(
          "loan_applications"
        )
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


      const {
        data: loan,
        error: loanError
      } = await supabase
        .from(
          "loan_accounts"
        )
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
        data: emi,
        error: emiError
      } = await supabase
        .from(
          "emi_schedule"
        )
        .select("*")
        .eq(
          "loan_account_id",
          loan.id
        )
        .eq(
          "installment_no",
          Number(
            installment_no
          )
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
        emi.status ===
        "paid"
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
              emi.paid_amount ||
                0
            )
          ).toFixed(2)
        );


      if (
        amount <= 0
      ) {
        return res.status(400).json({
          error:
            "No amount is due for this EMI"
        });
      }


      const method =
        payment_method ||
        "demo";


      const transaction_reference =
        "TEST-" +
        Date.now().toString() +
        "-" +
        Math.floor(
          Math.random() *
            10000
        );


      const {
        data: payment,
        error:
          paymentError
      } = await supabase
        .from(
          "payments"
        )
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


      const {
        data: updatedEmi,
        error:
          updateError
      } = await supabase
        .from(
          "emi_schedule"
        )
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


      res.json({
        success: true,
        demo: true,
        message:
          "Demo EMI payment successful",
        transaction_reference,
        amount,
        installment_no:
          emi.installment_no,
        emi:
          updatedEmi,
        payment
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


/* =====================================================
   CUSTOMER: PAYMENT HISTORY
===================================================== */

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
        .from(
          "loan_applications"
        )
        .select("id")
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
        .from(
          "loan_accounts"
        )
        .select(
          "id,loan_account_no"
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
        .from(
          "payments"
        )
        .select("*")
        .eq(
          "loan_account_id",
          loan.id
        )
        .order(
          "payment_date",
          {
            ascending:
              false
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


/* =====================================================
   ADMIN: PAYMENT LIST
===================================================== */

app.get(
  "/api/admin/payments",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from(
          "payments"
        )
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
            ascending:
              false
          }
        );


      if (error) {
        console.error(error);

        return res.status(500).json({
          error:
            "Could not load payments"
        });
      }


      res.json(
        data || []
      );

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Server error"
      });
    }
  }
);


/* =====================================================
   START SERVER
===================================================== */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Shyam Fincorp Loan API running on port ${PORT}`
    );
  }
);
