alter table public.notification_recipients
add column deleted_at timestamptz;

create index notification_recipients_visible_user_created_at_idx
on public.notification_recipients (user_id, created_at desc)
where deleted_at is null;

drop policy "Admins can manage notification recipients"
on public.notification_recipients;

create policy "Admins can view notification recipients"
on public.notification_recipients
for select
to authenticated
using (is_admin());

create policy "Admins can create notification recipients"
on public.notification_recipients
for insert
to authenticated
with check (is_admin());

-- The existing user UPDATE policy limits changes to rows owned by auth.uid().
-- Column privileges additionally limit client updates to recipient state only.
revoke update on table public.notification_recipients from authenticated;
grant update (read_at, deleted_at)
on table public.notification_recipients
to authenticated;
