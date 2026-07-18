// =====================================================
// Admin: create / edit event logic
// =====================================================

const eventForm = document.getElementById('event-form');
const nameInput = document.getElementById('name-input');
const slugInput = document.getElementById('slug-input');
const dateInput = document.getElementById('date-input');
const timeInput = document.getElementById('time-input');
const venueInput = document.getElementById('venue-input');
const venueAddressInput = document.getElementById('venue-address-input');
const additionalInfoInput = document.getElementById('additional-info-input');
const deadlineInput = document.getElementById('deadline-input');
const activeCheckbox = document.getElementById('active-checkbox');
const formError = document.getElementById('form-error');
const saveBtn = document.getElementById('save-btn');
const formHeading = document.getElementById('form-heading');
const pageTitle = document.getElementById('page-title');

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');
let slugManuallyEdited = false;

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

nameInput.addEventListener('input', () => {
  if (!slugManuallyEdited) {
    slugInput.value = generateSlug(nameInput.value);
  }
});

slugInput.addEventListener('input', () => {
  slugManuallyEdited = true;
});

(async function init() {
  const isAuthed = await requireAuth();
  if (!isAuthed) return;

  if (eventId) {
    formHeading.textContent = 'Edit Event';
    pageTitle.textContent = 'Edit Event';
    slugManuallyEdited = true;
    await loadEventData(eventId);
  }
})();

async function loadEventData(id) {
  try {
    const event = await getEventBySlugOrId(id);
    populateForm(event);
  } catch (err) {
    console.error(err);
    showToast('Failed to load event.', 'error');
  }
}

function populateForm(data) {
  nameInput.value = data.name || '';
  slugInput.value = data.slug || '';
  dateInput.value = data.date || '';
  timeInput.value = data.time || '';
  venueInput.value = data.venue || '';
  venueAddressInput.value = data.venue_address || '';
  additionalInfoInput.value = data.additional_info || '';
  deadlineInput.value = data.rsvp_deadline || '';
  activeCheckbox.checked = !!data.is_active;
}

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.remove('visible');

  const formData = {
    name: nameInput.value.trim(),
    slug: slugInput.value.trim(),
    date: dateInput.value || null,
    time: timeInput.value.trim() || null,
    venue: venueInput.value.trim() || null,
    venue_address: venueAddressInput.value.trim() || null,
    additional_info: additionalInfoInput.value.trim() || null,
    rsvp_deadline: deadlineInput.value || null,
    is_active: activeCheckbox.checked
  };

  if (!formData.name || !formData.slug) {
    formError.textContent = 'Name and slug are required.';
    formError.classList.add('visible');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    await saveEvent(formData);
    showToast('Event saved.', 'success');
    window.location.href = 'admin-dashboard.html';
  } catch (err) {
    console.error(err);
    formError.textContent = err.message?.includes('duplicate')
      ? 'That slug is already in use by another event.'
      : 'Failed to save event. Please try again.';
    formError.classList.add('visible');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Event';
  }
});

async function saveEvent(formData) {
  if (eventId) {
    return updateEvent(eventId, formData);
  }
  return createEvent(formData);
}
