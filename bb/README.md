# RSVP Management System

A private, single-tenant RSVP system for managing multiple events (birthday, engagement, wedding, etc.) with overlapping guestlists. Guests search their name once and RSVP separately to every event they're invited to. Admins manage events, guestlists, and reminders from a password-gated dashboard.

Pure HTML/CSS/vanilla JS frontend, Supabase (Postgres) backend, Resend for email, deployable to Vercel or Netlify as a static site with two small serverless functions.

---

## 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Once it's provisioned, open **SQL Editor** in the sidebar, click **New query**, paste the entire contents of `schema.sql`, and run it. This creates all four tables, indexes, RLS policies, and inserts sample seed data (3 events, 10 guests).
3. Go to **Project Settings > API**. Copy:
   - **Project URL** → this is your `SUPABASE_URL`
   - **anon public key** → this is your `SUPABASE_ANON_KEY`

   Both are safe to expose in client-side code — access is governed by the Row Level Security policies in `schema.sql`, not by keeping these values secret.

4. Open `env.js` and paste in your values:
   ```js
   window.__ENV__ = {
     SUPABASE_URL: 'https://your-project.supabase.co',
     SUPABASE_ANON_KEY: 'your_anon_key'
   };
   ```

---

## 2. Set up Resend (for emails)

1. Go to [resend.com](https://resend.com) and create an account.
2. Add and verify your sending domain (**Domains > Add Domain**, then add the DNS records they give you). Verification can take a few minutes to a few hours depending on your DNS provider.
3. Create an API key (**API Keys > Create API Key**). This is your `RESEND_API_KEY` — keep it secret, never put it in `env.js` or any client-side file.
4. Decide on a `FROM_EMAIL`, e.g. `noreply@yourdomain.com`, using your verified domain.

---

## 3. Deploy the Edge Functions (admin login + email) to Supabase

Neocities only hosts static files, so the two functions that need to keep secrets server-side (`admin-login`, `send-email`) are deployed as **Supabase Edge Functions** instead — they live at `supabase/functions/admin-login` and `supabase/functions/send-email` in this project.

1. Install the Supabase CLI: `npm install -g supabase` (or see [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli) for other install methods).
2. Log in: `supabase login`
3. From the project folder, link it to your Supabase project: `supabase link --project-ref YOUR_PROJECT_REF` (find your project ref in Project Settings > General, or in your Project URL).
4. Set the secrets these functions need (never put these in `env.js` — they stay server-side only):
   ```
   supabase secrets set ADMIN_PASSWORD=your_secure_password
   supabase secrets set ADMIN_SESSION_SECRET=$(openssl rand -hex 32)
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
   supabase secrets set FROM_EMAIL=noreply@yourdomain.com
   ```
5. Deploy both functions:
   ```
   supabase functions deploy admin-login --no-verify-jwt
   supabase functions deploy send-email --no-verify-jwt
   ```
   (`--no-verify-jwt` is required — these endpoints implement their own password/cookie logic rather than using Supabase's built-in auth, so they shouldn't require a Supabase auth token to be called.)
6. Your functions are now live at:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/admin-login
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email
   ```
   Add the base of that (`https://YOUR_PROJECT_REF.supabase.co/functions/v1`) to `env.js` as `SUPABASE_FUNCTIONS_URL`.

---

## 4. Deploy the static site to Neocities

1. Go to [neocities.org](https://neocities.org), create or log into your account.
2. Either drag-and-drop every file/folder in this project (except `supabase/`, `api/`, `vercel.json`, and `package.json` — those aren't needed for Neocities) into the Neocities dashboard, or use the [Neocities CLI](https://neocities.org/cli) / their API to push the whole folder at once.
3. Make sure `env.js` has your real `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_FUNCTIONS_URL` filled in **before** uploading — Neocities has no build step or environment variables, so this file is deployed exactly as it sits locally.
4. Once uploaded, your site is live at `yourname.neocities.org` (or your custom domain, if you've connected one in Neocities' settings).

> Note: `api/`, `vercel.json`, and `package.json` in this project are leftover scaffolding for an alternative Vercel-only deployment path (everything, including the functions, hosted on Vercel). You don't need them for the Neocities + Supabase Edge Functions setup — safe to ignore or delete.

---

## 5. Custom domain (optional)

- **Vercel**: Project Settings > Domains > Add your domain, then update your DNS with the records Vercel provides.
- **Netlify**: Site Settings > Domain Management > Add custom domain, same idea.

Once your domain is live, update `SITE_URL` in your environment variables so email links point to the right place.

---

## Using the system

### As a guest
Go to `/index.html`, enter your name, and you'll see every event you're invited to. Each event shows its own RSVP form (or a read-only view of your existing response if the event is no longer open).

### As an admin
1. Go to `/admin-login.html` and log in with `ADMIN_PASSWORD`. This sets a 24-hour session cookie.
2. From `/admin-dashboard.html` you can create events, see stats, and jump into any event's guestlist.
3. From an event's detail page you can add guests one at a time, import a CSV (`guest_name, email, phone, max_plus_ones, notes` columns), export the current guestlist with RSVP status, and send bulk reminders to everyone still pending.
4. Deactivating an event locks it for guests (they'll see "RSVP locked") without deleting any data. Deleting an event removes its guestlist and RSVPs permanently — you'll be asked to confirm.

---

## Project structure

```
/
├── index.html                 Guest RSVP page
├── admin-login.html           Admin authentication
├── admin-dashboard.html       Main admin dashboard
├── admin-event-edit.html      Create/Edit event
├── admin-event-detail.html    Event guestlist management
├── env.js                     Public Supabase URL/key (fill in after setup)
├── schema.sql                 Database schema + seed data
├── vercel.json                Vercel config
├── package.json
├── .env.example                Server-side env var reference
├── css/
│   └── styles.css
├── js/
│   ├── supabase-client.js     Supabase init + all data helpers
│   ├── ui-utils.js            Toast, modal, CSV, formatting helpers
│   ├── rsvp.js                Guest RSVP page logic
│   ├── email.js                Email sending (calls /api/send-email)
│   ├── admin-auth.js          Admin session helpers (calls /api/admin-login)
│   ├── admin-dashboard.js     Dashboard logic
│   ├── admin-event-edit.js    Event create/edit logic
│   └── admin-event-detail.js  Guestlist management logic
└── api/
    ├── admin-login.js         Serverless: password check + signed session cookie
    └── send-email.js          Serverless: Resend API proxy
```

## Notes on the security model

This is built for a private, single-tenant use case (one host managing their own events), so a few deliberate simplifications:

- The Supabase anon key is used for both the guest page and the admin panel. RLS policies in `schema.sql` are permissive at the database layer; the real gate for guests is that they need to already know a name on the list, and for admins it's the password-protected session cookie.
- If you want stronger guarantees (e.g. multiple admins, audit logs, tighter RLS scoped to authenticated users), swap the admin side to Supabase Auth and scope policies to `auth.uid()` rather than `true`.
- The admin session cookie is `httpOnly`, `Secure`, `SameSite=Strict`, and HMAC-signed with `ADMIN_SESSION_SECRET` so it can't be forged or read by client-side JS.
