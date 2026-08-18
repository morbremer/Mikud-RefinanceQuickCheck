-- Schedules sweepStuckUnderwriterCases to run every 5 minutes, replacing
-- the original's Base44-dashboard-configured cron (which lived outside the
-- repo entirely) with something version-controlled.
--
-- ⚠️ SETUP REQUIRED (manual, one-time, per project): pg_cron/pg_net's
-- scheduled HTTP call needs the project's service-role (secret) key in the
-- Authorization header, since sweepStuckUnderwriterCases is registered with
-- auth: ["secret"]. That key must NEVER be hardcoded in a checked-in
-- migration (this file is committed to git). Instead, store it in Supabase
-- Vault first:
--
--   select vault.create_secret('<your-service-role-key>', 'service_role_key');
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--
-- (run once via the SQL editor or `supabase db execute`, not committed to
-- git) — this migration then references both by name via
-- vault.decrypted_secrets, never the raw values.
--
-- Also confirm pg_cron/pg_net are available on this project's plan tier
-- before relying on this — if not, fall back to an external scheduler
-- (GitHub Actions on a schedule, or Vercel Cron) hitting the function URL
-- directly with the same header.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'sweep-stuck-underwriter-cases',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/sweepStuckUnderwriterCases',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);
