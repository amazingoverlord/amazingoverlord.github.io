// =====================================================
// Supabase Edge Function: admin-login
//
// POST   { password } -> sets a signed, httpOnly session cookie valid 24h
// GET    -> 200 if the current cookie is a valid, unexpired session
// DELETE -> clears the cookie (logout)
//
// Requires these secrets (set via `supabase secrets set`):
//   ADMIN_PASSWORD        - the admin login password
//   ADMIN_SESSION_SECRET  - a long random string used to sign the session cookie
//
// Deploy with: supabase functions deploy admin-login --no-verify-jwt
// (--no-verify-jwt is required since this endpoint has no Supabase auth
// session of its own — it implements its own password + signed cookie)
// =====================================================

import { corsHeaders, handleOptions } from "../_shared/cors.ts";

const COOKIE_NAME = "rsvp_admin_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

async function hmacKey(secret: string) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const enc = new TextEncoder();
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function makeSessionToken(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = `${expiresAt}`;
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

async function verifySessionToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token || !token.includes(".")) return false;
  const [payload, signature] = token.split(".");
  const expected = await sign(payload, secret);
  if (!constantTimeEqual(signature, expected)) return false;
  const expiresAt = parseInt(payload, 10);
  return Date.now() < expiresAt;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
      })
  );
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const origin = req.headers.get("origin");
  const headers = { ...corsHeaders(origin), "Content-Type": "application/json" };

  const secret = Deno.env.get("ADMIN_SESSION_SECRET");
  const adminPassword = Deno.env.get("ADMIN_PASSWORD");

  if (!secret || !adminPassword) {
    return new Response(
      JSON.stringify({ error: "Missing ADMIN_PASSWORD or ADMIN_SESSION_SECRET secret." }),
      { status: 500, headers }
    );
  }

  if (req.method === "POST") {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // ignore, body stays {}
    }
    const password = String(body?.password || "");

    const matches = password.length === adminPassword.length && constantTimeEqual(password, adminPassword);

    if (!matches) {
      return new Response(JSON.stringify({ error: "Incorrect password" }), { status: 401, headers });
    }

    const token = await makeSessionToken(secret);
    // SameSite=None + Secure is required because this cookie crosses
    // origins (Neocities site -> Supabase function domain).
    headers["Set-Cookie"] =
      `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${SESSION_DURATION_MS / 1000}`;

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  if (req.method === "GET") {
    const cookies = parseCookies(req.headers.get("cookie"));
    const isValid = await verifySessionToken(cookies[COOKIE_NAME], secret);
    return new Response(JSON.stringify({ ok: isValid }), { status: isValid ? 200 : 401, headers });
  }

  if (req.method === "DELETE") {
    headers["Set-Cookie"] = `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`;
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
});
