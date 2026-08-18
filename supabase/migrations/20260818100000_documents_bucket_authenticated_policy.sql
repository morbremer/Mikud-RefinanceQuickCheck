-- The existing anon insert/select policies on the 'documents' bucket were
-- built for the two public, anonymous quick-check flows. מרכז חיתום מוסדי's
-- AsyncDocumentUpload also uploads into this same bucket, but as a real
-- logged-in admin (role: authenticated, not anon) -- confirmed via a live
-- E2E test (2026-08-18): uploads failed with "new row violates row-level
-- security policy" because no policy granted the authenticated role access
-- at all. Same shape as the anon policies, just for the authenticated role.
create policy "authenticated can upload documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');

create policy "authenticated can read (for signed URL generation) documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');
