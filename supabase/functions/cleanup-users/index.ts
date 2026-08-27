import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cleanup-secret",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const secret =
      req.headers.get("x-cleanup-secret");

    const expectedSecret =
      Deno.env.get("CLEANUP_SECRET");

    if (
      !secret ||
      !expectedSecret ||
      secret !== expectedSecret
    ) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    const { userIds } = await req.json();

    if (
      !Array.isArray(userIds) ||
      userIds.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "삭제할 사용자 ID가 없습니다.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    const adminUserId =
      "f11e77d7-e107-447b-9d51-882cc19ba693";

    if (userIds.includes(adminUserId)) {
      return new Response(
        JSON.stringify({
          error:
            "관리자 계정은 삭제할 수 없습니다.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      )!
    );

    const results = [];

    for (const userId of userIds) {
      const { data: profile } =
        await supabaseAdmin
          .from("profiles")
          .select(
            "id, username, nickname, status, role"
          )
          .eq("id", userId)
          .maybeSingle();

      if (!profile) {
        results.push({
          userId,
          success: false,
          error: "Profile을 찾을 수 없습니다.",
        });
        continue;
      }

      const { data: videos } =
        await supabaseAdmin
          .from("videos")
          .select("id")
          .eq("user_id", userId)
          .limit(1);

      const { data: playlists } =
        await supabaseAdmin
          .from("playlists")
          .select("id")
          .eq("owner_id", userId)
          .limit(1);

      const { data: groups } =
        await supabaseAdmin
          .from("groups")
          .select("id")
          .eq("created_by", userId)
          .limit(1);

      if (
        (videos ?? []).length > 0 ||
        (playlists ?? []).length > 0 ||
        (groups ?? []).length > 0
      ) {
        results.push({
          userId,
          success: false,
          error:
            "콘텐츠 또는 그룹을 보유하고 있어 삭제하지 않았습니다.",
        });
        continue;
      }

      const { error: profileDeleteError } =
        await supabaseAdmin
          .from("profiles")
          .delete()
          .eq("id", userId);

      if (profileDeleteError) {
        results.push({
          userId,
          success: false,
          error:
            profileDeleteError.message,
        });
        continue;
      }

      const { error: authDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(
          userId
        );

      if (authDeleteError) {
        results.push({
          userId,
          success: false,
          error:
            "Profile은 삭제됐지만 Auth 삭제에 실패했습니다: " +
            authDeleteError.message,
        });
        continue;
      }

      results.push({
        userId,
        success: true,
        username: profile.username,
        nickname: profile.nickname,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "cleanup-users 오류:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          "사용자 정리 중 오류가 발생했습니다.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});
