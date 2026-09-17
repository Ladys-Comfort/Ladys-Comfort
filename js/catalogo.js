// =====================================================
// CATALOGO — Ladys Comfort
// Filtro por TALLA (según stock real), búsqueda,
// orden y vista rápida con galería.
// =====================================================

// "U" = talla única. Es una talla más dentro de `sizes`, así el stock,
// el agotado y el carrito funcionan igual que con S/M/L/XL.
const SIZES      = ["S", "M", "L", "XL", "U"];
// Las cuatro tallas normales, que son las que se muestran como pastillas
// cuando el producto NO es de talla única.
const SIZES_BASE = ["S", "M", "L", "XL"];

const SIZE_LABELS = {
  S:  "Talla S",
  M:  "Talla M",
  L:  "Talla L",
  XL: "Talla XL",
  U:  "Talla única"
};


const COLOR_MAP = {
  rosa: "#ff3f96", azul: "#4da6ff", amarillo: "#ffe040",
  verde: "#3ddc84", turquesa: "#00d4c8", otro: "#b0849a"
};

let allProducts = [];
let quickId     = null;
let galleryIdx  = 0;
// La entrada escalonada sólo debe correr una vez: relanzarla en cada
// cambio de filtro se percibe como parpadeo de todas las fotos.
let primerRender = true;

let state = { size: "todas", q: "", sort: "nuevo" };

// ── Helpers de producto ───────────────────────────
const stockOf      = (p, s) => Number(p?.sizes?.[s]) || 0;
const totalStock   = p => SIZES.reduce((sum, s) => sum + stockOf(p, s), 0);
const availSizes   = p => SIZES.filter(s => stockOf(p, s) > 0);
/** Producto de talla única: se muestra con una sola pastilla, no con las 4. */
const esUnica      = p => stockOf(p, "U") > 0;
const finalPrice   = p => (p.isOffer && p.offerPrice ? p.offerPrice : p.price) || 0;
const swatchOf     = p => COLOR_MAP[p.color?.toLowerCase()] || "#b0849a";
const productById  = id => allProducts.find(p => p.id === id);

// ── Carga ─────────────────────────────────────────
async function loadProducts() {
  showSkeleton();
  try {
    const snap = await db.collection("products").orderBy("createdAt", "desc").get();
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFilterCounts();
    render();
  } catch (e) {
    document.getElementById("products-grid").innerHTML = `
      <div class="grid-msg grid-msg-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12" y2="16.5"/>
        </svg>
        <p>No pudimos cargar el catálogo</p>
        <span>Revisa tu conexión e inténtalo de nuevo.</span>
        <button class="btn-retry" type="button" onclick="loadProducts()">Reintentar</button>
      </div>`;
    document.getElementById("results-count").textContent = "";
  }
}

// ── Filtro + orden ────────────────────────────────
function visibleProducts() {
  let list = [...allProducts];

  if (state.size !== "todas") {
    list = list.filter(p => stockOf(p, state.size) > 0);
  }

  if (state.q) {
    const q = state.q.toLowerCase();
    list = list.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  }

  if (state.sort === "precio-asc")  list.sort((a, b) => finalPrice(a) - finalPrice(b));
  if (state.sort === "precio-desc") list.sort((a, b) => finalPrice(b) - finalPrice(a));
  if (state.sort === "nombre")      list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));

  return list;
}

// ── Render ────────────────────────────────────────
function render() {
  const list = visibleProducts();
  const grid = document.getElementById("products-grid");
  const countEl = document.getElementById("results-count");

  countEl.textContent = list.length
    ? `${list.length} ${list.length === 1 ? "pijama" : "pijamas"}`
    : "Sin resultados";

  document.getElementById("active-filters").innerHTML = buildActiveChips();
  syncUrl();

  if (!list.length) {
    grid.innerHTML = `
      <div class="grid-msg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
          <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>
        </svg>
        <p>${emptyMessage()}</p>
        <span>Prueba con otra talla o limpia los filtros.</span>
        <button class="btn-retry" type="button" onclick="resetFilters()">Limpiar filtros</button>
      </div>`;
    return;
  }

  grid.innerHTML = list.map((p, i) => buildCard(p, i)).join("");
  primerRender = false;
}

/** Explica el resultado vacío según lo que el usuario realmente filtró. */
function emptyMessage() {
  const talla = state.size === "U" ? "talla única" : "talla " + esc(state.size);
  if (state.q && state.size !== "todas")
    return `No encontramos “${esc(state.q)}” en ${talla}`;
  if (state.q)
    return `No encontramos pijamas para “${esc(state.q)}”`;
  return `No hay pijamas disponibles en ${talla}`;
}

// ── Tarjeta ───────────────────────────────────────
function buildCard(p, index = 0) {
  const id      = escJs(p.id);
  // Las primeras tarjetas son las visibles al entrar: cargarlas ya mejora el LCP.
  const eager   = index < 4;
  const loadAttr = eager
    ? `loading="eager" fetchpriority="high"`
    : `loading="lazy" fetchpriority="low"`;
  const isOffer = !!(p.isOffer && p.offerPrice);
  const avail   = availSizes(p);
  const stock   = totalStock(p);
  const swatch  = swatchOf(p);
  const imgs    = Array.isArray(p.images) ? p.images.filter(Boolean) : [];

  // Si hay un filtro de talla activo, esa talla llega preseleccionada.
  const preset = state.size !== "todas" && avail.includes(state.size) ? state.size : null;

  const discount = isOffer && p.price > 0
    ? Math.round((1 - p.offerPrice / p.price) * 100)
    : 0;

  const badges = [
    p.isNew      ? `<span class="badge b-new">Nuevo</span>` : "",
    discount > 0 ? `<span class="badge b-offer">−${discount}%</span>` : "",
    p.isFeatured ? `<span class="badge b-feat">✦ Destacado</span>` : ""
  ].join("");

  // La imagen se ve COMPLETA (contain) sobre el color de fondo del marco.
  // Sin copia desenfocada: 25 capas de blur hacían parpadear el scroll móvil.
  const visual = imgs.length
    ? `<img src="${esc(imgs[0])}" alt="${esc(p.name)}" class="pcard-img" ${loadAttr} decoding="async">
       ${imgs[1] ? `<img src="${esc(imgs[1])}" alt="" class="pcard-img pcard-img-alt" loading="lazy" decoding="async" aria-hidden="true">` : ""}`
    : `<div class="pcard-pattern"></div>
       <div class="pcard-icon">
         <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
           <path d="M14 6h20v10l6 6v22H8V22l6-6V6z"/>
           <path d="M18 6v10a6 6 0 0012 0V6"/>
           <circle cx="24" cy="34" r="4" stroke-dasharray="3 2"/>
         </svg>
       </div>`;

  // Si es talla única sólo tiene sentido una pastilla, ya seleccionada:
  // no hay nada que elegir.
  const sizesHtml = esUnica(p)
    ? `<button type="button" class="sz sz-unica on" data-size="U" aria-pressed="true"
              onclick="pickSize(this)" title="Talla única disponible">Talla única</button>`
    : SIZES_BASE.map(s => {
        const has = stockOf(p, s) > 0;
        return `<button type="button" class="sz${preset === s ? " on" : ""}" data-size="${s}"
                  ${has ? `onclick="pickSize(this)"` : "disabled"}
                  aria-pressed="${preset === s}"
                  title="${has ? `${SIZE_LABELS[s]} disponible` : `${SIZE_LABELS[s]} agotada`}">${s}</button>`;
      }).join("");

  const lowStock = stock > 0 && stock <= 3;

  return `
  <article class="pcard${stock ? "" : " pcard-out"}${primerRender ? " pcard-in" : ""}"
           data-id="${esc(p.id)}"
           style="--swatch:${swatch};--i:${Math.min(index, 11)}">
    <div class="pcard-visual">
      ${visual}
      ${badges ? `<div class="pcard-badges">${badges}</div>` : ""}
      ${stock ? "" : `<div class="pcard-out-veil"><span>Agotado</span></div>`}
      <button type="button" class="pcard-quick" onclick="openQuick('${id}')"
              aria-label="Ver detalles de ${esc(p.name)}">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
          <circle cx="9" cy="9" r="6"/><line x1="18" y1="18" x2="13.5" y2="13.5"/>
        </svg>
        Vista rápida
      </button>
      <span class="pcard-color-dot" style="background:${swatch}" title="Color ${esc(p.color || "")}"></span>
    </div>

    <div class="pcard-body">
      <h3 class="pcard-name">
        <button type="button" class="pcard-name-btn" onclick="openQuick('${id}')">${esc(p.name)}</button>
      </h3>

      <div class="pcard-price">
        ${isOffer
          ? `<strong class="price-sale">${money(p.offerPrice)}</strong>
             <s class="price-old">${money(p.price)}</s>`
          : `<strong class="price-reg">${money(p.price)}</strong>`}
      </div>

      ${lowStock ? `<p class="pcard-low">${stock === 1 ? "¡Última unidad!" : `¡Sólo quedan ${stock}!`}</p>` : ""}

      <div class="pcard-sizes" role="group" aria-label="Elegir talla de ${esc(p.name)}">
        ${sizesHtml}
      </div>

      <button type="button" class="btn-add" onclick="handleAdd('${id}')" ${stock ? "" : "disabled"}>
        ${stock ? "Agregar al carrito" : "Agotado"}
      </button>
    </div>
  </article>`;
}

// ── Interacciones de tarjeta ──────────────────────
function pickSize(btn) {
  btn.closest(".pcard, .quick-box").querySelectorAll(".sz").forEach(b => {
    b.classList.remove("on");
    b.setAttribute("aria-pressed", "false");
  });
  btn.classList.add("on");
  btn.setAttribute("aria-pressed", "true");
}

function handleAdd(productId) {
  const card = document.querySelector(`.pcard[data-id="${CSS.escape(productId)}"]`);
  const size = card?.querySelector(".sz.on")?.dataset.size;

  if (!size) {
    card?.querySelectorAll(".sz:not([disabled])").forEach(b => {
      b.classList.add("shake");
      setTimeout(() => b.classList.remove("shake"), 500);
    });
    showToast("Elige una talla primero 👆", "err");
    return;
  }

  const product = productById(productId);
  if (!product) return;

  const limited = addToCart(product, size);
  showToast(limited
    ? `Agregamos lo último que queda de la talla ${size}`
    : `${product.name} (${size}) agregado 🌸`);
}

// ── Vista rápida ──────────────────────────────────
function openQuick(productId) {
  const p = productById(productId);
  if (!p) return;

  quickId    = productId;
  galleryIdx = 0;

  document.getElementById("quick-content").innerHTML = buildQuick(p);

  const modal = document.getElementById("quick-modal");
  modal.classList.add("open");
  modal.inert = false;
  modal.setAttribute("aria-hidden", "false");
  lockScroll();
  trapFocus(modal);
}

function closeQuick() {
  const modal = document.getElementById("quick-modal");
  if (!modal?.classList.contains("open")) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  unlockScroll();
  releaseFocus(modal);
  modal.inert = true;
  quickId = null;
}

function buildQuick(p) {
  const id      = escJs(p.id);
  const imgs    = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  const isOffer = !!(p.isOffer && p.offerPrice);
  const stock   = totalStock(p);
  const swatch  = swatchOf(p);

  const discount = isOffer && p.price > 0
    ? Math.round((1 - p.offerPrice / p.price) * 100)
    : 0;

  const main = imgs.length
    ? `<img src="${esc(imgs[0])}" alt="" id="quick-main-blur" class="quick-blur" aria-hidden="true">
       <img src="${esc(imgs[0])}" alt="${esc(p.name)}" id="quick-main-img">`
    : `<div class="quick-noimg">
         <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true">
           <path d="M14 6h20v10l6 6v22H8V22l6-6V6z"/><path d="M18 6v10a6 6 0 0012 0V6"/>
         </svg>
       </div>`;

  const thumbs = imgs.length > 1
    ? `<div class="quick-thumbs" role="group" aria-label="Fotos del pijama">
         ${imgs.map((src, i) => `
           <button type="button" class="quick-thumb${i === 0 ? " on" : ""}"
                   onclick="setGallery(${i})" aria-label="Ver foto ${i + 1}">
             <img src="${esc(src)}" alt="" loading="lazy">
           </button>`).join("")}
       </div>`
    : "";

  // Conserva la talla que el usuario ya venía filtrando en el catálogo.
  const preset = state.size !== "todas" && stockOf(p, state.size) > 0 ? state.size : null;

  const sizeRows = esUnica(p)
    ? (() => { const q = stockOf(p, "U");
        return `<button type="button" class="sz sz-lg sz-unica on" data-size="U" aria-pressed="true"
                  onclick="pickSize(this)" title="${q} disponible${q === 1 ? "" : "s"}">
                  Talla única${q <= 3 ? `<span class="sz-left">${q}</span>` : ""}
                </button>`; })()
    : SIZES_BASE.map(s => {
        const q  = stockOf(p, s);
        const on = preset === s;
        return `<button type="button" class="sz sz-lg${on ? " on" : ""}" data-size="${s}"
                  ${q ? `onclick="pickSize(this)"` : "disabled"}
                  aria-pressed="${on}"
                  title="${q ? `${q} disponible${q === 1 ? "" : "s"} en talla ${s}` : `Talla ${s} agotada`}">
                  ${s}${q && q <= 3 ? `<span class="sz-left">${q}</span>` : ""}
                </button>`;
      }).join("");

  return `
    <div class="quick-gallery" style="--swatch:${swatch}">
      <div class="quick-main">${main}</div>
      ${thumbs}
    </div>

    <div class="quick-info">
      <div class="quick-badges">
        ${p.isNew      ? `<span class="badge b-new">Nuevo</span>` : ""}
        ${discount > 0 ? `<span class="badge b-offer">−${discount}%</span>` : ""}
        ${p.isFeatured ? `<span class="badge b-feat">✦ Destacado</span>` : ""}
      </div>

      <h2 id="quick-title" class="quick-name">${esc(p.name)}</h2>

      <div class="quick-price">
        ${isOffer
          ? `<strong class="price-sale">${money(p.offerPrice)}</strong><s class="price-old">${money(p.price)}</s>`
          : `<strong class="price-reg">${money(p.price)}</strong>`}
      </div>

      ${p.description ? `<p class="quick-desc">${esc(p.description)}</p>` : ""}

      <div class="quick-block">
        <p class="quick-label">Talla ${stock ? "" : "· agotado"}</p>
        <div class="quick-sizes" role="group" aria-label="Elegir talla">${sizeRows}</div>
        <button type="button" class="quick-guide-link" onclick="openSizeGuide()">¿Cuál es mi talla?</button>
      </div>

      <div class="quick-actions">
        <div class="qty-row qty-lg">
          <button type="button" onclick="quickQty(-1)" aria-label="Menos cantidad">&minus;</button>
          <span id="quick-qty" aria-live="polite">1</span>
          <button type="button" onclick="quickQty(1)" aria-label="Más cantidad">+</button>
        </div>
        <button type="button" class="btn-add btn-add-lg" onclick="quickAdd('${id}')" ${stock ? "" : "disabled"}>
          ${stock ? "Agregar al carrito" : "Agotado"}
        </button>
      </div>

      <p class="quick-note">Pedidos por WhatsApp · Envíos a Medellín y Bello</p>
    </div>`;
}

function setGallery(i) {
  const p = productById(quickId);
  const imgs = (p?.images || []).filter(Boolean);
  if (!imgs[i]) return;
  galleryIdx = i;
  const main = document.getElementById("quick-main-img");
  const blur = document.getElementById("quick-main-blur");
  if (main) main.src = imgs[i];
  if (blur) blur.src = imgs[i];
  document.querySelectorAll(".quick-thumb").forEach((t, idx) => {
    t.classList.toggle("on", idx === i);
    t.setAttribute("aria-current", idx === i);
  });
}

function quickQty(delta) {
  const el = document.getElementById("quick-qty");
  if (!el) return;
  const next = Math.max(1, (parseInt(el.textContent, 10) || 1) + delta);
  el.textContent = next;
}

function quickAdd(productId) {
  const box  = document.querySelector(".quick-box");
  const size = box?.querySelector(".sz.on")?.dataset.size;

  if (!size) {
    box?.querySelectorAll(".sz:not([disabled])").forEach(b => {
      b.classList.add("shake");
      setTimeout(() => b.classList.remove("shake"), 500);
    });
    showToast("Elige una talla primero 👆", "err");
    return;
  }

  const qty     = parseInt(document.getElementById("quick-qty")?.textContent, 10) || 1;
  const product = productById(productId);
  if (!product) return;

  closeQuick();
  const limited = addToCart(product, size, qty);
  showToast(limited
    ? `Agregamos lo último que queda de la talla ${size}`
    : `${product.name} (${size}) agregado 🌸`);
}

// ── Guía de tallas ────────────────────────────────
function openSizeGuide() {
  const modal = document.getElementById("guide-modal");
  modal.classList.add("open");
  modal.inert = false;
  modal.setAttribute("aria-hidden", "false");
  lockScroll();
  trapFocus(modal);
}

function closeSizeGuide() {
  const modal = document.getElementById("guide-modal");
  if (!modal?.classList.contains("open")) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  unlockScroll();
  releaseFocus(modal);
  modal.inert = true;
}

// ── Filtros ───────────────────────────────────────
function setSizeFilter(size) {
  state.size = size;
  document.querySelectorAll(".filter-btn").forEach(b => {
    const on = b.dataset.f === size;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on);
  });
  render();
}

function setSorter(value) {
  state.sort = value;
  render();
}

function setSearch(value) {
  state.q = value.trim();
  document.getElementById("search-clear")?.classList.toggle("show", !!state.q);
  render();
}

function resetFilters() {
  state = { size: "todas", q: "", sort: "nuevo" };
  const input = document.getElementById("cat-search");
  if (input) input.value = "";
  document.getElementById("search-clear")?.classList.remove("show");
  const sel = document.getElementById("sorter-sel");
  if (sel) sel.value = "nuevo";
  setSizeFilter("todas");
}

function clearSearch() {
  const input = document.getElementById("cat-search");
  if (input) { input.value = ""; input.focus(); }
  setSearch("");
}

/** Muestra cuántos pijamas hay realmente disponibles por talla. */
function renderFilterCounts() {
  const setCount = (key, n) => {
    const el = document.querySelector(`.filter-btn[data-f="${key}"] .f-count`);
    if (el) el.textContent = n;
    const btn = document.querySelector(`.filter-btn[data-f="${key}"]`);
    if (btn && key !== "todas") btn.disabled = n === 0;
  };

  setCount("todas", allProducts.length);
  SIZES.forEach(s =>
    setCount(s, allProducts.filter(p => stockOf(p, s) > 0).length)
  );
}

/** Chips que resumen los filtros activos, cada uno se puede quitar. */
function buildActiveChips() {
  const chips = [];
  if (state.size !== "todas") {
    chips.push(`<button type="button" class="achip" onclick="setSizeFilter('todas')">
      ${state.size === "U" ? "Talla única" : "Talla " + esc(state.size)} <span aria-hidden="true">×</span>
      <span class="sr-only">Quitar filtro de talla</span></button>`);
  }
  if (state.q) {
    chips.push(`<button type="button" class="achip" onclick="clearSearch()">
      “${esc(state.q)}” <span aria-hidden="true">×</span>
      <span class="sr-only">Quitar búsqueda</span></button>`);
  }
  if (chips.length > 1) {
    chips.push(`<button type="button" class="achip achip-clear" onclick="resetFilters()">Limpiar todo</button>`);
  }
  return chips.join("");
}

// ── Estado en la URL (para compartir/volver) ──────
function syncUrl() {
  const params = new URLSearchParams();
  if (state.size !== "todas") params.set("talla", state.size);
  if (state.q)               params.set("q", state.q);
  if (state.sort !== "nuevo") params.set("orden", state.sort);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  let talla = (params.get("talla") || "").toUpperCase();
  if (talla === "UNICA" || talla === "ÚNICA") talla = "U";
  if (SIZES.includes(talla)) state.size = talla;
  state.q = params.get("q") || "";
  const orden = params.get("orden");
  if (["precio-asc", "precio-desc", "nombre"].includes(orden)) state.sort = orden;

  const input = document.getElementById("cat-search");
  if (input && state.q) {
    input.value = state.q;
    document.getElementById("search-clear")?.classList.add("show");
  }
  const sel = document.getElementById("sorter-sel");
  if (sel) sel.value = state.sort;

  document.querySelectorAll(".filter-btn").forEach(b => {
    const on = b.dataset.f === state.size;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on);
  });
}

// ── Skeleton ──────────────────────────────────────
function showSkeleton() {
  document.getElementById("products-grid").innerHTML = Array(8).fill(
    `<div class="pcard skeleton" aria-hidden="true">
       <div class="pcard-visual sk-vis"></div>
       <div class="pcard-body">
         <div class="sk-line w70"></div>
         <div class="sk-line w40"></div>
         <div class="sk-line w90"></div>
       </div>
     </div>`
  ).join("");
  document.getElementById("results-count").textContent = "Cargando…";
}

// ── Init ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  readUrl();
  loadProducts();

  document.getElementById("cat-search")
    ?.addEventListener("input", debounce(e => setSearch(e.target.value), 200));

  // Cerrar modales con clic fuera o Escape.
  document.getElementById("quick-modal")?.addEventListener("click", e => {
    if (e.target.id === "quick-modal") closeQuick();
  });
  document.getElementById("guide-modal")?.addEventListener("click", e => {
    if (e.target.id === "guide-modal") closeSizeGuide();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeSizeGuide();
      closeQuick();
    }
    // Flechas para navegar la galería de la vista rápida.
    if (!quickId) return;
    const imgs = (productById(quickId)?.images || []).filter(Boolean);
    if (imgs.length < 2) return;
    if (e.key === "ArrowRight") setGallery((galleryIdx + 1) % imgs.length);
    if (e.key === "ArrowLeft")  setGallery((galleryIdx - 1 + imgs.length) % imgs.length);
  });
});
