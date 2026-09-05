create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (
    select 1
    from vault.secrets
    where name = 'playme_push_webhook_secret'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'playme_push_webhook_secret',
      'Authenticates notification recipient webhooks to the Push Edge Function'
    );
  end if;
end;
$$;

create or replace function public.verify_push_webhook_secret(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'playme_push_webhook_secret'
      and decrypted_secret = candidate
  );
$$;

revoke all on function public.verify_push_webhook_secret(text) from public;
revoke all on function public.verify_push_webhook_secret(text) from anon;
revoke all on function public.verify_push_webhook_secret(text) from authenticated;
grant execute on function public.verify_push_webhook_secret(text) to service_role;

create or replace function public.send_notification_recipient_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_secret text;
begin
  select decrypted_secret
  into webhook_secret
  from vault.decrypted_secrets
  where name = 'playme_push_webhook_secret';

  if webhook_secret is null then
    raise warning 'Push webhook secret is not configured';
    return new;
  end if;

  perform net.http_post(
    url := 'https://eqsnrdbdzbxrakqkaddx.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-playme-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(new)
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    raise warning 'Could not enqueue Push webhook: %', sqlerrm;
    return new;
end;
$$;

revoke all on function public.send_notification_recipient_push_webhook() from public;
revoke all on function public.send_notification_recipient_push_webhook() from anon;
revoke all on function public.send_notification_recipient_push_webhook() from authenticated;

drop trigger if exists notification_recipients_send_push_webhook
on public.notification_recipients;

create trigger notification_recipients_send_push_webhook
after insert on public.notification_recipients
for each row
execute function public.send_notification_recipient_push_webhook();
