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
    const container = document.getElementById('portfolio-show-content');
    if (container) container.innerHTML = '';
  }

  function renderProject(project) {
    const container = document.getElementById('portfolio-show-content');
    if (!container || !project) return;

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

    if (project.link) {
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

    // 4. Embed — renders AFTER about (matches original placeholder).
    // This is a generic iframe slot: sometimes a video embed (Vimeo/YouTube),
    // sometimes an external webpage or interactive demo.
    if (project.embed) {
      const featureDiv = document.createElement('div');
      featureDiv.className = 'project-feature';
      const iframe = document.createElement('iframe');
      iframe.src = project.embed;
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute(
        'allow',
        'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share'
      );
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.title = project.title;
      featureDiv.appendChild(iframe);
      container.appendChild(featureDiv);
    }

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

  function handlePortfolioLinkClick(e) {
    const id = e.currentTarget.getAttribute('data-project');
    if (!id) return;
    e.preventDefault();

    loadContentData().then(function (data) {
      const project = data.projects && data.projects[id];
      if (project) {
        renderProject(project);
      } else {
        console.warn('No portfolio entry found for id:', id);
      }
    });
  }

  function initPortfolioLinks() {
    document.querySelectorAll('.portfolio-menu a[data-project]').forEach(function (a) {
      a.addEventListener('click', handlePortfolioLinkClick);
    });

    const closeLink = document.getElementById('portfolio-close');
    if (closeLink) {
      closeLink.addEventListener('click', function (e) {
        e.preventDefault();
        clearPortfolioShow();
      });
    }
  }

  // ---------- Public init ----------

  function init() {
    loadContentData().then(function (data) {
      renderDashboardLists(data);
    });
    initPortfolioLinks();
  }

  window.ContentLoader = { init: init };
})();