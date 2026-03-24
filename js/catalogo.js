// =====================================================
// CATALOGO — Ladys Comfort
// =====================================================

let allProducts  = [];
let activeFilter = "todos";
let activeSorter = "nuevo";

// ── Carga ─────────────────────────────────────────
async function loadProducts() {
  showSkeleton();
  try {
    const snap = await db.collection("products").orderBy("createdAt", "desc").get();
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  } catch (e) {
    document.getElementById("products-grid").innerHTML =
      `<div class="grid-msg">Error al cargar. Verifica tu conexión.</div>`;
  }
}

// ── Render ────────────────────────────────────────
function render() {
  let list = [...allProducts];

  if (activeFilter !== "todos") {
    list = list.filter(p => p.color?.toLowerCase() === activeFilter);
  }

  if (activeSorter === "precio-asc")  list.sort((a, b) => (a.isOffer ? a.offerPrice : a.price) - (b.isOffer ? b.offerPrice : b.price));
  if (activeSorter === "precio-desc") list.sort((a, b) => (b.isOffer ? b.offerPrice : b.price) - (a.isOffer ? a.offerPrice : a.price));
  if (activeSorter === "nombre")      list.sort((a, b) => a.name.localeCompare(b.name));

  const grid = document.getElementById("products-grid");

  document.getElementById("results-count").textContent =
    list.length + " resultado" + (list.length !== 1 ? "s" : "");

  if (!list.length) {
    grid.innerHTML = `<div class="grid-msg">No hay pijamas en esta categoría aún.</div>`;
    return;
  }

  grid.innerHTML = list.map(buildCard).join("");
}

// ── Tarjeta ───────────────────────────────────────
function buildCard(p) {
  const price   = p.isOffer && p.offerPrice ? p.offerPrice : p.price;
  const isOffer = p.isOffer && p.offerPrice;
  const sizes   = p.sizes
    ? Object.entries(p.sizes).filter(([, s]) => s > 0).map(([s]) => s)
    : [];

  const colorMap = {
    rosa: "#ff3f96", azul: "#4da6ff", amarillo: "#ffe040",
    verde: "#3ddc84", turquesa: "#00d4c8", otro: "#aaa"
  };
  const swatch = colorMap[p.color?.toLowerCase()] || "#888";

  const badges = [
    p.isNew     ? `<span class="badge b-new">Nuevo</span>`         : "",
    isOffer     ? `<span class="badge b-offer">Oferta</span>`      : "",
    p.isFeatured? `<span class="badge b-feat">✦ Destacado</span>`  : ""
  ].join("");

  const sizesHtml = sizes.length
    ? sizes.map(s => `<button class="sz" data-size="${s}" onclick="pickSize(this,'${p.id}')">${s}</button>`).join("")
    : `<span class="no-stock">Agotado</span>`;

  const img = p.images && p.images[0] ? p.images[0] : null;

  return `
  <article class="pcard" data-id="${p.id}">
    <div class="pcard-visual" style="--swatch:${swatch}">
      ${img
        ? `<img src="${img}" alt="${p.name}" class="pcard-img" loading="lazy">`
        : `<div class="pcard-pattern"></div>
      <div class="pcard-icon">
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M14 6h20v10l6 6v22H8V22l6-6V6z"/>
          <path d="M18 6v10a6 6 0 0012 0V6"/>
          <circle cx="24" cy="34" r="4" stroke-dasharray="3 2"/>
        </svg>
      </div>`}
      ${badges ? `<div class="pcard-badges">${badges}</div>` : ""}
      <div class="pcard-color-dot" style="background:${swatch}"></div>
    </div>
    <div class="pcard-body">
      <h3 class="pcard-name">${p.name}</h3>
      <div class="pcard-price">
        ${isOffer
          ? `<s class="price-old">$${p.price.toLocaleString("es-CO")}</s>
             <strong class="price-sale">$${p.offerPrice.toLocaleString("es-CO")}</strong>`
          : `<strong class="price-reg">$${p.price.toLocaleString("es-CO")}</strong>`}
      </div>
      <div class="pcard-sizes">${sizesHtml}</div>
      <button class="btn-add" onclick="handleAdd('${p.id}')" ${!sizes.length ? "disabled" : ""}>
        ${sizes.length ? "Agregar al carrito" : "Agotado"}
      </button>
    </div>
  </article>`;
}

// ── Interacciones ─────────────────────────────────
function pickSize(btn, productId) {
  btn.closest(".pcard").querySelectorAll(".sz").forEach(b => b.classList.remove("on"));
  btn.classList.add("on");
}

function handleAdd(productId) {
  const card = document.querySelector(`.pcard[data-id="${productId}"]`);
  const size = card?.querySelector(".sz.on")?.dataset.size;
  if (!size) {
    card?.querySelectorAll(".sz").forEach(b => { b.classList.add("shake"); setTimeout(() => b.classList.remove("shake"), 500); });
    showToast("Elige una talla primero 👆");
    return;
  }
  const product = allProducts.find(p => p.id === productId);
  if (product) { addToCart(product, size); showToast(`${product.name} (${size}) agregado 🌸`); }
}

// ── Filtros ───────────────────────────────────────
function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("on", b.dataset.f === f));
  render();
}

function setSorter(s) {
  activeSorter = s;
  render();
}

// ── Skeleton ──────────────────────────────────────
function showSkeleton() {
  document.getElementById("products-grid").innerHTML =
    Array(6).fill(`<div class="pcard skeleton"><div class="pcard-visual sk-vis"></div><div class="pcard-body"><div class="sk-line w70"></div><div class="sk-line w40"></div><div class="sk-line w90"></div></div></div>`).join("");
}

// ── Navbar scroll ─────────────────────────────────
window.addEventListener("scroll", () =>
  document.getElementById("navbar")?.classList.toggle("scrolled", scrollY > 50)
);

// ── Init ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();

  const toggle = document.getElementById("menu-toggle");
  toggle?.addEventListener("click", () =>
    document.getElementById("navbar").classList.toggle("nav-open")
  );
  document.querySelectorAll(".nav-link").forEach(a =>
    a.addEventListener("click", () =>
      document.getElementById("navbar").classList.remove("nav-open")
    )
  );
});
