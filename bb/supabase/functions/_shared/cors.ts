// Shared CORS helper for edge functions.
// Neocities and Supabase are different origins, so every response needs
// explicit CORS headers, and preflight OPTIONS requests must be handled.
// We reflect the request's Origin back (rather than using "*") because
// credentials (cookies) can't be used with a wildcard origin.

export function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
  }
  return null;
}
