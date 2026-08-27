import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const { username } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({
          error: "ID를 입력해주세요.",
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

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, username, status, role")
        .eq("username", username.trim())
        .maybeSingle();

    if (profileError) {
      console.error(
        "사용자 조회 실패:",
        profileError
      );

      return new Response(
        JSON.stringify({
          error: "사용자 정보를 확인할 수 없습니다.",
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

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: "존재하지 않는 ID입니다.",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (profile.status === "pending") {
      return new Response(
        JSON.stringify({
          error: "관리자 승인 대기 중입니다.",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (profile.status === "rejected") {
      return new Response(
        JSON.stringify({
          error: "가입이 승인되지 않았습니다.",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const {
      data: authUser,
      error: authError,
    } = await supabaseAdmin.auth.admin.getUserById(
      profile.id
    );

    if (authError || !authUser?.user?.email) {
      console.error(
        "Auth 사용자 조회 실패:",
        authError
      );

      return new Response(
        JSON.stringify({
          error: "인증 정보를 확인할 수 없습니다.",
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
        authEmail: authUser.user.email,
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
    console.error("Login 함수 오류:", error);

    return new Response(
      JSON.stringify({
        error: "로그인 처리 중 오류가 발생했습니다.",
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
