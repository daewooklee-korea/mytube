import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-migration-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  const migrationSecret =
    req.headers.get("x-migration-secret");

  if (
    !migrationSecret ||
    migrationSecret !==
      Deno.env.get("MIGRATION_SECRET")
  ) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
      }),
      {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const { userId, username } = await req.json();

    if (!userId || !username) {
      return new Response(
        JSON.stringify({
          error: "userId와 username이 필요합니다.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const internalEmail =
      `${username}@playme.invalid`;

    const {
      data: updatedUser,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          email: internalEmail,
          email_confirm: true,
        }
      );

    if (authError) {
      console.error(
        "Auth 사용자 변경 실패:",
        authError
      );

      return new Response(
        JSON.stringify({
          error: authError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .update({
          email: null,
        })
        .eq("id", userId);

    if (profileError) {
      console.error(
        "Profile 이메일 삭제 실패:",
        profileError
      );

      return new Response(
        JSON.stringify({
          error:
            "Auth 변경은 완료됐지만 profiles 이메일 삭제에 실패했습니다.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: updatedUser.user?.id,
        username,
        internalEmail,
        profileEmail: null,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Migration 오류:",
      error
    );

    return new Response(
      JSON.stringify({
        error: "마이그레이션 중 오류가 발생했습니다.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
