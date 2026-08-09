-- عيادتي (Eyadati) — dental clinic scheduling MVP
-- Core schema: clinics, staff membership, doctors, patients, appointments,
-- reminders, and the WhatsApp messages log. Deliberately no medical data:
-- name, phone, appointment time, and visit type only.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  timezone text not null default 'Asia/Hebron',
  working_hours_start time not null default '08:00',
  working_hours_end time not null default '20:00',
  reminder_hours_before smallint not null default 24
    check (reminder_hours_before in (12, 24, 48)),
  whatsapp_mode text not null default 'mock'
    check (whatsapp_mode in ('mock', 'live')),
  whatsapp_phone_number_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table clinic_users (
  clinic_id uuid not null references clinics (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

create index clinic_users_user_id_idx on clinic_users (user_id);

create table doctors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics (id) on delete cascade,
  name text not null,
  color text not null default '#0F766E',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index doctors_clinic_id_idx on doctors (clinic_id);

create table patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics (id) on delete cascade,
  name text not null,
  phone text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patients_clinic_id_idx on patients (clinic_id);
create index patients_clinic_phone_idx on patients (clinic_id, phone);
create index patients_clinic_name_idx on patients (clinic_id, name);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics (id) on delete cascade,
  patient_id uuid not null references patients (id) on delete cascade,
  doctor_id uuid not null references doctors (id) on delete restrict,
  starts_at timestamptz not null,
  duration_minutes smallint not null default 30
    check (duration_minutes in (15, 30, 45, 60)),
  visit_type text not null check (visit_type in (
    'checkup', 'followup', 'cleaning', 'filling', 'root_canal',
    'extraction', 'orthodontics', 'prosthetics', 'other'
  )),
  status text not null default 'scheduled' check (status in (
    'scheduled', 'confirmed', 'reschedule_requested', 'no_show',
    'completed', 'cancelled'
  )),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_clinic_starts_at_idx on appointments (clinic_id, starts_at);
create index appointments_doctor_id_idx on appointments (doctor_id);
create index appointments_patient_id_idx on appointments (patient_id);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics (id) on delete cascade,
  appointment_id uuid not null references appointments (id) on delete cascade,
  status text not null default 'pending' check (status in (
    'pending', 'sent', 'failed', 'cancelled'
  )),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  provider_message_id text,
  created_at timestamptz not null default now()
);

-- One pending/sent reminder per appointment; edits replace it rather than stacking.
create unique index reminders_appointment_id_key on reminders (appointment_id);
-- send-reminders cron scans exactly this shape.
create index reminders_pending_due_idx on reminders (scheduled_for)
  where status = 'pending';

create table messages_log (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics (id) on delete cascade,
  reminder_id uuid references reminders (id) on delete set null,
  appointment_id uuid references appointments (id) on delete set null,
  patient_phone text not null,
  body text not null,
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  status text not null default 'sent' check (status in ('sent', 'failed', 'received')),
  provider_message_id text,
  created_at timestamptz not null default now()
);

create index messages_log_clinic_id_idx on messages_log (clinic_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clinics_set_updated_at before update on clinics
  for each row execute function set_updated_at();
create trigger doctors_set_updated_at before update on doctors
  for each row execute function set_updated_at();
create trigger patients_set_updated_at before update on patients
  for each row execute function set_updated_at();
create trigger appointments_set_updated_at before update on appointments
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Access helper — SECURITY DEFINER so it bypasses RLS on clinic_users itself
-- (the table it reads has RLS enabled too; without definer rights this would
-- recurse into the very policy that calls it).
-- ---------------------------------------------------------------------------

create function user_clinic_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select clinic_id from clinic_users where user_id = auth.uid();
$$;

grant execute on function user_clinic_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Signup RPC — creates a clinic and its owner membership in one transaction.
-- SECURITY DEFINER (owned by the migration role) so it can insert into
-- clinics/clinic_users despite neither table granting authenticated INSERT.
-- ---------------------------------------------------------------------------

create function create_clinic_with_owner(clinic_name text, clinic_phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_clinic_id uuid;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated';
  end if;

  insert into clinics (name, phone) values (clinic_name, clinic_phone)
    returning id into new_clinic_id;

  insert into clinic_users (clinic_id, user_id, role)
    values (new_clinic_id, auth.uid(), 'owner');

  return new_clinic_id;
end;
$$;

grant execute on function create_clinic_with_owner(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table clinics enable row level security;
alter table clinic_users enable row level security;
alter table doctors enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table reminders enable row level security;
alter table messages_log enable row level security;

-- clinics: members can see and update their own clinic's settings.
-- No direct INSERT policy — creation only happens via create_clinic_with_owner().
create policy clinics_select on clinics
  for select using (id in (select user_clinic_ids()));
create policy clinics_update on clinics
  for update using (id in (select user_clinic_ids()));

-- clinic_users: members can see their own memberships and see colleagues in
-- the same clinic(s). No self-service INSERT/DELETE in the MVP (invites are
-- out of scope — the owner row is created by the signup RPC only).
create policy clinic_users_select on clinic_users
  for select using (clinic_id in (select user_clinic_ids()));

create policy doctors_select on doctors
  for select using (clinic_id in (select user_clinic_ids()));
create policy doctors_insert on doctors
  for insert with check (clinic_id in (select user_clinic_ids()));
create policy doctors_update on doctors
  for update using (clinic_id in (select user_clinic_ids()));

create policy patients_select on patients
  for select using (clinic_id in (select user_clinic_ids()));
create policy patients_insert on patients
  for insert with check (clinic_id in (select user_clinic_ids()));
create policy patients_update on patients
  for update using (clinic_id in (select user_clinic_ids()));
create policy patients_delete on patients
  for delete using (clinic_id in (select user_clinic_ids()));

create policy appointments_select on appointments
  for select using (clinic_id in (select user_clinic_ids()));
create policy appointments_insert on appointments
  for insert with check (clinic_id in (select user_clinic_ids()));
create policy appointments_update on appointments
  for update using (clinic_id in (select user_clinic_ids()));

create policy reminders_select on reminders
  for select using (clinic_id in (select user_clinic_ids()));
create policy reminders_insert on reminders
  for insert with check (clinic_id in (select user_clinic_ids()));
create policy reminders_update on reminders
  for update using (clinic_id in (select user_clinic_ids()));

create policy messages_log_select on messages_log
  for select using (clinic_id in (select user_clinic_ids()));
create policy messages_log_insert on messages_log
  for insert with check (clinic_id in (select user_clinic_ids()));
