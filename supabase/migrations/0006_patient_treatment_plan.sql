-- The "next step" a patient still needs, in the clinic's own words.
--
-- Why a plain text column and not a structured treatment table: the question
-- this answers is "what does this patient still need done?", asked at the
-- front desk while booking. One sentence the dentist updates after each visit
-- answers it. A normalised treatment-plan schema (procedures, teeth, stages,
-- costs) is a different, much larger product and would be a separate feature.
--
-- Nullable with no default: every existing row stays valid, and an empty plan
-- is a real state (a new patient has no plan yet).
alter table public.patients
  add column if not exists treatment_plan text;

comment on column public.patients.treatment_plan is
  'Free-text next step for this patient, shown on the patient file and when booking their next appointment. Not a medical record.';
