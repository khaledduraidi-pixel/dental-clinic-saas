-- Demo data: one clinic, a demo login, 3 doctors, 25 patients, and 60
-- appointments spread across the current week, so the calendar and
-- dashboard are never empty on first run.
--
-- Intended for local development via `supabase db reset` (which runs
-- migrations then this file automatically against your LOCAL Supabase
-- instance). It creates a demo auth user directly in auth.users/auth.identities
-- — a pattern that only makes sense for local dev, never for a hosted/
-- production project. If you'd rather use your own account, skip the
-- "demo login" block below, sign up normally through the app (it creates
-- your clinic via the create_clinic_with_owner RPC), then run just the
-- doctors/patients/appointments blocks with :clinic_id replaced by yours.

begin;

-- ---------------------------------------------------------------------------
-- Demo login: demo@qareeb.app / demo12345
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated',
  'demo@qareeb.app',
  crypt('demo12345', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{}',
  now(), now(), '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"demo@qareeb.app"}',
  'email', now(), now(), now()
) on conflict (provider, provider_id) do nothing;

-- ---------------------------------------------------------------------------
-- Clinic + membership
-- ---------------------------------------------------------------------------

insert into clinics (id, name, phone, reminder_hours_before)
values ('11111111-1111-1111-1111-111111111111', 'عيادة الابتسامة الحديثة', '+970599111222', 24)
on conflict (id) do nothing;

insert into clinic_users (clinic_id, user_id, role)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'owner')
on conflict (clinic_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Doctors
-- ---------------------------------------------------------------------------

create temporary table seed_doctors (seq int, id uuid) on commit drop;

with inserted as (
  insert into doctors (clinic_id, name, color)
  values
    ('11111111-1111-1111-1111-111111111111', 'د. سامر خليل', '#0F766E'),
    ('11111111-1111-1111-1111-111111111111', 'د. رنا ياسين', '#B45309'),
    ('11111111-1111-1111-1111-111111111111', 'د. عمر النجار', '#7C3AED')
  returning id
)
insert into seed_doctors (seq, id)
select row_number() over (), id from inserted;

-- ---------------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------------

create temporary table seed_patients (seq int, id uuid) on commit drop;

with names(name, phone) as (
  values
    ('أحمد الحسيني', '+970599100001'), ('فاطمة عودة', '+970599100002'),
    ('محمد أبو شامة', '+970599100003'), ('سارة النجار', '+970599100004'),
    ('يوسف حماد', '+970599100005'), ('مريم قاسم', '+970599100006'),
    ('خالد دراغمة', '+970599100007'), ('لينا صالح', '+970599100008'),
    ('عمر يوسف', '+970599100009'), ('هنادي شاهين', '+970599100010'),
    ('إبراهيم عساف', '+970599100011'), ('رغد ملحم', '+970599100012'),
    ('زياد أبو علي', '+970599100013'), ('نور الدين حمدان', '+970599100014'),
    ('ريم صبح', '+970599100015'), ('طارق مصلح', '+970599100016'),
    ('دانا خضر', '+970599100017'), ('حسام برغوثي', '+970599100018'),
    ('علا زيدان', '+970599100019'), ('باسل شريم', '+970599100020'),
    ('ياسمين طه', '+970599100021'), ('وائل قطيش', '+970599100022'),
    ('إيمان دويكات', '+970599100023'), ('عدي حسن', '+970599100024'),
    ('شذى عبد الهادي', '+970599100025')
),
inserted as (
  insert into patients (clinic_id, name, phone)
  select '11111111-1111-1111-1111-111111111111', name, phone from names
  returning id
)
insert into seed_patients (seq, id)
select row_number() over (), id from inserted;

-- ---------------------------------------------------------------------------
-- Appointments — 60 appointments spread across the current week
-- (3 days back, today, 3 days forward), 08:00-20:00 in 30-minute slots.
-- ---------------------------------------------------------------------------

create temporary table seed_appointments (seq int, id uuid, starts_at timestamptz) on commit drop;

with generated as (
  select
    i as seq,
    date_trunc('day', now()) + ((i % 7) - 3) * interval '1 day'
      + (8 + ((i * 37) % 12)) * interval '1 hour'
      + ((i % 2) * 30) * interval '1 minute'
      as starts_at,
    (select id from seed_doctors where seq = (i % 3) + 1) as doctor_id,
    (select id from seed_patients where seq = (i % 25) + 1) as patient_id,
    (array['checkup','followup','cleaning','filling','root_canal',
           'extraction','orthodontics','prosthetics','other'])[(i % 9) + 1] as visit_type,
    (array[15, 30, 30, 30, 45, 60])[(i % 6) + 1] as duration_minutes
  from generate_series(1, 60) as i
),
with_status as (
  select
    *,
    case
      when starts_at < now() then
        (array['completed', 'completed', 'completed', 'no_show'])[(seq % 4) + 1]
      else
        (array['scheduled', 'confirmed', 'confirmed', 'reschedule_requested'])[(seq % 4) + 1]
    end as status
  from generated
),
inserted as (
  insert into appointments (
    clinic_id, patient_id, doctor_id, starts_at, duration_minutes, visit_type, status
  )
  select
    '11111111-1111-1111-1111-111111111111', patient_id, doctor_id, starts_at,
    duration_minutes, visit_type, status
  from with_status
  returning id, starts_at
)
insert into seed_appointments (seq, id, starts_at)
select row_number() over (order by starts_at), id, starts_at from inserted;

-- ---------------------------------------------------------------------------
-- Reminders — one per future appointment, scheduled 24h before starts_at.
-- Past appointments get a reminder already marked sent, feeding the
-- dashboard's "reminders sent" stat and the messages log below.
-- ---------------------------------------------------------------------------

create temporary table seed_reminders (appointment_id uuid, id uuid, status text) on commit drop;

with inserted as (
  insert into reminders (clinic_id, appointment_id, status, scheduled_for, sent_at)
  select
    '11111111-1111-1111-1111-111111111111',
    id,
    case when starts_at < now() then 'sent' else 'pending' end,
    starts_at - interval '24 hours',
    case when starts_at < now() then starts_at - interval '24 hours' else null end
  from seed_appointments
  returning id, appointment_id, status
)
insert into seed_reminders (appointment_id, id, status)
select appointment_id, id, status from inserted;

insert into messages_log (clinic_id, reminder_id, appointment_id, patient_phone, body, status)
select
  '11111111-1111-1111-1111-111111111111',
  r.id,
  r.appointment_id,
  p.phone,
  'تذكير من عيادة الابتسامة الحديثة: لديك موعد يوم ' ||
    to_char(a.starts_at, 'YYYY-MM-DD') || ' الساعة ' || to_char(a.starts_at, 'HH24:MI') ||
    '. للتأكيد اضغط "تأكيد الموعد"، وللتأجيل اضغط "أريد التأجيل".',
  'sent'
from seed_reminders r
join appointments a on a.id = r.appointment_id
join patients p on p.id = a.patient_id
where r.status = 'sent';

commit;
