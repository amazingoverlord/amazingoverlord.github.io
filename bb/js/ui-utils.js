// =====================================================
// Shared UI utilities: toast, modal helpers, escaping
// =====================================================

function showToast(message, type = 'default') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast visible ${type === 'error' ? 'error' : type === 'success' ? 'success' : ''}`;

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 3500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('open');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function confirmAction(message) {
  return window.confirm(message);
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function downloadCSV(filename, rows) {
  if (!rows || !rows.length) {
    showToast('Nothing to export', 'error');
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
          const escaped = val.replace(/"/g, '""');
          return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
        })
        .join(',')
    )
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  const parseLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          cur += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur);
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] !== undefined ? values[i].trim() : '';
    });
    return obj;
  });
}
