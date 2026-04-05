const STORAGE_KEY = "catalogo_videos_single_html_v2";
const PER_PAGE = 12;

let state = {
  items: loadItems(),
  page: 1,
  filter: "all",
  query: "",
  sort: "newest",
  editId: null
};

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function showError(message = "") {
  const box = document.getElementById("errorBox");
  if (!message) {
    box.style.display = "none";
    box.textContent = "";
    return;
  }
  box.style.display = "block";
  box.textContent = message;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseYouTubeId(url) {
  const patterns = [
    /youtu\.be\/([^?&/]+)/,
    /youtube\.com\/watch\?v=([^?&/]+)/,
    /youtube\.com\/shorts\/([^?&/]+)/,
    /youtube\.com\/embed\/([^?&/]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function parseVimeoId(url) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function getYouTubeMetadata(url) {
  const ytId = parseYouTubeId(url);
  if (!ytId) return null;

  return {
    platform: "YouTube",
    title: "Video de YouTube",
    thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
    mode: "iframe",
    playable: true,
    embedUrl: `https://www.youtube.com/embed/${ytId}` 
  };
}

function parseThisVid(url) {
  const singleVideoMatch = url.match(/thisvid\.com\/.*\/video\/([^/]+)/i);
  const videosMatch = url.match(/thisvid\.com\/.*\/videos\/([^/]+)/i);
  const playlistMatch = url.match(/thisvid\.com\/playlist\/(\d+)\/video\/([^/]+)/i);
  
  if (playlistMatch) {
    return playlistMatch[2];
  } else if (singleVideoMatch) {
    return singleVideoMatch[1];
  } else if (videosMatch) {
    return videosMatch[1];
  }
  return null;
}

function createThisVidThumbnail(title) {
  const safeTitle = title || "ThisVid";
  const encodedTitle = encodeURIComponent(safeTitle);
  
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' 
  width='480' height='270' viewBox='0 0 480 270'><defs><linearGradient 
  id='bg' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23000000'/>
  <stop offset='100%' stop-color='%23111111'/></linearGradient><linearGradient 
  id='redGrad' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23ff3333'/>
  <stop offset='100%' stop-color='%23cc0000'/></linearGradient><filter id='softGlow' 
  x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='6' result='blur'/><feMerge>
  <feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge></filter><filter id='shadow' x='-30%' y='-30%' width='160%' height='160%'><feDropShadow dx='0' dy='5' stdDeviation='6' flood-color='%23000000' flood-opacity='0.45'/></filter></defs><rect width='480' height='270' fill='url(%23bg)'/><g opacity='0.08'>
  <circle cx='390' cy='40' r='1.3' fill='%23ffffff'/><circle cx='420' cy='85' r='1.8' fill='%23ffffff'/><circle cx='60' cy='210' r='1.2' fill='%23ffffff'/><circle cx='310' cy='220' r='1.4' fill='%23ffffff'/></g><g filter='url(%23shadow)'><text x='120' y='152' font-family='Arial Black, Arial, sans-serif' font-size='58' font-weight='900' 
  fill='url(%23redGrad)'>THIS</text><text x='274' y='152' font-family='Arial Black, Arial, sans-serif' font-size='58' font-weight='900' fill='%23ffffff'>VID</text></g><g filter='url(%23softGlow)'><path d='M340 95 A55 55 0 1 1 340 165' fill='none' stroke='url(%23redGrad)' stroke-width='8' stroke-linecap='round'/></g><text x='240' y='235' font-family='Arial, sans-serif' font-size='22' font-weight='700' fill='%23dddddd' text-anchor='middle'>${encodedTitle}</text><rect x='18' y='18' width='92' height='28' rx='8' fill='%23ffffff10' stroke='%23ffffff20'/>
  <text x='64' y='37' font-family='Arial, sans-serif' font-size='12' text-anchor='middle' fill='%23e5e7eb'>ThisVid</text></svg>`;
}

function getThisVidMetadata(url) {
  const slug = parseThisVid(url);
  if (!slug) return null;

  const title = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\bThis\b/g, 'this')
    .replace(/\bThe\b/g, 'the')
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bFor\b/g, 'for');

  return {
    platform: "ThisVid",
    title,
    thumbnail: createThisVidThumbnail(title),
    mode: "link",
    playable: false,
    embedUrl: ""
  };
}


function getVideoMetadata(url) {
  const yt = getYouTubeMetadata(url);
  if (yt) return yt;

  const thisVid = getThisVidMetadata(url);
  if (thisVid) return thisVid;


  if (isDirectVideo(url)) {
    const fileName = url.split("/").pop().split("?")[0] || "Video directo";
    return {
      platform: "Archivo directo",
      title: fileName,
      thumbnail: `https://dummyimage.com/480x270/374151/ffffff&text=${encodeURIComponent(fileName)}`,
      mode: "video",
      playable: true,
      embedUrl: url
    };
  }

  const siteName = getSiteName(url);
  return {
    platform: "Otro",
    title: `Video externo (${siteName})`,
    thumbnail: `https://dummyimage.com/480x270/6b7280/ffffff&text=${encodeURIComponent(siteName)}`,
    mode: "link",
    playable: false,
    embedUrl: ""
  };
}

function isDirectVideo(url) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function getSiteName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "sitio externo";
  }
}

function metadataFromUrl(url) {
  return getVideoMetadata(url);
}

function addItem(url) {
  const meta = metadataFromUrl(url);
  console.log(meta)
  state.items.unshift({
    id: crypto.randomUUID(),
    url,
    title: meta.title,
    platform: meta.platform,
    thumbnail: meta.thumbnail,
    embedUrl: meta.embedUrl,
    mode: meta.mode,
    playable: meta.playable,
    favorite: false,
    createdAt: new Date().toISOString()
  });
  saveItems();
  state.page = 1;
  render();
}

function updateItem(id, nextTitle, nextUrl) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;

  const meta = metadataFromUrl(nextUrl);
  item.url = nextUrl;
  item.title = nextTitle || meta.title;
  item.platform = meta.platform;
  item.thumbnail = meta.thumbnail;
  item.embedUrl = meta.embedUrl;
  item.mode = meta.mode;
  item.playable = meta.playable;

  saveItems();
  state.editId = null;
  hideEditPanel();
  render();
}

function deleteItem(id) {
  state.items = state.items.filter(x => x.id !== id);
  saveItems();
  if (state.editId === id) {
    state.editId = null;
    hideEditPanel();
  }
  const totalPages = Math.max(1, Math.ceil(getVisibleItems().length / PER_PAGE));
  if (state.page > totalPages) state.page = totalPages;
  render();
}

function toggleFavorite(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  saveItems();
  render();
}

function getVisibleItems() {
  let items = [...state.items];

  if (state.filter === "favorites") {
    items = items.filter(x => x.favorite);
  } else if (state.filter !== "all") {
    items = items.filter(x => x.platform === state.filter);
  }

  if (state.query.trim()) {
    const q = state.query.trim().toLowerCase();
    items = items.filter(x =>
      x.title.toLowerCase().includes(q) ||
      x.url.toLowerCase().includes(q) ||
      x.platform.toLowerCase().includes(q)
    );
  }

  if (state.sort === "newest") {
    items.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (state.sort === "oldest") {
    items.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (state.sort === "title") {
    items.sort((a,b) => a.title.localeCompare(b.title, "es"));
  }

  return items;
}

function renderStats(items) {
  const total = state.items.length;
  const favorites = state.items.filter(x => x.favorite).length;
  const playable = state.items.filter(x => x.playable).length;

  document.getElementById("stats").innerHTML = `
    <div class="chip">Total: <strong>${total}</strong></div>
    <div class="chip">Visibles: <strong>${items.length}</strong></div>
    <div class="chip">Favoritos: <strong>${favorites}</strong></div>
    <div class="chip">Reproducibles: <strong>${playable}</strong></div>
  `;
}

function renderCard(item) {
  const playButton = item.playable
    ? `<button class="mini-btn" onclick="openPlayer('${item.id}')">▶ Ver</button>`
    : `<a class="mini-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">↗ Abrir</a>`;

  return `
    <article class="card">
      <div class="poster">
        <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}">
        <div class="badge">${escapeHtml(item.platform)}</div>
        <button class="favorite" title="Favorito" onclick="toggleFavorite('${item.id}')">
          ${item.favorite ? "★" : "☆"}
        </button>
        <div class="overlay">
          ${playButton}
        </div>
      </div>

      <div class="body">
        <div class="title">${escapeHtml(item.title)}</div>
        <div class="meta">${escapeHtml(getSiteName(item.url))}</div>

        <div class="actions">
          ${item.playable
            ? `<button class="primary" onclick="openPlayer('${item.id}')">Reproducir</button>`
            : `<a class="button primary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Abrir</a>`
          }
          <button class="secondary" onclick="startEdit('${item.id}')">Editar</button>
          <button class="danger" onclick="deleteItemAndRender('${item.id}')">Eliminar</button>
          <button class="secondary" onclick="copyToClipboard('${item.id}')">Link</button>
        </div>
      </div>
    </article>
  `;
}

function renderPagination(totalPages) {
  const el = document.getElementById("pagination");
  if (totalPages <= 1) {
    el.innerHTML = "";
    return;
  }

  let html = `<button ${state.page === 1 ? "disabled" : ""} onclick="goToPage(${state.page - 1})">Anterior</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === state.page ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
  }
  html += `<button ${state.page === totalPages ? "disabled" : ""} onclick="goToPage(${state.page + 1})">Siguiente</button>`;
  el.innerHTML = html;
}

function render() {
  showError("");
  const visible = getVisibleItems();
  renderStats(visible);

  const totalPages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page - 1) * PER_PAGE;
  const pageItems = visible.slice(start, start + PER_PAGE);

  document.getElementById("countLabel").textContent = `${visible.length} resultado(s)`;
  document.getElementById("sectionHeading").textContent =
    state.filter === "favorites" ? "Favoritos" : "Catálogo";

  const grid = document.getElementById("grid");
  if (!pageItems.length) {
    grid.innerHTML = `<div class="empty">No hay videos para mostrar con los filtros actuales.</div>`;
  } else {
    grid.innerHTML = pageItems.map(renderCard).join("");
  }

  renderPagination(totalPages);
}

function openPlayer(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;

  document.getElementById("modalTitle").textContent = item.title;
  const body = document.getElementById("modalBody");

  if (item.mode === "iframe" && item.embedUrl) {
    body.innerHTML = `
      <iframe
        src="${escapeHtml(item.embedUrl)}"
        title="${escapeHtml(item.title)}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    `;
  } else if (item.mode === "video" && item.embedUrl) {
    body.innerHTML = `
      <video controls autoplay preload="metadata">
        <source src="${escapeHtml(item.embedUrl)}">
        Tu navegador no soporta video HTML5.
      </video>
    `;
  } else {
    body.innerHTML = `
      <div class="fallback-box">
        <div style="text-align: center; padding: 40px;">
          ${item.platform === "ThisVid" ? `
            <div style="margin-bottom: 20px;">
              <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #8B0000, #4B0082); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-weight: bold; font-size: 24px; color: white;">
                TV
              </div>
            </div>
          ` : ''}
          <h3 style="color: #fff; margin-bottom: 12px;">${escapeHtml(item.title)}</h3>
          <p style="color: #b3b3b3; margin-bottom: 20px;">
            ${item.platform === "ThisVid" 
              ? "Este video de ThisVid requiere abrirse en una nueva pestaña para su reproducción."
              : "Este enlace no admite reproducción embebida en la app."
            }
          </p>
          <a class="button primary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" style="display: inline-flex; align-items: center; gap: 8px;">
            ${item.platform === "ThisVid" ? '🔞' : '🔗'} Abrir en nueva pestaña
          </a>
        </div>
      </div>
    `;
  }

  document.getElementById("playerModal").classList.add("show");
}

function closePlayer() {
  document.getElementById("playerModal").classList.remove("show");
  document.getElementById("modalBody").innerHTML = "";
}

function startEdit(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;
  state.editId = id;
  document.getElementById("editTitle").value = item.title;
  document.getElementById("editUrl").value = item.url;
  document.getElementById("editPanel").classList.add("show");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function hideEditPanel() {
  document.getElementById("editPanel").classList.remove("show");
}

function saveEdit() {
  if (!state.editId) return;
  const title = document.getElementById("editTitle").value.trim();
  const url = document.getElementById("editUrl").value.trim();

  if (!url) {
    showError("La URL es obligatoria.");
    return;
  }

  try {
    new URL(url);
  } catch {
    showError("La URL no es válida.");
    return;
  }

  updateItem(state.editId, title, url);
}

function goToPage(page) {
  const totalPages = Math.max(1, Math.ceil(getVisibleItems().length / PER_PAGE));
  if (page < 1 || page > totalPages) return;
  state.page = page;
  render();
}

function copyToClipboard(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;
  
  navigator.clipboard.writeText(item.url).then(() => {
    // Show success toast
    Swal.fire({
      position: 'top-end',
      icon: 'success',
      title: '¡URL copiada!',
      text: 'La URL ha sido copiada al portapapeles',
      showConfirmButton: false,
      timer: 2000,
      toast: true,
      background: 'var(--panel)',
      color: 'var(--text)',
      iconColor: 'var(--ok)'
    });
  }).catch(err => {
    console.error('Error al copiar:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error al copiar',
      text: 'No se pudo copiar la URL al portapapeles',
      confirmButtonText: 'OK',
      background: 'var(--panel)',
      color: 'var(--text)',
      confirmButtonColor: 'var(--primary)'
    });
  });
}

function deleteItemAndRender(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;
  
  Swal.fire({
    title: '¿Eliminar video?',
    html: `¿Estás seguro de que quieres eliminar <strong>${escapeHtml(item.title)}</strong>?<br><br>Esta acción no se puede deshacer.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: 'var(--danger)',
    cancelButtonColor: 'var(--chip)',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    background: 'var(--panel)',
    color: 'var(--text)',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      deleteItem(id);
      Swal.fire({
        position: 'top-end',
        icon: 'success',
        title: 'Eliminado',
        text: 'El video ha sido eliminado',
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        background: 'var(--panel)',
        color: 'var(--text)',
        iconColor: 'var(--ok)'
      });
    }
  });
}

document.getElementById("addForm").addEventListener("submit", (e) => {
  e.preventDefault();
  showError("");
  const input = document.getElementById("urlInput");
  const url = input.value.trim();

  if (!url) {
    showError("La URL es obligatoria.");
    return;
  }

  try {
    new URL(url);
  } catch {
    showError("La URL no es válida.");
    return;
  }

  addItem(url);
  input.value = "";
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  state.query = e.target.value;
  state.page = 1;
  render();
});

document.getElementById("platformFilter").addEventListener("change", (e) => {
  state.filter = e.target.value;
  state.page = 1;
  render();
});

document.getElementById("sortSelect").addEventListener("change", (e) => {
  state.sort = e.target.value;
  render();
});

document.getElementById("saveEditBtn").addEventListener("click", saveEdit);
document.getElementById("cancelEditBtn").addEventListener("click", () => {
  state.editId = null;
  hideEditPanel();
});

document.getElementById("closeModalBtn").addEventListener("click", closePlayer);
document.getElementById("playerModal").addEventListener("click", (e) => {
  if (e.target.id === "playerModal") closePlayer();
});

render();

// Force immediate thumbnail refresh for ALL items
console.log('=== FORCING THUMBNAIL UPDATE ===');
state.items.forEach((item, index) => {
  console.log(`Item ${index}: ${item.platform} - ${item.title}`);
  console.log(`Current thumbnail: ${item.thumbnail}`);
  
  // Force regenerate metadata for ALL items
  const newMetadata = getVideoMetadata(item.url);
  if (newMetadata) {
    item.thumbnail = newMetadata.thumbnail;
    console.log(`New thumbnail: ${newMetadata.thumbnail}`);
  }
});

// Save immediately
saveItems();
console.log('=== THUMBNAILS UPDATED AND SAVED ===');

// Force re-render
setTimeout(() => {
  render();
  console.log('=== RE-RENDERED WITH NEW THUMBNAILS ===');
}, 100);
