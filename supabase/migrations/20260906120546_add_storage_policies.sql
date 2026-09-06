create table public.storage_policies (
  content_type text primary key,
  storage_provider text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint storage_policies_content_type_check
    check (content_type in ('video', 'audio', 'image', 'document')),
  constraint storage_policies_storage_provider_check
    check (storage_provider in ('supabase', 'macmini'))
);

alter table public.storage_policies enable row level security;

grant select, insert, update, delete on table public.storage_policies to authenticated;

create policy "Authenticated users can view storage policies"
on public.storage_policies
for select
to authenticated
using (true);

create policy "Admins can insert storage policies"
on public.storage_policies
for insert
to authenticated
with check (is_admin());

create policy "Admins can update storage policies"
on public.storage_policies
for update
to authenticated
using (is_admin())
with check (is_admin());

create policy "Admins can delete storage policies"
on public.storage_policies
for delete
to authenticated
using (is_admin());

insert into public.storage_policies (content_type, storage_provider)
values
  ('video', 'macmini'),
  ('audio', 'supabase'),
  ('image', 'supabase'),
  ('document', 'supabase')
on conflict (content_type) do nothing;
