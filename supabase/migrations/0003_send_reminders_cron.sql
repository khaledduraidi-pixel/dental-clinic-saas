-- Schedules the send-reminders Edge Function every 15 minutes via pg_cron +
-- pg_net (both available on Supabase-hosted Postgres). The function itself
-- filters to clinics in live mode, so this can run unconditionally.
--
-- The function's URL and the key used to call it are deliberately NOT
-- hardcoded here — this file is committed to git, and a service-role key
-- must never be. Instead they're read from Supabase Vault at run time. One
-- time, after this migration is applied, run in the SQL editor:
--
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-reminders', 'edge_function_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');
--
-- (Project ref and service role key: Project Settings -> API in the
-- Supabase dashboard.) This has not been tested against a real Supabase
-- project in this environment — pg_cron/pg_net/Vault aren't available in a
-- plain local Postgres instance, so this is reviewed for correctness
-- against Supabase's documented pattern, not executed.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-reminders-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
