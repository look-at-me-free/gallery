document.addEventListener("DOMContentLoaded", async () => {
  const escapeHtml = (str = "") => {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  };

  const normalize = (str = "") =>
    String(str).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  const filenameToCaption = (url = "") => {
    const file = url.split("/").pop()?.split("?")[0] || "Untitled";
    return file.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled";
  };

  function extractImageUrl(line = "") {
    const trimmed = line.trim();
    if (!trimmed) return "";

    const srcMatch = trimmed.match(/src="([^"]+)"/i);
    if (srcMatch) return srcMatch[1].trim();

    if (/^https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|avif)(\?\S*)?$/i.test(trimmed)) {
      return trimmed;
    }

    return "";
  }

  async function loadText(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
    return await res.text();
  }

  let linksRaw = "";
  let captionsRaw = "";

  try {
    [linksRaw, captionsRaw] = await Promise.all([
      loadText("./links.txt"),
      loadText("./captions.txt").catch(() => "")
    ]);
  } catch (err) {
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;background:#0b0b0f;color:#f4f1ea;font-family:Arial,sans-serif;padding:24px;">
        <div>
          <h1>Gallery failed to load</h1>
          <p>${escapeHtml(err.message)}</p>
        </div>
      </main>
    `;
    return;
  }

  const linkLines = linksRaw.split(/\r?\n/);
  const captionLines = captionsRaw.split(/\r?\n/);

  const items = [];
  for (let i = 0; i < linkLines.length; i++) {
    const src = extractImageUrl(linkLines[i]);
    if (!src) continue;

    const caption = (captionLines[i] || "").trim() || filenameToCaption(src);

    items.push({
      id: items.length,
      src,
      caption,
      search: normalize(caption)
    });
  }

  if (!items.length) {
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;background:#0b0b0f;color:#f4f1ea;font-family:Arial,sans-serif;padding:24px;">
        <div>
          <h1>No valid images found</h1>
          <p>Your <code>links.txt</code> loaded, but none of the lines were recognized as valid image sources.</p>
          <p>Use either direct image links or full ImgBB HTML lines, one per line.</p>
        </div>
      </main>
    `;
    return;
  }

  document.body.innerHTML = `
    <div id="gallery-app">
      <header class="gallery-header">
        <div class="gallery-header-inner">
          <h1 class="gallery-title">Gallery Archive</h1>
          <p class="gallery-subtitle">Loaded ${items.length} images.</p>
          <div class="gallery-search-wrap">
            <input id="gallery-search" class="gallery-search" type="text" placeholder="Search captions..." />
          </div>
        </div>
      </header>

      <section class="gallery-grid-section">
        <div class="gallery-grid" id="gallery-grid"></div>
      </section>
    </div>
  `;

  const grid = document.getElementById("gallery-grid");
  const search = document.getElementById("gallery-search");

  function render(list) {
    grid.innerHTML = "";

    list.forEach((item) => {
      const card = document.createElement("article");
      card.className = "gallery-card";
      card.innerHTML = `
        <button class="gallery-card-button" type="button">
          <div class="gallery-image-wrap">
            <img class="gallery-image" src="${escapeHtml(item.src)}" alt="${escapeHtml(item.caption)}" loading="lazy" />
          </div>
          <div class="gallery-caption">${escapeHtml(item.caption)}</div>
        </button>
      `;

      const img = card.querySelector("img");
      img.addEventListener("error", () => {
        img.replaceWith(Object.assign(document.createElement("div"), {
          className: "gallery-image-error",
          textContent: "Image failed to load"
        }));
      });

      grid.appendChild(card);
    });
  }

  render(items);

  search.addEventListener("input", () => {
    const q = normalize(search.value);
    render(items.filter(item => !q || item.search.includes(q)));
  });
});
