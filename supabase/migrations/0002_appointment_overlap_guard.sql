-- Prevents two appointments from overlapping for the same doctor. This is
-- the correctness backstop below the app's own pre-save conflict check —
-- the app check is what gives a friendly Arabic message in the common
-- case, but only a DB constraint is safe against two receptionists saving
-- the same slot at the same time. Cancelled appointments never block.
--
-- Postgres marks timestamptz + interval as STABLE, not IMMUTABLE (interval
-- arithmetic can be timezone-sensitive in general), so it can't be used
-- directly inside an exclusion constraint's index expression even though
-- our case — adding a plain minutes-only interval to a UTC instant — has
-- no such ambiguity. The fix is a real stored column, kept correct by a
-- trigger, which sidesteps the immutability requirement entirely.
alter table appointments add column ends_at timestamptz;

create function appointments_set_ends_at() returns trigger as $$
begin
  new.ends_at := new.starts_at + new.duration_minutes * interval '1 minute';
  return new;
end;
$$ language plpgsql;

create trigger appointments_set_ends_at before insert or update on appointments
  for each row execute function appointments_set_ends_at();

update appointments set ends_at = starts_at + duration_minutes * interval '1 minute';

alter table appointments alter column ends_at set not null;

create extension if not exists btree_gist;

alter table appointments
  add constraint appointments_no_doctor_overlap
  exclude using gist (
    doctor_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
  where (status <> 'cancelled');
