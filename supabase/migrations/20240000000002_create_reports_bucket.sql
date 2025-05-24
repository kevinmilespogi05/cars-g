-- Create a new storage bucket for reports
insert into storage.buckets (id, name, public) 
values ('reports', 'reports', true);

-- Allow public access to report images
create policy "Report images are publicly accessible"
on storage.objects for select
using ( bucket_id = 'reports' );

-- Allow authenticated users to upload report images
create policy "Users can upload report images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'reports' );

-- Allow users to delete their own report images
create policy "Users can delete their own report images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'reports' 
  and auth.uid() = owner
); 