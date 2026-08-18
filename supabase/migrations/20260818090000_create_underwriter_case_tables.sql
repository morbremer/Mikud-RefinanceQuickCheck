-- Ported from base44/entities/{MortgageCase,Document,Message,AuditLog,DocumentExtractionCache}.jsonc
-- for מרכז חיתום מוסדי (UnderwriterDashboard). This is a fully self-contained
-- case-data model, NOT synced with the live Base44 app's MortgageCase store --
-- see project plan for why (MortgageCase there is shared by ~20 other
-- functions/~35 files this migration deliberately does not touch).
--
-- Nested/free-form data (primary_borrower, score_data, etc.) is stored as
-- jsonb rather than normalized: nothing in the ported functions
-- (buildUnderwriterReport, processUnderwriterCase) queries inside these
-- relationally -- they're always read/written whole in JS, matching how
-- Base44's schema-less store treated them.

create table if not exists mortgage_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  case_number text not null,

  -- Not in the original MortgageCase.jsonc schema (Base44's schema-less store
  -- let AsyncDocumentUpload.jsx write it as an ad-hoc field anyway) but it IS
  -- read back by UnderwriterDashboard.jsx (case_type drives the analysis
  -- mode when reloading an existing case) -- a real, load-bearing field, not
  -- decorative, so it's promoted to a real column here.
  case_type text not null default 'mortgage',

  -- Real enum used by the ported functions (processUnderwriterCase,
  -- buildUnderwriterReport) includes 'processing'/'rejected' beyond the
  -- 5 values in the original MortgageCase.jsonc's stale enum -- ported
  -- actual behavior, not the schema file.
  case_status text not null default 'new'
    check (case_status in ('new', 'processing', 'sabbatical_risk', 'approved', 'under_review', 'rejected', 'completed')),

  primary_borrower jsonb not null default '{}'::jsonb,
  secondary_borrower jsonb not null default '{}'::jsonb,
  property jsonb not null default '{}'::jsonb,
  existing_mortgage jsonb not null default '{}'::jsonb,
  loans jsonb not null default '[]'::jsonb,
  credit_cards jsonb not null default '[]'::jsonb,

  analysis_timestamp timestamptz,
  notes text,
  score_data jsonb not null default '{}'::jsonb,
  underwriter_decision jsonb
);

create trigger mortgage_cases_set_updated_at
  before update on mortgage_cases
  for each row
  execute function set_updated_at();

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  case_id uuid not null references mortgage_cases(id) on delete cascade,
  document_type text not null
    check (document_type in ('salary_slip', 'tax_assessment', 'cpa_letter', 'employment_letter',
      'sabbatical_letter', 'return_to_work_letter', 'bank_statement', 'mortgage_statement',
      'loan_statement', 'id_card', 'property_registry', 'other')),
  file_url text not null,
  month_year text,
  extracted_data jsonb not null default '{}'::jsonb,
  borrower_id text,
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'valid', 'invalid', 'needs_review')),
  validation_notes text,
  upload_date timestamptz not null default now()
);

create trigger documents_set_updated_at
  before update on documents
  for each row
  execute function set_updated_at();

-- is_internal is the only field InternalNotes.jsx actually reads/writes --
-- sender_type/read etc. are kept for schema fidelity but this repo has no
-- client-facing portal, so client-side messages are unused here.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  case_id uuid not null references mortgage_cases(id) on delete cascade,
  sender_type text not null check (sender_type in ('client', 'admin')),
  sender_name text not null,
  sender_email text not null,
  content text not null,
  read boolean not null default false,
  timestamp timestamptz not null default now(),
  is_internal boolean not null default false
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  user_email text not null,
  action_type text not null check (action_type in ('view', 'edit', 'delete', 'export', 'login', 'data_access')),
  target_entity text,
  target_id text,
  description text,
  ip_address text,
  user_agent text,
  sensitive_data boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

-- Re-added (was deliberately dropped from extractSingleChunk/normalizeDocData
-- during the earlier QuickCheck-only migration since no case model existed
-- yet -- that blocker is gone now).
create table if not exists document_extraction_cache (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  file_url text not null unique,
  extracted_data jsonb not null default '{}'::jsonb,
  extraction_model text,
  schema_version integer not null
);

create trigger document_extraction_cache_set_updated_at
  before update on document_extraction_cache
  for each row
  execute function set_updated_at();

-- RLS: this is an internal, admin-only tool (unlike refinance_leads, there is
-- no anonymous feeder flow anywhere in this repo) -- every table is
-- authenticated-only, no per-row ownership (matches the original's binary
-- admin role model: any authenticated admin sees every case).
alter table mortgage_cases enable row level security;
alter table documents enable row level security;
alter table messages enable row level security;
alter table audit_log enable row level security;
alter table document_extraction_cache enable row level security;

create policy "authenticated users have full access to mortgage_cases"
  on mortgage_cases for all
  to authenticated
  using (true) with check (true);

create policy "authenticated users have full access to documents"
  on documents for all
  to authenticated
  using (true) with check (true);

create policy "authenticated users have full access to messages"
  on messages for all
  to authenticated
  using (true) with check (true);

create policy "authenticated users have full access to audit_log"
  on audit_log for all
  to authenticated
  using (true) with check (true);

-- document_extraction_cache is read/written only by service-role Edge
-- Functions (extractSingleChunk), never directly by the frontend -- no
-- authenticated-user policy needed, service role bypasses RLS entirely.

alter publication supabase_realtime add table messages;
