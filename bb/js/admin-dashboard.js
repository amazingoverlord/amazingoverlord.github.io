// =====================================================
// Admin dashboard logic
// =====================================================

const loadingStateEl = document.getElementById('loading-state');
const dashboardContentEl = document.getElementById('dashboard-content');
const statsGridEl = document.getElementById('stats-grid');
const eventsListEl = document.getElementById('events-list');
const logoutBtn = document.getElementById('logout-btn');

logoutBtn.addEventListener('click', logout);

(async function init() {
  const isAuthed = await requireAuth();
  if (!isAuthed) return;
  await loadDashboard();
})();

async function loadDashboard() {
  try {
    const events = await getAllEvents();
    renderStats(events);
    renderEventCards(events);
    loadingStateEl.classList.add('hidden');
    dashboardContentEl.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    loadingStateEl.classList.add('hidden');
    showToast('Failed to load dashboard data.', 'error');
  }
}

function renderStats(events) {
  const totalEvents = events.length;
  const totalInvitations = events.reduce((sum, e) => sum + e.stats.totalInvited, 0);
  const totalYes = events.reduce((sum, e) => sum + e.stats.yes, 0);
  const totalHeadcount = events.reduce((sum, e) => sum + e.stats.headcount, 0);

  statsGridEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${totalEvents}</div>
      <div class="stat-label">Total Events</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalInvitations}</div>
      <div class="stat-label">Total Invitations</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalYes}</div>
      <div class="stat-label">Confirmed Yes</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalHeadcount}</div>
      <div class="stat-label">Total Headcount</div>
    </div>
  `;
}

function renderEventCards(events) {
  eventsListEl.innerHTML = '';

  if (!events.length) {
    eventsListEl.innerHTML = `<div class="empty-state">No events yet. Create your first event to get started.</div>`;
    return;
  }

  events.forEach((event) => {
    const card = document.createElement('div');
    card.className = 'card';
    const stats = event.stats;

    card.innerHTML = `
      <div class="event-card-header">
        <div>
          <h2>${escapeHtml(event.name)}</h2>
          <p class="text-secondary text-sm">${formatDate(event.date)}${event.venue ? ' · ' + escapeHtml(event.venue) : ''}</p>
        </div>
        <span class="badge ${event.is_active ? 'badge-active' : 'badge-inactive'}">${event.is_active ? 'Active' : 'Inactive'}</span>
      </div>

      <div class="event-card-meta">
        <span><span class="badge badge-yes">Yes ${stats.yes}</span></span>
        <span><span class="badge badge-no">No ${stats.no}</span></span>
        <span><span class="badge badge-pending">Pending ${stats.pending}</span></span>
        <span class="text-secondary">Headcount: <strong>${stats.headcount}</strong></span>
      </div>

      <div class="flex gap-8" style="flex-wrap: wrap;">
        <a class="btn btn-secondary btn-sm" href="admin-event-detail.html?id=${event.id}">View</a>
        <a class="btn btn-secondary btn-sm" href="admin-event-edit.html?id=${event.id}">Edit</a>
        <button class="btn btn-secondary btn-sm toggle-active-btn" data-id="${event.id}" data-active="${event.is_active}">
          ${event.is_active ? 'Deactivate' : 'Activate'}
        </button>
        <button class="btn btn-danger btn-sm delete-event-btn" data-id="${event.id}" data-name="${escapeHtml(event.name)}">Delete</button>
      </div>
    `;

    eventsListEl.appendChild(card);
  });

  eventsListEl.querySelectorAll('.toggle-active-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleToggleActive(btn.dataset.id, btn.dataset.active !== 'true'));
  });

  eventsListEl.querySelectorAll('.delete-event-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteEvent(btn.dataset.id, btn.dataset.name));
  });
}

async function handleToggleActive(eventId, newActiveState) {
  try {
    await toggleEventActive(eventId, newActiveState);
    showToast(newActiveState ? 'Event activated' : 'Event deactivated', 'success');
    await loadDashboard();
  } catch (err) {
    console.error(err);
    showToast('Failed to update event status.', 'error');
  }
}

async function handleDeleteEvent(eventId, eventName) {
  if (!confirmAction(`Delete "${eventName}"? This will remove its guestlist and all RSVPs. This cannot be undone.`)) {
    return;
  }
  try {
    await deleteEvent(eventId);
    showToast('Event deleted', 'success');
    await loadDashboard();
  } catch (err) {
    console.error(err);
    showToast('Failed to delete event.', 'error');
  }
}
