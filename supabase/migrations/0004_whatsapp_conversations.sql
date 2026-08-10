-- Tracks in-progress "book an appointment over WhatsApp" conversations, one
-- row per (clinic, patient phone). The whatsapp-webhook Edge Function is the
-- only thing that ever reads or writes this table (via the service role,
-- which bypasses RLS) — it's conversation scratch state, not product data a
-- clinic user or patient ever queries directly.
create table whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics (id) on delete cascade,
  phone text not null,
  state text not null default 'idle' check (state in (
    'idle', 'awaiting_doctor', 'awaiting_date', 'awaiting_slot', 'awaiting_name', 'awaiting_confirmation'
  )),
  doctor_id uuid references doctors (id) on delete set null,
  selected_date date,
  slot_starts_at timestamptz,
  pending_name text,
  is_new_patient boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index whatsapp_conversations_clinic_phone_key on whatsapp_conversations (clinic_id, phone);

create trigger whatsapp_conversations_set_updated_at before update on whatsapp_conversations
  for each row execute function set_updated_at();

alter table whatsapp_conversations enable row level security;
-- No policies: RLS with zero policies denies the anon/authenticated
-- PostgREST roles entirely, even if a client guessed this table's name.
-- Only the Edge Function's service-role key can touch it.
