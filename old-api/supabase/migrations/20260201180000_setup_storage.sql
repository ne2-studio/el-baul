
-- Create the storage bucket for photos
insert into storage.buckets (id, name, public)
values ('el-baul-prod-photos', 'el-baul-prod-photos', false)
on conflict (id) do nothing;

-- Set up RLS for Storage
-- Note: storage.objects is the table where file metadata is stored

-- Allow authenticated users to upload files to their own folder
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'el-baul-prod-photos' AND
  (select auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view files in the bucket
create policy "Allow authenticated selects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'el-baul-prod-photos'
);

-- Allow users to delete their own uploads
create policy "Allow individuals to delete their own files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'el-baul-prod-photos' AND
  (select auth.uid())::text = (storage.foldername(name))[1]
);
