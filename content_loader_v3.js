// content_loader_v3.js
// Single content loader for content_v3.json:
//  - Populates the Dashboard's Social and Recommended sections
//  - Handles click-to-load / clear behavior for the Portfolio's project display

(function () {
  let contentData = null;

  function loadContentData() {
    if (contentData) return Promise.resolve(contentData);
    return fetch('/content_v3.json')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        contentData = data;
        return contentData;
      });
  }

  function link(label, url, external) {
    const a = document.createElement('a');
    a.href = url;
    a.textContent = label;
    if (external) a.target = '_blank';
    return a;
  }

  // ---------- Dashboard: Social + Recommended ----------

  function renderDashboardLists(data) {
    const recDiv = document.getElementById('recommended');
    if (recDiv && data.recommended) {
      data.recommended.forEach(function (item) {
        recDiv.appendChild(link(item.label, item.url, true));
        recDiv.appendChild(document.createElement('br'));
      });
    }

    const socialDiv = document.getElementById('social');
    if (socialDiv && data.social) {
      data.social.forEach(function (item) {
        socialDiv.appendChild(link(item.label, item.url, item.external));
        socialDiv.appendChild(document.createElement('br'));
      });
    }
  }

  // ---------- Portfolio: project display ----------

  function clearPortfolioShow() {
    const showEl = document.getElementById('portfolio-show');
    const container = document.getElementById('portfolio-show-content');
    if (container) container.innerHTML = '';
    showEl && showEl.classList.remove('has-project');
  }

  function renderProject(project) {
    const showEl = document.getElementById('portfolio-show');
    const container = document.getElementById('portfolio-show-content');
    if (!container || !project) return;

    showEl && showEl.classList.add('has-project');
    container.innerHTML = '';

    // 1. Hero image — renders FIRST, before the title (matches original placeholder)
    if (project.heroImage) {
      const heroDiv = document.createElement('div');
      heroDiv.className = 'project-image';
      const heroImg = document.createElement('img');
      heroImg.src = project.heroImage;
      heroImg.setAttribute('width', '100%');
      heroDiv.appendChild(heroImg);
      container.appendChild(heroDiv);
    }

    // 2. Title + type + roll
    const titleDiv = document.createElement('div');
    titleDiv.className = 'project-title';
    titleDiv.appendChild(document.createTextNode(project.title + ' '));

    const typeSpan = document.createElement('span');
    typeSpan.className = 'project-type';
    typeSpan.textContent = project.type || '';
    titleDiv.appendChild(typeSpan);

    if (project.roll) {
      const rollDiv = document.createElement('div');
      rollDiv.className = 'project-roll';
      rollDiv.appendChild(document.createTextNode('Roll: '));
      const em = document.createElement('em');
      em.textContent = project.roll;
      rollDiv.appendChild(em);
      titleDiv.appendChild(rollDiv);
    }
    container.appendChild(titleDiv);

    // 3. About paragraphs + launch link
    const aboutDiv = document.createElement('div');
    aboutDiv.className = 'project-about';
    (project.about || []).forEach(function (paragraph) {
      const p = document.createElement('p');
      p.textContent = paragraph;
      aboutDiv.appendChild(p);
    });

    // Launch Project link is optional: skip it entirely if there's no real
    // link, treating missing/empty/"#" all as "no link". When a real link
    // exists, it opens in a new tab.
    if (project.link && project.link !== '#') {
      const linkDiv = document.createElement('div');
      linkDiv.className = 'project-link';
      const a = document.createElement('a');
      a.href = project.link;
      a.target = '_blank';
      a.textContent = 'Launch Project \u2192';
      linkDiv.appendChild(a);
      aboutDiv.appendChild(linkDiv);
      aboutDiv.appendChild(document.createElement('br'));
    }
    container.appendChild(aboutDiv);

    // 4. Embeds — render AFTER about (matches original placeholder).
    // "embeds" is an array of FULL raw <iframe> markup strings (copy/paste
    // straight from the source — Vimeo, YouTube, an external page, whatever),
    // injected as-is. Supports zero, one, or multiple embeds per project.
    (project.embeds || []).forEach(function (embedHtml) {
      if (!embedHtml) return;
      const featureDiv = document.createElement('div');
      featureDiv.className = 'project-feature';
      featureDiv.innerHTML = embedHtml;
      container.appendChild(featureDiv);
    });

    // 5. Gallery images
    (project.images || []).forEach(function (src) {
      const imgDiv = document.createElement('div');
      imgDiv.className = 'project-image';
      const img = document.createElement('img');
      img.src = src;
      img.setAttribute('width', '100%');
      imgDiv.appendChild(img);
      container.appendChild(imgDiv);
    });
  }

  // ---------- Portfolio: pillar lists (generated from JSON) ----------

  function renderPortfolioPillars(data) {
    const container = document.getElementById('portfolio-pillars');
    if (!container || !data.categories || !data.projects) return;

    container.innerHTML = '';

    data.categories.forEach(function (category) {
      const pillarDiv = document.createElement('div');
      pillarDiv.className = 'portfolio-pillar2';

      const h3 = document.createElement('h3');
      h3.textContent = category.label;
      pillarDiv.appendChild(h3);

      if (category.description) {
        const descSpan = document.createElement('span');
        descSpan.className = 'small';
        descSpan.textContent = category.description;
        pillarDiv.appendChild(descSpan);
        pillarDiv.appendChild(document.createElement('br'));
        pillarDiv.appendChild(document.createElement('br'));
      }

      Object.keys(data.projects).forEach(function (id) {
        const project = data.projects[id];
        if (project.category !== category.id) return;

        const a = document.createElement('a');
        a.href = '#';
        a.setAttribute('data-project', id);
        a.appendChild(document.createTextNode(project.title + ' '));

        const typeSpan = document.createElement('span');
        typeSpan.className = 'small';
        typeSpan.textContent = project.type || '';
        a.appendChild(typeSpan);

        a.addEventListener('click', handlePortfolioLinkClick);

        pillarDiv.appendChild(a);
        pillarDiv.appendChild(document.createElement('br'));
      });

      container.appendChild(pillarDiv);
    });
  }

  // ---------- Portfolio: "Recently" updates (generated from JSON) ----------

  function renderRecentUpdates(data) {
    const container = document.getElementById('recent-updates');
    if (!container || !data.recent) return;

    container.innerHTML = '';

    data.recent.forEach(function (item) {
      const updateDiv = document.createElement('div');
      updateDiv.className = 'update';

      const a = document.createElement('a');
      a.href = item.url;
      if (item.external) a.target = '_blank';
      a.appendChild(document.createTextNode(item.label + ' '));

      const smallSpan = document.createElement('span');
      smallSpan.className = 'small';
      smallSpan.textContent = item.small + (item.external ? ' \u2192' : '');
      a.appendChild(smallSpan);

      updateDiv.appendChild(a);
      container.appendChild(updateDiv);
    });
  }

  // ---------- Portfolio: deep linking via ?project= query param ----------

  function getProjectIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('project');
  }

  function setProjectInUrl(id) {
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set('project', id);
    } else {
      url.searchParams.delete('project');
    }
    history.pushState({ project: id || null }, '', url);
  }

  function handleDeepLink(data) {
    const id = getProjectIdFromUrl();
    if (id && data.projects && data.projects[id]) {
      renderProject(data.projects[id]);
    }
  }

  function handlePortfolioLinkClick(e) {
    const id = e.currentTarget.getAttribute('data-project');
    if (!id) return;
    e.preventDefault();

    loadContentData().then(function (data) {
      const project = data.projects && data.projects[id];
      if (project) {
        renderProject(project);
        setProjectInUrl(id);
      } else {
        console.warn('No portfolio entry found for id:', id);
      }
    });
  }

  function initCloseButton() {
    const closeLink = document.getElementById('portfolio-close');
    if (closeLink) {
      closeLink.addEventListener('click', function (e) {
        e.preventDefault();
        clearPortfolioShow();
        setProjectInUrl(null);
      });
    }
  }

  // Keep the displayed project in sync with browser back/forward navigation
  window.addEventListener('popstate', function () {
    loadContentData().then(function (data) {
      const id = getProjectIdFromUrl();
      if (id && data.projects && data.projects[id]) {
        renderProject(data.projects[id]);
      } else {
        clearPortfolioShow();
      }
    });
  });

  // ---------- Public init ----------

  function init() {
    loadContentData().then(function (data) {
      renderDashboardLists(data);
      renderPortfolioPillars(data);
      renderRecentUpdates(data);
      handleDeepLink(data);
    });
    initCloseButton();
  }

  window.ContentLoader = { init: init };
})();