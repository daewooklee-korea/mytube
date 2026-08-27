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
    const { username, nickname } = await req.json();

    const id = username?.trim();
    const name = nickname?.trim();

    if (!id || !name) {
      return new Response(
        JSON.stringify({
          error: "ID와 닉네임을 입력해주세요.",
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

    const { data: usernameData, error: usernameError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("username", id)
        .limit(1);

    if (usernameError) {
      console.error(
        "ID 중복 확인 실패:",
        usernameError
      );

      return new Response(
        JSON.stringify({
          error: "ID 중복 확인 중 오류가 발생했습니다.",
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

    const { data: nicknameData, error: nicknameError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("nickname", name)
        .limit(1);

    if (nicknameError) {
      console.error(
        "닉네임 중복 확인 실패:",
        nicknameError
      );

      return new Response(
        JSON.stringify({
          error: "닉네임 중복 확인 중 오류가 발생했습니다.",
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

    const usernameExists =
      (usernameData ?? []).length > 0;

    const nicknameExists =
      (nicknameData ?? []).length > 0;

    if (usernameExists && nicknameExists) {
      return new Response(
        JSON.stringify({
          success: false,
          usernameExists: true,
          nicknameExists: true,
          error:
            "이미 사용 중인 ID와 닉네임입니다.",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (usernameExists) {
      return new Response(
        JSON.stringify({
          success: false,
          usernameExists: true,
          nicknameExists: false,
          error: "이미 사용 중인 ID입니다.",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (nicknameExists) {
      return new Response(
        JSON.stringify({
          success: false,
          usernameExists: false,
          nicknameExists: true,
          error: "이미 사용 중인 닉네임입니다.",
        }),
        {
          status: 200,
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
        usernameExists: false,
        nicknameExists: false,
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
      "check-signup 함수 오류:",
      error
    );

    return new Response(
      JSON.stringify({
        error: "중복 확인 중 오류가 발생했습니다.",
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
