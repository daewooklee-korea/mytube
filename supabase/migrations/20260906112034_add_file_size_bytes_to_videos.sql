alter table public.videos
  add column if not exists file_size_bytes bigint;

comment on column public.videos.file_size_bytes is
  'Original media file size in bytes.';
