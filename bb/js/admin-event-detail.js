// =====================================================
// Admin: event detail / guestlist management
// =====================================================

const PAGE_SIZE = 25;

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

let currentEvent = null;
let allGuests = [];
let filteredGuests = [];
let currentPage = 1;

const loadingStateEl = document.getElementById('loading-state');
const eventContentEl = document.getElementById('event-content');
const eventNameEl = document.getElementById('event-name');
const eventMetaEl = document.getElementById('event-meta');
const eventStatusBadgeEl = document.getElementById('event-status-badge');
const toggleActiveBtn = document.getElementById('toggle-active-btn');
const editEventLink = document.getElementById('edit-event-link');
const duplicateEventBtn = document.getElementById('duplicate-event-btn');
const sendReminderBtn = document.getElementById('send-reminder-btn');
const eventStatsGridEl = document.getElementById('event-stats-grid');
const guestSearchInput = document.getElementById('guest-search-input');
const guestTableBody = document.getElementById('guest-table-body');
const guestEmptyStateEl = document.getElementById('guest-empty-state');
const paginationControlsEl = document.getElementById('pagination-controls');
const addGuestBtn = document.getElementById('add-guest-btn');
const importCsvBtn = document.getElementById('import-csv-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');

if (!eventId) {
  window.location.href = 'admin-dashboard.html';
}

(async function init() {
  const isAuthed = await requireAuth();
  if (!isAuthed) return;
  await loadEventDetail(eventId);
})();

async function loadEventDetail(id) {
  try {
    currentEvent = await getEventBySlugOrId(id);
    allGuests = await getEventGuests(id);
    renderEventHeader();
    applyGuestFilter();
    loadingStateEl.classList.add('hidden');
    eventContentEl.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    loadingStateEl.classList.add('hidden');
    showToast('Failed to load event.', 'error');
  }
}

function computeStats() {
  let yes = 0, no = 0, pending = 0, headcount = 0;
  allGuests.forEach((g) => {
    const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    const response = rsvp?.response || 'pending';
    if (response === 'yes') {
      yes++;
      headcount += 1 + (rsvp.plus_ones_count || 0);
    } else if (response === 'no') {
      no++;
    } else {
      pending++;
    }
  });
  return { total: allGuests.length, yes, no, pending, headcount };
}

function renderEventHeader() {
  eventNameEl.textContent = currentEvent.name;
  eventMetaEl.textContent = [
    formatDate(currentEvent.date),
    currentEvent.time,
    currentEvent.venue
  ].filter(Boolean).join(' · ');

  eventStatusBadgeEl.textContent = currentEvent.is_active ? 'Active' : 'Inactive';
  eventStatusBadgeEl.className = `badge ${currentEvent.is_active ? 'badge-active' : 'badge-inactive'}`;

  toggleActiveBtn.textContent = currentEvent.is_active ? 'Deactivate' : 'Activate';
  editEventLink.href = `admin-event-edit.html?id=${currentEvent.id}`;

  const stats = computeStats();
  eventStatsGridEl.innerHTML = `
    <div class="stat-card"><div class="stat-value">${stats.total}</div><div class="stat-label">Invited</div></div>
    <div class="stat-card"><div class="stat-value">${stats.yes}</div><div class="stat-label">Yes</div></div>
    <div class="stat-card"><div class="stat-value">${stats.no}</div><div class="stat-label">No</div></div>
    <div class="stat-card"><div class="stat-value">${stats.headcount}</div><div class="stat-label">Headcount</div></div>
  `;
}

toggleActiveBtn.addEventListener('click', async () => {
  try {
    currentEvent = await toggleEventActive(currentEvent.id, !currentEvent.is_active);
    renderEventHeader();
    showToast(currentEvent.is_active ? 'Event activated' : 'Event deactivated', 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to update event status.', 'error');
  }
});

duplicateEventBtn.addEventListener('click', async () => {
  const newName = prompt('Name for the duplicated event:', `${currentEvent.name} (Copy)`);
  if (!newName) return;
  const newSlug = prompt('Slug for the duplicated event:', `${currentEvent.slug}-copy`);
  if (!newSlug) return;

  try {
    const newEvent = await duplicateEvent(currentEvent.id, { name: newName, slug: newSlug, is_active: false });
    showToast('Event duplicated.', 'success');
    window.location.href = `admin-event-detail.html?id=${newEvent.id}`;
  } catch (err) {
    console.error(err);
    showToast('Failed to duplicate event.', 'error');
  }
});

// ---------------- Guest table ----------------

function applyGuestFilter() {
  const query = guestSearchInput.value.trim().toLowerCase();
  filteredGuests = query
    ? allGuests.filter((g) => g.guest_name.toLowerCase().includes(query))
    : allGuests;
  currentPage = 1;
  renderGuestTable(filteredGuests);
}

guestSearchInput.addEventListener('input', debounce(applyGuestFilter, 200));

function renderGuestTable(guests) {
  guestTableBody.innerHTML = '';

  if (!guests.length) {
    guestEmptyStateEl.classList.remove('hidden');
    paginationControlsEl.innerHTML = '';
    return;
  }
  guestEmptyStateEl.classList.add('hidden');

  const totalPages = Math.max(1, Math.ceil(guests.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageGuests = guests.slice(start, start + PAGE_SIZE);

  pageGuests.forEach((g) => {
    const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    const response = rsvp?.response || 'pending';
    const badgeClass = response === 'yes' ? 'badge-yes' : response === 'no' ? 'badge-no' : 'badge-pending';
    const badgeLabel = response === 'yes' ? `Yes (+${rsvp?.plus_ones_count || 0})` : response === 'no' ? 'No' : 'Pending';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(g.guest_name)}</td>
      <td>${g.max_plus_ones}</td>
      <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
      <td>${escapeHtml(rsvp?.dietary_notes || '—')}</td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm edit-guest-row-btn" data-id="${g.id}">Edit</button>
          <button class="btn btn-danger btn-sm remove-guest-row-btn" data-id="${g.id}" data-name="${escapeHtml(g.guest_name)}">Remove</button>
        </div>
      </td>
    `;
    guestTableBody.appendChild(tr);
  });

  guestTableBody.querySelectorAll('.edit-guest-row-btn').forEach((btn) => {
    btn.addEventListener('click', () => openEditGuestModal(btn.dataset.id));
  });
  guestTableBody.querySelectorAll('.remove-guest-row-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleRemoveGuest(btn.dataset.id, btn.dataset.name));
  });

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  paginationControlsEl.innerHTML = '';
  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Prev';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => { currentPage--; renderGuestTable(filteredGuests); });
  paginationControlsEl.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === currentPage) btn.classList.add('active');
    btn.addEventListener('click', () => { currentPage = i; renderGuestTable(filteredGuests); });
    paginationControlsEl.appendChild(btn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => { currentPage++; renderGuestTable(filteredGuests); });
  paginationControlsEl.appendChild(nextBtn);
}

async function handleRemoveGuest(eventGuestId, name) {
  if (!confirmAction(`Remove ${name} from this event's guestlist?`)) return;
  try {
    await removeGuestFromEvent(eventGuestId);
    showToast('Guest removed.', 'success');
    allGuests = await getEventGuests(eventId);
    renderEventHeader();
    applyGuestFilter();
  } catch (err) {
    console.error(err);
    showToast('Failed to remove guest.', 'error');
  }
}

// ---------------- Add Guest modal ----------------

const addGuestForm = document.getElementById('add-guest-form');
const guestNameSearchInput = document.getElementById('guest-name-search');
const masterGuestSuggestionsEl = document.getElementById('master-guest-suggestions');
const selectedMasterGuestIdInput = document.getElementById('selected-master-guest-id');
const addGuestError = document.getElementById('add-guest-error');

addGuestBtn.addEventListener('click', () => {
  addGuestForm.reset();
  selectedMasterGuestIdInput.value = '';
  masterGuestSuggestionsEl.innerHTML = '';
  addGuestError.classList.remove('visible');
  openModal('add-guest-modal');
});

guestNameSearchInput.addEventListener('input', debounce(async (e) => {
  const query = e.target.value.trim();
  selectedMasterGuestIdInput.value = '';
  if (query.length < 2) {
    masterGuestSuggestionsEl.innerHTML = '';
    return;
  }
  try {
    const matches = await searchMasterGuests(query);
    if (!matches.length) {
      masterGuestSuggestionsEl.innerHTML = '';
      return;
    }
    masterGuestSuggestionsEl.innerHTML = matches
      .map((m) => `<div class="suggestion-item text-sm" data-id="${m.id}" data-name="${escapeHtml(m.name)}" style="padding:6px 8px; border:1px solid var(--color-border); border-radius:6px; margin-bottom:4px; cursor:pointer;">${escapeHtml(m.name)} ${m.email ? `<span class="text-secondary">(${escapeHtml(m.email)})</span>` : ''}</div>`)
      .join('');

    masterGuestSuggestionsEl.querySelectorAll('.suggestion-item').forEach((item) => {
      item.addEventListener('click', () => {
        guestNameSearchInput.value = item.dataset.name;
        selectedMasterGuestIdInput.value = item.dataset.id;
        masterGuestSuggestionsEl.innerHTML = '';
      });
    });
  } catch (err) {
    console.error(err);
  }
}, 250));

addGuestForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  addGuestError.classList.remove('visible');

  const guestName = guestNameSearchInput.value.trim();
  if (!guestName) {
    addGuestError.textContent = 'Guest name is required.';
    addGuestError.classList.add('visible');
    return;
  }

  const submitBtn = addGuestForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding…';

  try {
    await addGuestToEvent(eventId, {
      guestName,
      masterGuestId: selectedMasterGuestIdInput.value || null,
      addToMasterList: document.getElementById('add-to-master-list-checkbox').checked && !selectedMasterGuestIdInput.value,
      email: document.getElementById('guest-email-input').value.trim() || null,
      maxPlusOnes: parseInt(document.getElementById('max-plus-ones-select').value, 10) || 0,
      notes: document.getElementById('guest-notes-input').value.trim() || null
    });

    showToast('Guest added.', 'success');
    closeModal('add-guest-modal');
    allGuests = await getEventGuests(eventId);
    renderEventHeader();
    applyGuestFilter();
  } catch (err) {
    console.error(err);
    addGuestError.textContent = err.message?.includes('duplicate')
      ? 'This guest is already on this event\'s list.'
      : 'Failed to add guest.';
    addGuestError.classList.add('visible');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Guest';
  }
});

// ---------------- Edit Guest modal ----------------

const editGuestForm = document.getElementById('edit-guest-form');
const editGuestError = document.getElementById('edit-guest-error');

function openEditGuestModal(eventGuestId) {
  const guest = allGuests.find((g) => g.id === eventGuestId);
  if (!guest) return;

  document.getElementById('edit-guest-id').value = guest.id;
  document.getElementById('edit-guest-name-input').value = guest.guest_name;
  document.getElementById('edit-max-plus-ones-select').value = String(guest.max_plus_ones);
  document.getElementById('edit-guest-notes-input').value = guest.notes || '';
  editGuestError.classList.remove('visible');
  openModal('edit-guest-modal');
}

editGuestForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  editGuestError.classList.remove('visible');

  const id = document.getElementById('edit-guest-id').value;
  const submitBtn = editGuestForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    await updateGuest(id, {
      guestName: document.getElementById('edit-guest-name-input').value.trim(),
      maxPlusOnes: parseInt(document.getElementById('edit-max-plus-ones-select').value, 10) || 0,
      notes: document.getElementById('edit-guest-notes-input').value.trim() || null
    });

    showToast('Guest updated.', 'success');
    closeModal('edit-guest-modal');
    allGuests = await getEventGuests(eventId);
    applyGuestFilter();
  } catch (err) {
    console.error(err);
    editGuestError.textContent = 'Failed to update guest.';
    editGuestError.classList.add('visible');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';
  }
});

// ---------------- Import CSV modal ----------------

const csvDropzone = document.getElementById('csv-dropzone');
const csvFileInput = document.getElementById('csv-file-input');
const csvPreviewEl = document.getElementById('csv-preview');
const importCsvError = document.getElementById('import-csv-error');
const confirmImportBtn = document.getElementById('confirm-import-btn');
let parsedCsvRows = [];

importCsvBtn.addEventListener('click', () => {
  csvPreviewEl.innerHTML = '';
  importCsvError.classList.remove('visible');
  confirmImportBtn.disabled = true;
  parsedCsvRows = [];
  openModal('import-csv-modal');
});

csvDropzone.addEventListener('click', () => csvFileInput.click());
csvDropzone.addEventListener('dragover', (e) => { e.preventDefault(); csvDropzone.classList.add('dragover'); });
csvDropzone.addEventListener('dragleave', () => csvDropzone.classList.remove('dragover'));
csvDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  csvDropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleCsvFile(e.dataTransfer.files[0]);
});
csvFileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleCsvFile(e.target.files[0]);
});

function handleCsvFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      parsedCsvRows = parseCSV(e.target.result);
      if (!parsedCsvRows.length) {
        importCsvError.textContent = 'No rows found in this file.';
        importCsvError.classList.add('visible');
        return;
      }
      renderCsvPreview(parsedCsvRows);
      confirmImportBtn.disabled = false;
    } catch (err) {
      importCsvError.textContent = 'Could not parse this CSV file.';
      importCsvError.classList.add('visible');
    }
  };
  reader.readAsText(file);
}

function renderCsvPreview(rows) {
  const previewRows = rows.slice(0, 5);
  csvPreviewEl.innerHTML = `
    <p class="text-sm text-secondary">${rows.length} guest${rows.length !== 1 ? 's' : ''} found. Preview:</p>
    <table>
      <thead><tr><th>Name</th><th>Email</th><th>Max +1</th></tr></thead>
      <tbody>
        ${previewRows.map((r) => `<tr><td>${escapeHtml(r.guest_name || '')}</td><td>${escapeHtml(r.email || '')}</td><td>${escapeHtml(r.max_plus_ones || '0')}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

confirmImportBtn.addEventListener('click', async () => {
  confirmImportBtn.disabled = true;
  confirmImportBtn.textContent = 'Importing…';

  try {
    const results = await importEventGuests(eventId, parsedCsvRows);
    showToast(`Imported ${results.inserted} guest(s). ${results.skipped ? results.skipped + ' skipped.' : ''}`, 'success');
    closeModal('import-csv-modal');
    allGuests = await getEventGuests(eventId);
    renderEventHeader();
    applyGuestFilter();
  } catch (err) {
    console.error(err);
    importCsvError.textContent = 'Import failed. Please check the file and try again.';
    importCsvError.classList.add('visible');
  } finally {
    confirmImportBtn.disabled = false;
    confirmImportBtn.textContent = 'Import Guests';
  }
});

// ---------------- Export CSV ----------------

exportCsvBtn.addEventListener('click', async () => {
  try {
    const rows = await exportEventGuests(eventId);
    downloadCSV(`${currentEvent.slug}-guestlist.csv`, rows);
  } catch (err) {
    console.error(err);
    showToast('Failed to export guestlist.', 'error');
  }
});

// ---------------- Send Reminder modal ----------------

const sendReminderForm = document.getElementById('send-reminder-form');
const pendingCountText = document.getElementById('pending-count-text');
const reminderError = document.getElementById('reminder-error');
let pendingGuestsCache = [];

sendReminderBtn.addEventListener('click', async () => {
  reminderError.classList.remove('visible');
  document.getElementById('reminder-subject-input').value = `Reminder: RSVP for ${currentEvent.name}`;
  document.getElementById('reminder-message-input').value =
    `Hi {guest_name},\n\nJust a friendly reminder to RSVP for {event_name} on {event_date}. Please let us know by {rsvp_deadline}.\n\n{rsvp_link}`;

  try {
    pendingGuestsCache = await getPendingGuests(eventId);
    pendingCountText.textContent = `${pendingGuestsCache.length} guest${pendingGuestsCache.length !== 1 ? 's' : ''} pending`;
    openModal('send-reminder-modal');
  } catch (err) {
    console.error(err);
    showToast('Failed to load pending guests.', 'error');
  }
});

sendReminderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  reminderError.classList.remove('visible');

  const subject = document.getElementById('reminder-subject-input').value.trim();
  const messageTemplate = document.getElementById('reminder-message-input').value.trim();
  const submitBtn = document.getElementById('send-reminder-submit-btn');

  if (!pendingGuestsCache.length) {
    reminderError.textContent = 'No pending guests to remind.';
    reminderError.classList.add('visible');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  try {
    // Look up emails for pending guests via their linked master_guests record
    const { data: guestRows, error } = await supabaseClient
      .from('event_guests')
      .select('id, guest_name, master_guests ( email )')
      .in('id', pendingGuestsCache.map((g) => g.id));

    if (error) throw error;

    const rsvpLink = `${window.location.origin}/index.html`;
    const recipients = guestRows.map((g) => ({
      email: g.master_guests?.email || null,
      name: g.guest_name,
      eventName: currentEvent.name,
      eventDate: formatDate(currentEvent.date),
      deadline: formatDate(currentEvent.rsvp_deadline),
      link: rsvpLink
    }));

    const results = await sendBulkReminders(eventId, subject, messageTemplate, recipients);
    showToast(`Sent ${results.sent} reminder(s). ${results.skipped ? results.skipped + ' skipped (no email on file).' : ''}`, 'success');
    closeModal('send-reminder-modal');
  } catch (err) {
    console.error(err);
    reminderError.textContent = 'Failed to send reminders.';
    reminderError.classList.add('visible');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Reminders';
  }
});

// ---------------- Modal close wiring ----------------

document.querySelectorAll('[data-close-modal]').forEach((el) => {
  el.addEventListener('click', () => closeModal(el.dataset.closeModal));
});
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});
