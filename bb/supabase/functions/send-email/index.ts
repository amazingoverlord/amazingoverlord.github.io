// =====================================================
// Supabase Edge Function: send-email
//
// POST { to, subject, html } -> sends an email via Resend
//
// Requires these secrets (set via `supabase secrets set`):
//   RESEND_API_KEY - your Resend API key (keep secret)
//   FROM_EMAIL     - verified sending address, e.g. noreply@yourdomain.com
//
// Deploy with: supabase functions deploy send-email --no-verify-jwt
// =====================================================

import { corsHeaders, handleOptions } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const origin = req.headers.get("origin");
  const headers = { ...corsHeaders(origin), "Content-Type": "application/json" };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("FROM_EMAIL");

  if (!apiKey || !fromEmail) {
    return new Response(
      JSON.stringify({ error: "Missing RESEND_API_KEY or FROM_EMAIL secret." }),
      { status: 500, headers }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
  }

  const { to, subject, html } = body || {};

  if (!to || !subject || !html) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: to, subject, html" }),
      { status: 400, headers }
    );
  }

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromEmail, to, subject, html }),
    });

    const data = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(
        JSON.stringify({ error: data.message || "Failed to send email via Resend" }),
        { status: resendRes.status, headers }
      );
    }

    return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 200, headers });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error sending email" }),
      { status: 500, headers }
    );
  }
});
