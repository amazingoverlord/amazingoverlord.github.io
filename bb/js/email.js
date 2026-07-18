// =====================================================
// Email sending
//
// The Resend API key must never be exposed to the browser.
// All of these functions call the send-email Supabase Edge
// Function, which holds the real RESEND_API_KEY server-side.
// =====================================================

const SEND_EMAIL_URL = `${window.__ENV__?.SUPABASE_FUNCTIONS_URL}/send-email`;

async function sendViaApi(payload) {
  const res = await fetch(SEND_EMAIL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send email');
  }
  return data;
}

function baseEmailWrapper(bodyHtml) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background:#F9FAFB; padding:32px 0;">
    <div style="max-width:480px; margin:0 auto; background:#FFFFFF; border:1px solid #E5E7EB; border-radius:12px; padding:32px;">
      ${bodyHtml}
      <p style="font-size:12px; color:#6B7280; margin-top:32px; border-top:1px solid #E5E7EB; padding-top:16px;">
        This is an automated message regarding your RSVP.
      </p>
    </div>
  </div>`;
}

/**
 * Send a confirmation email to a guest after they RSVP.
 */
async function sendConfirmationEmail(guestEmail, guestName, eventName, response, plusOnes, rsvpLink) {
  if (!guestEmail) return null;

  const attending = response === 'yes';
  const bodyHtml = baseEmailWrapper(`
    <h2 style="margin:0 0 12px; font-size:20px; color:#1A1A1A;">Hi ${guestName},</h2>
    <p style="font-size:14px; color:#1A1A1A; line-height:1.6;">
      ${attending
        ? `Thanks for confirming! We've got you down as <strong>attending</strong> ${eventName}${plusOnes ? ` with ${plusOnes} guest${plusOnes > 1 ? 's' : ''}` : ''}.`
        : `We've recorded that you <strong>won't be able to make it</strong> to ${eventName}. Thanks for letting us know!`}
    </p>
    ${rsvpLink ? `<p style="font-size:14px;"><a href="${rsvpLink}" style="color:#1A1A1A;">Update your RSVP</a></p>` : ''}
  `);

  return sendViaApi({
    to: guestEmail,
    subject: `Your RSVP for ${eventName}`,
    html: bodyHtml
  });
}

/**
 * Notify the admin whenever a new RSVP comes in.
 */
async function sendAdminNotification(adminEmail, guestName, eventName, response, plusOnes) {
  if (!adminEmail) return null;

  const bodyHtml = baseEmailWrapper(`
    <h2 style="margin:0 0 12px; font-size:18px; color:#1A1A1A;">New RSVP received</h2>
    <p style="font-size:14px; color:#1A1A1A; line-height:1.6;">
      <strong>${guestName}</strong> responded <strong>${response === 'yes' ? 'Yes' : 'No'}</strong> to <strong>${eventName}</strong>${plusOnes ? ` (+${plusOnes})` : ''}.
    </p>
  `);

  return sendViaApi({
    to: adminEmail,
    subject: `RSVP update: ${guestName} — ${eventName}`,
    html: bodyHtml
  });
}

/**
 * Send a reminder to a single pending guest.
 */
async function sendReminderEmail(guestEmail, guestName, eventName, eventDate, deadline, link) {
  if (!guestEmail) return null;

  const bodyHtml = baseEmailWrapper(`
    <h2 style="margin:0 0 12px; font-size:20px; color:#1A1A1A;">Hi ${guestName},</h2>
    <p style="font-size:14px; color:#1A1A1A; line-height:1.6;">
      Just a friendly reminder that we haven't heard back from you yet for <strong>${eventName}</strong>${eventDate ? ` on ${eventDate}` : ''}.
      ${deadline ? `Please RSVP by <strong>${deadline}</strong>.` : ''}
    </p>
    <p style="margin-top:20px;">
      <a href="${link}" style="display:inline-block; background:#1A1A1A; color:#FFFFFF; padding:10px 20px; border-radius:6px; font-size:14px; text-decoration:none;">RSVP now</a>
    </p>
  `);

  return sendViaApi({
    to: guestEmail,
    subject: `Reminder: RSVP for ${eventName}`,
    html: bodyHtml
  });
}

/**
 * Send a fully custom bulk reminder (subject/body with placeholders already
 * resolved by the caller) to every pending guest for an event.
 * Expects `guests` as [{ email, name }].
 */
async function sendBulkReminders(eventId, subject, messageTemplate, guests) {
  const results = { sent: 0, skipped: 0, errors: [] };

  for (const guest of guests) {
    if (!guest.email) {
      results.skipped++;
      continue;
    }
    try {
      const personalized = messageTemplate
        .replace(/\{guest_name\}/g, guest.name || '')
        .replace(/\{event_name\}/g, guest.eventName || '')
        .replace(/\{event_date\}/g, guest.eventDate || '')
        .replace(/\{rsvp_deadline\}/g, guest.deadline || '')
        .replace(/\{rsvp_link\}/g, guest.link || '');

      await sendViaApi({
        to: guest.email,
        subject,
        html: baseEmailWrapper(`<div style="font-size:14px; color:#1A1A1A; line-height:1.6; white-space:pre-line;">${personalized}</div>`)
      });
      results.sent++;
    } catch (err) {
      results.errors.push({ guest: guest.name, message: err.message });
    }
  }

  return results;
}

/**
 * Best-effort: look up a guest's master email and fire off their
 * confirmation email. Silently no-ops if no email is on file.
 */
async function trySendConfirmationEmail(eventGuestId, event, response, plusOnes) {
  const { data, error } = await supabaseClient
    .from('event_guests')
    .select('guest_name, master_guests ( email )')
    .eq('id', eventGuestId)
    .single();

  if (error || !data) return;

  const email = data.master_guests?.email;
  if (!email) return;

  const rsvpLink = `${window.location.origin}/index.html`;
  await sendConfirmationEmail(email, data.guest_name, event.name, response, plusOnes, rsvpLink);
}
