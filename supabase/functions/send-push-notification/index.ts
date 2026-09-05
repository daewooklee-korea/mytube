// @deno-types="npm:@types/web-push@3.6.4"
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

type RecipientRecord = {
  id?: string;
  notification_id?: string;
  user_id?: string;
};

type WebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: RecipientRecord;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  const webhookSecret = request.headers.get("x-playme-webhook-secret");

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !vapidPublicKey ||
    !vapidPrivateKey ||
    !vapidSubject
  ) {
    console.error("Push 발송 환경변수가 설정되지 않았습니다.");
    return jsonResponse({ error: "Push service is not configured" }, 500);
  }

  let payload: WebhookPayload;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  if (
    payload.type !== "INSERT" ||
    payload.schema !== "public" ||
    payload.table !== "notification_recipients" ||
    !payload.record?.id
  ) {
    return jsonResponse({ skipped: true, reason: "Unsupported webhook event" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!webhookSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { data: isAuthorized, error: authError } = await supabaseAdmin.rpc(
    "verify_push_webhook_secret",
    { candidate: webhookSecret }
  );

  if (authError || isAuthorized !== true) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { data: recipient, error: recipientError } = await supabaseAdmin
    .from("notification_recipients")
    .select("id, notification_id, user_id")
    .eq("id", payload.record.id)
    .single();

  if (recipientError || !recipient) {
    console.error("알림 수신자 조회 실패:", recipientError?.message);
    return jsonResponse({ error: "Recipient not found" }, 404);
  }

  const [notificationResult, profileResult, subscriptionsResult] =
    await Promise.all([
      supabaseAdmin
        .from("notifications")
        .select("id, type, title, message, target_user_id")
        .eq("id", recipient.notification_id)
        .single(),
      supabaseAdmin
        .from("profiles")
        .select("role, status")
        .eq("id", recipient.user_id)
        .single(),
      supabaseAdmin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", recipient.user_id),
    ]);

  const notification = notificationResult.data;
  const profile = profileResult.data;

  if (notificationResult.error || profileResult.error) {
    console.error("Push 대상 정보 조회 실패", {
      notification: notificationResult.error?.message,
      profile: profileResult.error?.message,
    });
    return jsonResponse({ error: "Notification target lookup failed" }, 500);
  }

  if (
    notification?.type !== "signup" ||
    profile?.role !== "admin" ||
    profile?.status !== "approved"
  ) {
    return jsonResponse({ skipped: true, reason: "Not an approved admin signup" });
  }

  if (subscriptionsResult.error) {
    console.error("Push 구독 조회 실패:", subscriptionsResult.error.message);
    return jsonResponse({ error: "Subscription lookup failed" }, 500);
  }

  const subscriptions = subscriptionsResult.data ?? [];

  if (subscriptions.length === 0) {
    return jsonResponse({ delivered: 0, expired: 0, failed: 0 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const pushPayload = JSON.stringify({
    title: notification.title,
    body: notification.message,
    icon: "/playme-icon.svg",
    badge: "/playme-icon.svg",
    url: notification.target_user_id
      ? `/admin?tab=members&user=${encodeURIComponent(notification.target_user_id)}`
      : "/admin?tab=members",
    notificationId: notification.id,
    type: notification.type,
    targetUserId: notification.target_user_id,
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          pushPayload
        );

        return { delivered: true, expired: false };
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number(error.statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          const { error: deleteError } = await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id)
            .eq("endpoint", subscription.endpoint);

          if (deleteError) {
            console.error("만료 Push 구독 정리 실패:", deleteError.message);
          }

          return { delivered: false, expired: true };
        }

        console.error("Web Push 발송 실패", { statusCode });
        return { delivered: false, expired: false };
      }
    })
  );

  const summary = results.reduce(
    (counts, result) => {
      if (result.status === "fulfilled" && result.value.delivered) {
        counts.delivered += 1;
      } else if (result.status === "fulfilled" && result.value.expired) {
        counts.expired += 1;
      } else {
        counts.failed += 1;
      }
      return counts;
    },
    { delivered: 0, expired: 0, failed: 0 }
  );

  return jsonResponse(summary);
});
