-- Per-doctor weekly working hours. A doctor with zero rows here falls back
-- to the clinic's own working_hours_start/end every day (the pre-existing
-- behavior, kept as the default so existing doctors aren't silently marked
-- "off" everywhere the moment this migration runs). Once a doctor has at
-- least one row, only the days present are working days — the rest are off.
create table doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors (id) on delete cascade,
  -- 0=Sunday .. 6=Saturday, matching date-fns' weekStartsOn:0 convention
  -- already used throughout the calendar (WeekView, dashboard "this week").
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_availability_valid_range check (end_time > start_time)
);

create unique index doctor_availability_doctor_day_key on doctor_availability (doctor_id, day_of_week);

create trigger doctor_availability_set_updated_at before update on doctor_availability
  for each row execute function set_updated_at();

alter table doctor_availability enable row level security;

create policy doctor_availability_select on doctor_availability
  for select using (doctor_id in (select id from doctors where clinic_id in (select user_clinic_ids())));
create policy doctor_availability_insert on doctor_availability
  for insert with check (doctor_id in (select id from doctors where clinic_id in (select user_clinic_ids())));
create policy doctor_availability_update on doctor_availability
  for update using (doctor_id in (select id from doctors where clinic_id in (select user_clinic_ids())));
create policy doctor_availability_delete on doctor_availability
  for delete using (doctor_id in (select id from doctors where clinic_id in (select user_clinic_ids())));
