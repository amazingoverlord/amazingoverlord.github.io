// =====================================================
// Guest RSVP page logic
// =====================================================

const searchForm = document.getElementById('search-form');
const guestNameInput = document.getElementById('guest-name-input');
const searchSection = document.getElementById('search-section');
const dashboardSection = document.getElementById('dashboard-section');
const eventsListEl = document.getElementById('events-list');
const searchAgainBtn = document.getElementById('search-again-btn');
const loadingStateEl = document.getElementById('loading-state');
const searchErrorEl = document.getElementById('search-error');
const dashboardGreetingEl = document.getElementById('dashboard-greeting');
const findMeBtn = document.getElementById('find-me-btn');

function setLoading(isLoading) {
  loadingStateEl.classList.toggle('hidden', !isLoading);
  searchSection.classList.toggle('hidden', isLoading);
}

function getStatusForEvent(event, rsvp) {
  const today = new Date().toISOString().slice(0, 10);
  if (!event.is_active) return 'locked';
  if (event.rsvp_deadline && event.rsvp_deadline < today && (!rsvp || rsvp.response === 'pending')) {
    return 'closed';
  }
  return 'open';
}

async function searchAndDisplay(name) {
  searchErrorEl.classList.remove('visible');
  setLoading(true);

  try {
    const results = await searchGuest(name);

    if (!results.length) {
      setLoading(false);
      searchErrorEl.textContent = `We couldn't find an invitation under "${name}". Check the spelling, or reach out to your host.`;
      searchErrorEl.classList.add('visible');
      return;
    }

    renderDashboard(results, name);
    setLoading(false);
    dashboardSection.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    setLoading(false);
    searchSection.classList.remove('hidden');
    showToast('Something went wrong searching for your invitation. Please try again.', 'error');
  }
}

function renderDashboard(guestRows, name) {
  dashboardGreetingEl.textContent = `Welcome, ${guestRows[0].guest_name}`;
  eventsListEl.innerHTML = '';

  guestRows
    .sort((a, b) => (a.events?.date || '').localeCompare(b.events?.date || ''))
    .forEach((row) => {
      const rsvp = Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps;
      const card = renderEventCard(row.events, row, rsvp);
      eventsListEl.appendChild(card);
    });
}

function renderEventCard(event, guest, rsvp) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card';

  const status = getStatusForEvent(event, rsvp);

  const statusBadge =
    status === 'open'
      ? '<span class="badge badge-active">Open for RSVP</span>'
      : status === 'locked'
      ? '<span class="badge badge-inactive">RSVP locked</span>'
      : '<span class="badge badge-inactive">RSVP closed</span>';

  wrapper.innerHTML = `
    <div class="event-card-header">
      <div>
        <h2>${escapeHtml(event.name)}</h2>
      </div>
      ${statusBadge}
    </div>
    <div class="event-card-meta">
      <span>📅 ${formatDate(event.date)}</span>
      ${event.time ? `<span>🕐 ${escapeHtml(event.time)}</span>` : ''}
      ${event.venue ? `<span>📍 ${escapeHtml(event.venue)}</span>` : ''}
    </div>
    ${event.venue_address ? `<p class="text-secondary text-sm">${escapeHtml(event.venue_address)}</p>` : ''}
    ${event.additional_info ? `<p class="text-secondary text-sm">${escapeHtml(event.additional_info)}</p>` : ''}
    <div class="rsvp-body mt-16"></div>
  `;

  const body = wrapper.querySelector('.rsvp-body');

  if (status === 'open') {
    body.appendChild(renderRSVPForm(event, guest, rsvp));
  } else if (rsvp && rsvp.response !== 'pending') {
    body.appendChild(renderReadOnlyRSVP(rsvp));
  } else {
    const p = document.createElement('p');
    p.className = 'text-secondary text-sm';
    p.textContent = status === 'locked' ? 'RSVPs for this event are currently closed by the host.' : 'The RSVP deadline for this event has passed.';
    body.appendChild(p);
  }

  return wrapper;
}

function renderReadOnlyRSVP(rsvp) {
  const div = document.createElement('div');
  const badgeClass = rsvp.response === 'yes' ? 'badge-yes' : rsvp.response === 'no' ? 'badge-no' : 'badge-pending';
  const label = rsvp.response === 'yes' ? "You're attending" : rsvp.response === 'no' ? "You can't make it" : 'Response pending';

  div.innerHTML = `
    <span class="badge ${badgeClass}">${label}</span>
    ${rsvp.response === 'yes' && rsvp.plus_ones_count > 0
      ? `<p class="text-sm mt-16">Plus ${rsvp.plus_ones_count}: ${(rsvp.plus_one_names || []).map(escapeHtml).join(', ')}</p>`
      : ''}
    ${rsvp.dietary_notes ? `<p class="text-sm text-secondary">Notes: ${escapeHtml(rsvp.dietary_notes)}</p>` : ''}
  `;
  return div;
}

function renderRSVPForm(event, guest, rsvp) {
  const form = document.createElement('form');
  form.className = 'rsvp-form';
  form.dataset.eventGuestId = guest.id;

  const currentResponse = rsvp?.response && rsvp.response !== 'pending' ? rsvp.response : '';
  const maxPlusOnes = guest.max_plus_ones || 0;

  let plusOneOptionsHtml = '<option value="0">0</option>';
  for (let i = 1; i <= maxPlusOnes; i++) {
    plusOneOptionsHtml += `<option value="${i}">${i}</option>`;
  }

  form.innerHTML = `
    <div class="form-group">
      <label>Will you be attending?</label>
      <div class="radio-group">
        <label class="radio-option">
          <input type="radio" name="response" value="yes" ${currentResponse === 'yes' ? 'checked' : ''} required />
          Yes, I'll be there
        </label>
        <label class="radio-option">
          <input type="radio" name="response" value="no" ${currentResponse === 'no' ? 'checked' : ''} required />
          No, I can't make it
        </label>
      </div>
    </div>

    ${maxPlusOnes > 0 ? `
    <div class="form-group plus-one-count-group">
      <label>Number of guests joining you</label>
      <select name="plusOnesCount">${plusOneOptionsHtml}</select>
    </div>
    <div class="plus-one-fields" id="plus-one-fields-${guest.id}"></div>
    ` : ''}

    <div class="form-group">
      <label>Add your +1's name, dietary restrictions, or any other notes (optional)</label>
      <textarea name="dietaryNotes" rows="2" placeholder="e.g. vegetarian, nut allergy"></textarea>
    </div>

    <div class="error-message"></div>
    <button type="submit" class="btn btn-primary">Save RSVP</button>
  `;

  // Pre-fill values
  if (rsvp) {
    const plusOnesSelect = form.querySelector('select[name="plusOnesCount"]');
    if (plusOnesSelect) plusOnesSelect.value = String(rsvp.plus_ones_count || 0);

    const dietaryTextarea = form.querySelector('textarea[name="dietaryNotes"]');
    if (dietaryTextarea) dietaryTextarea.value = rsvp.dietary_notes || '';
  }

  if (maxPlusOnes > 0) {
    const select = form.querySelector('select[name="plusOnesCount"]');
    updatePlusOneFields(guest.id, parseInt(select.value, 10) || 0, form, rsvp?.plus_one_names || []);
    select.addEventListener('change', (e) => {
      updatePlusOneFields(guest.id, parseInt(e.target.value, 10) || 0, form, []);
    });
  }

  form.addEventListener('submit', (e) => handleRSVPSubmit(e, event));

  return form;
}

function updatePlusOneFields(eventGuestId, count, form, existingNames = []) {
  const container = form.querySelector(`#plus-one-fields-${eventGuestId}`);
  if (!container) return;

  container.innerHTML = '';
  container.classList.toggle('visible', count > 0);

  for (let i = 0; i < count; i++) {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.style.marginBottom = '8px';
    group.innerHTML = `
      <label>Guest ${i + 1} name</label>
      <input type="text" name="plusOneName" value="${escapeHtml(existingNames[i] || '')}" placeholder="Full name" />
    `;
    container.appendChild(group);
  }
}

async function handleRSVPSubmit(e, event) {
  e.preventDefault();
  const form = e.target;
  const eventGuestId = form.dataset.eventGuestId;
  const errorEl = form.querySelector('.error-message');
  errorEl.classList.remove('visible');

  const response = form.querySelector('input[name="response"]:checked')?.value;
  if (!response) {
    errorEl.textContent = 'Please select yes or no.';
    errorEl.classList.add('visible');
    return;
  }

  const plusOnesCountEl = form.querySelector('select[name="plusOnesCount"]');
  const plusOnesCount = response === 'yes' ? parseInt(plusOnesCountEl?.value || '0', 10) : 0;

  const plusOneNames = Array.from(form.querySelectorAll('input[name="plusOneName"]'))
    .map((input) => input.value.trim())
    .filter(Boolean);

  const dietaryNotes = form.querySelector('textarea[name="dietaryNotes"]')?.value.trim() || '';

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    await saveRSVP(eventGuestId, {
      response,
      plusOnesCount,
      plusOneNames,
      dietaryNotes
    });

    showToast('RSVP saved. See you there!', 'success');

    // Fire-and-forget confirmation email (guest email lookup is best-effort;
    // silently skips if no email is on file for this guest)
    trySendConfirmationEmail(eventGuestId, event, response, plusOnesCount).catch((err) =>
      console.warn('Confirmation email not sent:', err.message)
    );

    // Re-run the search to refresh the whole dashboard with saved state
    const nameInput = document.getElementById('guest-name-input');
    await searchAndDisplayRefresh();
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Could not save your RSVP. Please try again.';
    errorEl.classList.add('visible');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save RSVP';
  }
}

async function searchAndDisplayRefresh() {
  const name = document.getElementById('dashboard-greeting').textContent.replace('Welcome, ', '');
  await searchAndDisplay(name);
}

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = guestNameInput.value.trim();
  if (!name) return;
  await searchAndDisplay(name);
});

searchAgainBtn.addEventListener('click', () => {
  dashboardSection.classList.add('hidden');
  searchSection.classList.remove('hidden');
  guestNameInput.value = '';
  guestNameInput.focus();
});
