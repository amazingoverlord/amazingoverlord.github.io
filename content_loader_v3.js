function link(label, url, external) {
  const a = document.createElement('a');
  a.href = url;
  a.textContent = label;
  if (external) a.target = '_blank';
  return a;
}

async function loadContent() {
  const res = await fetch('/content_v2.json');
  const data = await res.json();

  // Title

  // Latest Work
  const workDiv = document.getElementById('latest-work');
  if (workDiv) {
    data.latestWork.forEach(item => {
      workDiv.appendChild(link(item.label, item.url, item.external));
      workDiv.appendChild(document.createTextNode(` (${item.type})`));
      workDiv.appendChild(document.createElement('br'));
    });
  }

  // Current Forms
  const formsDiv = document.getElementById('current-forms');
  if (formsDiv) {
    data.currentForms.forEach((item, i) => {
      formsDiv.appendChild(link(item.label, item.url, item.external));
      if (i < data.currentForms.length - 1) {
        formsDiv.appendChild(document.createTextNode(', '));
      }
    });
  }

  // Recommended
  const recDiv = document.getElementById('recommended');
  if (recDiv) {
    data.recommended.forEach(item => {
      recDiv.appendChild(link(item.label, item.url, true));
      recDiv.appendChild(document.createElement('br'));
    });
  }

  // Social
  const socialDiv = document.getElementById('social');
  if (socialDiv) {
    data.social.forEach(item => {
      socialDiv.appendChild(link(item.label, item.url, item.external));
      socialDiv.appendChild(document.createElement('br'));
    });
  }
}

loadContent();