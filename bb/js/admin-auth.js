// =====================================================
// Admin authentication
//
// The actual password check happens server-side in the
// admin-login Supabase Edge Function so the real password
// never reaches the browser. A successful login sets an
// httpOnly session cookie (24h) that the same function
// validates on checkAuth() calls too.
//
// Because the site (Neocities) and the function (Supabase)
// are different origins, every call needs credentials:
// 'include' so the browser sends/accepts the cookie
// cross-site, and the function responds with SameSite=None.
// =====================================================

const ADMIN_LOGIN_URL = `${window.__ENV__?.SUPABASE_FUNCTIONS_URL}/admin-login`;

async function login(password) {
  const res = await fetch(ADMIN_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password })
  });

  if (res.status === 200) return true;
  if (res.status === 401) return false;
  throw new Error('Login request failed');
}

async function checkAuth() {
  try {
    const res = await fetch(ADMIN_LOGIN_URL, { method: 'GET', credentials: 'include' });
    return res.status === 200;
  } catch (err) {
    return false;
  }
}

async function logout() {
  await fetch(ADMIN_LOGIN_URL, { method: 'DELETE', credentials: 'include' });
  window.location.href = 'admin-login.html';
}

/**
 * Call at the top of every admin page. Redirects to login if not authed.
 */
async function requireAuth() {
  const isAuthed = await checkAuth();
  if (!isAuthed) {
    window.location.href = 'admin-login.html';
  }
  return isAuthed;
}
