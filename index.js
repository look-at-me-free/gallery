document.addEventListener("DOMContentLoaded", async () => {
  const normalize = (str = "") =>
    String(str)
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const titleCase = (str = "") =>
    String(str).replace(/\b\w/g, (m) => m.toUpperCase());

  const escapeHtml = (str = "") => {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  };

  const deriveTags = (item) => {
    const source = normalize(
      `${item.caption || ""} ${item.alt || ""} ${(item.tags || []).join(" ")}`
    );

    const tags = new Set(Array.isArray(item.tags) ? item.tags.map(titleCase) : []);

    const rules = [
      ["perfect", "Perfection"],
      ["perfection", "Perfection"],
      ["supreme", "Perfection"],
      ["superior", "Perfection"],
      ["foundational", "Perfection"],
      ["corner stone", "Perfection"],
      ["highest form", "Highest Form"],
      ["new standard", "Highest Form"],
      ["winner", "Winners"],
      ["number 1", "Winners"],
      ["selena", "Named"],
      ["mexico", "Mexico"],
      ["mexican", "Mexico"],
      ["white", "White"],
      ["1980s", "Vintage"],
      ["older", "Vintage"],
      ["dream", "Dream"],
      ["image", "Unsorted"]
    ];

    rules.forEach(([needle, tag]) => {
      if (source.includes(needle)) tags.add(tag);
    });

    if (!tags.size) {
      source
        .split(" ")
        .filter((w) => w.length > 3)
        .slice(0, 3)
        .forEach((w) => tags.add(titleCase(w)));
    }

    if (!tags.size) tags.add("Unsorted");
    return Array.from(tags);
  };

  async function loadLinks() {
    const res = await fetch("./links.json", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Could not load links.json (${res.status})`);
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("links.json must contain an array");
    }

    return data.map((item, index) => {
      if (typeof item === "string") {
        return {
          id: index,
          src: item,
          pageHref: item,
          caption: `Image ${index + 1}`,
          alt: `Image ${index + 1}`,
          tags: ["Unsorted"]
        };
      }

      const src = item.src || item.image || item.url || "";
      const caption = item.caption || item.alt || `Image ${index + 1}`;
      const alt = item.alt || caption;
      const pageHref = item.pageHref || item.href || src;

      return {
        id: index,
        src,
        pageHref,
        caption,
        alt,
        tags: deriveTags(item)
      };
    }).filter((item) => item.src);
  }

  let items = [];
  try {
    items = await loadLinks();
  } catch (err) {
    document.body.innerHTML = `
      <div style="padding:32px;font-family:Arial,sans-serif;color:white;background:#111;min-height:100vh;">
        <h1 style="margin-bottom:12px;">Could not load gallery</h1>
        <p style="opacity:.8;">${escapeHtml(err.message)}</p>
        <p style="opacity:.7;margin-top:16px;">Make sure <code>links.json</code> is in the repo root.</p>
      </div>
    `;
    return;
  }

  if (!items.length) {
    document.body.innerHTML = `
      <div style="padding:32px;font-family:Arial,sans-serif;color:white;background:#111;min-height:100vh;">
        <h1 style="margin-bottom:12px;">No images found</h1>
        <p style="opacity:.8;">Your <code>links.json</code> loaded, but it has no valid image entries.</p>
      </div>
    `;
    return;
  }

  const uniqueTags = Array.from(new Set(items.flatMap((item) => item.tags))).sort();
  const PREVIEW_COUNT = 12;

  let searchQuery = "";
  let activeTag = "All";
  let expanded = false;
  let filteredItems = [...items];
  let currentLightboxIndex = 0;

  document.body.innerHTML = `
    <div id="gallery-app">
      <header class="gallery-header">
        <div class="gallery-header-inner">
          <div class="gallery-heading">
            <h1 class="gallery-title">Gallery Archive</h1>
            <p class="gallery-subtitle">Browse, search, and expand the collection.</p>
          </div>

          <div class="gallery-search-wrap">
            <input
              id="gallery-search"
              class="gallery-search"
              type="text"
              placeholder="Search captions..."
              autocomplete="off"
            />
          </div>

          <div class="gallery-pills-row">
            <button class="gallery-pill is-active" data-tag="All" type="button">All</button>
            ${uniqueTags.map((tag) => `
              <div class="gallery-pill-group" data-group="${escapeHtml(tag)}">
                <button class="gallery-pill gallery-pill-toggle" data-tag="${escapeHtml(tag)}" type="button">
                  ${escapeHtml(tag)}
                </button>
                <div class="gallery-pill-menu" data-menu="${escapeHtml(tag)}">
                  <div class="gallery-pill-menu-inner">
                    ${items
                      .filter((item) => item.tags.includes(tag))
                      .slice(0, 30)
                      .map((item) => `
                        <button
                          class="gallery-menu-item"
                          type="button"
                          data-id="${item.id}"
                          data-tag="${escapeHtml(tag)}"
                        >
                          ${escapeHtml(item.caption)}
                        </button>
                      `)
                      .join("")}
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </header>

      <section class="gallery-carousel-section">
        <div class="gallery-section-head">
          <h2>Highlights</h2>
        </div>
        <div class="gallery-carousel" id="gallery-carousel"></div>
      </section>

      <section class="gallery-grid-section">
        <div class="gallery-section-head">
          <h2>Gallery</h2>
          <span class="gallery-count" id="gallery-count"></span>
        </div>

        <div class="gallery-grid" id="gallery-grid"></div>

        <div class="gallery-expand-wrap">
          <button id="gallery-expand-btn" class="gallery-expand-btn" type="button">
            Expand
          </button>
        </div>
      </section>
    </div>
  `;

  const lightbox = document.createElement("div");
  lightbox.className = "gallery-lightbox";
  lightbox.innerHTML = `
    <div class="gallery-lightbox-backdrop"></div>
    <div class="gallery-lightbox-panel">
      <button class="gallery-lightbox-close" type="button" aria-label="Close">×</button>
      <button class="gallery-lightbox-nav prev" type="button" aria-label="Previous">‹</button>
      <img class="gallery-lightbox-image" alt="" />
      <button class="gallery-lightbox-nav next" type="button" aria-label="Next">›</button>
      <div class="gallery-lightbox-caption"></div>
    </div>
  `;
  document.body.appendChild(lightbox);

  const searchInput = document.getElementById("gallery-search");
  const carouselEl = document.getElementById("gallery-carousel");
  const gridEl = document.getElementById("gallery-grid");
  const expandBtn = document.getElementById("gallery-expand-btn");
  const countEl = document.getElementById("gallery-count");
  const pillButtons = Array.from(document.querySelectorAll(".gallery-pill"));
  const pillGroups = Array.from(document.querySelectorAll(".gallery-pill-group"));
  const menuItems = Array.from(document.querySelectorAll(".gallery-menu-item"));

  const lightboxImg = lightbox.querySelector(".gallery-lightbox-image");
  const lightboxCaption = lightbox.querySelector(".gallery-lightbox-caption");
  const lightboxClose = lightbox.querySelector(".gallery-lightbox-close");
  const lightboxPrev = lightbox.querySelector(".gallery-lightbox-nav.prev");
  const lightboxNext = lightbox.querySelector(".gallery-lightbox-nav.next");
  const lightboxBackdrop = lightbox.querySelector(".gallery-lightbox-backdrop");

  function getFilteredItems() {
    return items.filter((item) => {
      const tagMatch = activeTag === "All" || item.tags.includes(activeTag);
      const text = normalize(`${item.caption} ${item.alt} ${item.tags.join(" ")}`);
      const searchMatch = !searchQuery || text.includes(normalize(searchQuery));
      return tagMatch && searchMatch;
    });
  }

  function createCard(item, indexInFiltered) {
    const card = document.createElement("article");
    card.className = "gallery-card";
    card.innerHTML = `
      <button class="gallery-card-button" type="button" aria-label="${escapeHtml(item.caption)}">
        <div class="gallery-image-wrap">
          <img class="gallery-image" src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" loading="lazy" />
        </div>
        <div class="gallery-caption">${escapeHtml(item.caption)}</div>
      </button>
    `;

    card.querySelector(".gallery-card-button").addEventListener("click", () => {
      openLightbox(indexInFiltered);
    });

    return card;
  }

  function renderCarousel(list) {
    carouselEl.innerHTML = "";

    list.slice(0, 20).forEach((item, index) => {
      const btn = document.createElement("button");
      btn.className = "gallery-carousel-item";
      btn.type = "button";
      btn.innerHTML = `
        <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" loading="lazy" />
        <span>${escapeHtml(item.caption)}</span>
      `;
      btn.addEventListener("click", () => openLightbox(index));
      carouselEl.appendChild(btn);
    });
  }

  function renderGrid(list) {
    gridEl.innerHTML = "";

    const visibleItems = expanded ? list : list.slice(0, PREVIEW_COUNT);
    visibleItems.forEach((item, index) => {
      gridEl.appendChild(createCard(item, index));
    });

    countEl.textContent = `${list.length} item${list.length === 1 ? "" : "s"}`;

    if (list.length <= PREVIEW_COUNT) {
      expandBtn.style.display = "none";
    } else {
      expandBtn.style.display = "inline-flex";
      expandBtn.textContent = expanded ? "Collapse" : "Expand";
    }
  }

  function renderAll() {
    filteredItems = getFilteredItems();
    renderCarousel(filteredItems);
    renderGrid(filteredItems);
  }

  function setActiveTag(tag) {
    activeTag = tag;
    expanded = false;

    pillButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.tag === tag);
    });

    renderAll();
  }

  function openLightbox(index) {
    if (!filteredItems.length) return;
    currentLightboxIndex = index;
    const item = filteredItems[currentLightboxIndex];
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt;
    lightboxCaption.textContent = item.caption;
    lightbox.classList.add("is-open");
    document.body.classList.add("lightbox-open");
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
  }

  function stepLightbox(direction) {
    if (!filteredItems.length) return;
    currentLightboxIndex =
      (currentLightboxIndex + direction + filteredItems.length) % filteredItems.length;
    openLightbox(currentLightboxIndex);
  }

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value || "";
    expanded = false;
    renderAll();
  });

  expandBtn.addEventListener("click", () => {
    expanded = !expanded;
    renderGrid(filteredItems);
  });

  pillButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveTag(btn.dataset.tag);
    });
  });

  menuItems.forEach((itemBtn) => {
    let pointerDownY = 0;
    let dragged = false;

    itemBtn.addEventListener("pointerdown", (e) => {
      pointerDownY = e.clientY;
      dragged = false;
    });

    itemBtn.addEventListener("pointermove", (e) => {
      if (Math.abs(e.clientY - pointerDownY) > 8) dragged = true;
    });

    itemBtn.addEventListener("click", (e) => {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const id = Number(itemBtn.dataset.id);
      const target = items.find((x) => x.id === id);
      if (!target) return;

      setActiveTag(itemBtn.dataset.tag);
      searchQuery = target.caption;
      searchInput.value = target.caption;
      renderAll();

      const matchIndex = filteredItems.findIndex((x) => x.id === id);
      if (matchIndex >= 0) openLightbox(matchIndex);
    });
  });

  pillGroups.forEach((group) => {
    const menu = group.querySelector(".gallery-pill-menu");
    let closeTimer = null;

    const openMenu = () => {
      clearTimeout(closeTimer);
      pillGroups.forEach((g) => {
        if (g !== group) g.classList.remove("menu-open");
      });
      group.classList.add("menu-open");
    };

    const closeMenu = () => {
      closeTimer = setTimeout(() => {
        group.classList.remove("menu-open");
      }, 160);
    };

    group.addEventListener("mouseenter", openMenu);
    group.addEventListener("mouseleave", closeMenu);
    group.addEventListener("focusin", openMenu);
    menu.addEventListener("mouseenter", openMenu);
    menu.addEventListener("mouseleave", closeMenu);
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxBackdrop.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", () => stepLightbox(-1));
  lightboxNext.addEventListener("click", () => stepLightbox(1));

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;

    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });

  renderAll();
});
