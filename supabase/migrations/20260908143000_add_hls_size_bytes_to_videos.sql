alter table public.videos
  add column if not exists hls_size_bytes bigint;

comment on column public.videos.hls_size_bytes is
  'Total HLS output size in bytes for media stored on the Mac mini; NULL when not applicable or unknown.';

-- Backfill Supabase-backed originals where the public URL identifies an object
-- in the Videos bucket. Rows without an exact object match remain unchanged.
update public.videos as v
set file_size_bytes = (o.metadata->>'size')::bigint
from storage.objects as o
where coalesce(v.file_size_bytes, 0) = 0
  and lower(coalesce(v.storage_provider, 'supabase')) <> 'macmini'
  and o.bucket_id = 'Videos'
  and v.video_url like '%/storage/v1/object/public/Videos/%'
  and o.name = split_part(v.video_url, '/', array_length(string_to_array(v.video_url, '/'), 1))
  and (o.metadata->>'size') ~ '^[0-9]+$';
