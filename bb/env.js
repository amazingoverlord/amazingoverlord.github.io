// =====================================================
// Client-side config
//
// These two values are SAFE to expose in the browser — they are
// protected by Supabase Row Level Security, not by secrecy.
// Fill them in with your project's values after running schema.sql.
// (Do NOT put ADMIN_PASSWORD or RESEND_API_KEY here — those live only
// in your hosting provider's server-side environment variables.)
// =====================================================

window.__ENV__ = {
  SUPABASE_URL: 'https://pqiqyzldoaguamkxzdzm.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxaXF5emxkb2FndWFta3h6ZHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNTg4MTMsImV4cCI6MjA5OTYzNDgxM30.V2w_VqFE6PNhzlxqq7T01R5sJfhpFuox3xBN5kY-kSA',
  // Base URL for your deployed Edge Functions. Same project ref as above,
  // e.g. https://YOUR_PROJECT.supabase.co/functions/v1
  SUPABASE_FUNCTIONS_URL: 'https://pqiqyzldoaguamkxzdzm.supabase.co/functions/v1'
};
