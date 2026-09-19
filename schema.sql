-- Shyam Fincorp Loan database schema for Supabase/PostgreSQL

create extension if not exists pgcrypto;

create table if not exists public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  application_id text unique not null,
  full_name text not null,
  mobile text not null,
  email text,
  monthly_income numeric(12,2) not null check (monthly_income >= 0),
  requested_amount numeric(12,2) not null check (requested_amount > 0),
  tenure_months integer not null check (tenure_months between 1 and 120),
  address text not null,
  status text not null default 'submitted'
    check (status in ('submitted','under_review','approved','rejected','disbursed','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  mobile text unique not null,
  email text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_accounts (
  id uuid primary key default gen_random_uuid(),
  loan_account_no text unique not null,
  application_id uuid references public.loan_applications(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  principal numeric(12,2) not null check (principal > 0),
  annual_interest_rate numeric(6,3) not null check (annual_interest_rate >= 0),
  tenure_months integer not null check (tenure_months > 0),
  emi numeric(12,2),
  status text not null default 'active'
    check (status in ('pending','active','closed','overdue')),
  disbursed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.emi_schedule (
  id uuid primary key default gen_random_uuid(),
  loan_account_id uuid not null references public.loan_accounts(id) on delete cascade,
  installment_no integer not null,
  due_date date not null,
  principal_due numeric(12,2) not null default 0,
  interest_due numeric(12,2) not null default 0,
  total_due numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending','paid','partial','overdue')),
  paid_at timestamptz,
  unique (loan_account_id, installment_no)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  loan_account_id uuid not null references public.loan_accounts(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null,
  transaction_reference text,
  payment_date timestamptz not null default now(),
  status text not null default 'received'
    check (status in ('pending','received','failed','refunded'))
);

create index if not exists idx_loan_applications_mobile
  on public.loan_applications(mobile);

create index if not exists idx_loan_applications_status
  on public.loan_applications(status);

create index if not exists idx_emi_schedule_due_date
  on public.emi_schedule(due_date);

-- RLS is enabled so direct anonymous client access is not allowed.
-- The backend uses the Supabase service-role key and therefore must be kept secret.
alter table public.loan_applications enable row level security;
alter table public.customers enable row level security;
alter table public.loan_accounts enable row level security;
alter table public.emi_schedule enable row level security;
alter table public.payments enable row level security;
