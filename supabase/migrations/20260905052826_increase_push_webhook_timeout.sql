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
    timeout_milliseconds := 15000
  );

  return new;
exception
  when others then
    raise warning 'Could not enqueue Push webhook: %', sqlerrm;
    return new;
end;
$$;
