// =====================================================
// CART — Ladys Comfort
// =====================================================

// wa.me exige el indicativo de país (57 = Colombia) para abrir el chat
// correctamente desde cualquier teléfono.
const WA_NUMBER = "573015384813";
const CART_KEY  = "lc_cart";

let cart = loadCart();

// ── Persistencia ──────────────────────────────────
function loadCart() {
  try {
    const raw = JSON.parse(storageGet(CART_KEY, "[]"));
    if (!Array.isArray(raw)) return [];
    // Normaliza carritos guardados por versiones anteriores.
    return raw
      .filter(i => i && i.id && i.size)
      .map(i => ({
        id:    String(i.id),
        name:  String(i.name || "Pijama"),
        size:  String(i.size),
        price: Number(i.price) || 0,
        qty:   Math.max(1, parseInt(i.qty, 10) || 1),
        image: i.image || null,
        max:   Number.isFinite(Number(i.max)) && Number(i.max) > 0 ? Number(i.max) : null
      }));
  } catch {
    return [];
  }
}

function saveCart() {
  storageSet(CART_KEY, JSON.stringify(cart));
  renderAllCartBadges();
  renderCartPanel();
}

// ── Acciones ──────────────────────────────────────
function addToCart(product, size, qty = 1) {
  // Puede venir undefined (producto viejo sin tallas): ahí no limitamos.
  const raw      = product.sizes?.[size];
  const stock    = raw === undefined || raw === null ? null : Number(raw) || 0;
  const price    = product.isOffer && product.offerPrice ? product.offerPrice : product.price;
  const existing = cart.find(i => i.id === product.id && i.size === size);
  const wanted   = (existing?.qty || 0) + qty;
  const capped   = stock === null ? wanted : Math.max(1, Math.min(wanted, stock));

  if (existing) {
    existing.qty   = capped;
    existing.price = price;              // refresca si cambió el precio en el admin
    existing.max   = stock;
    existing.image = product.images?.[0] || existing.image || null;
  } else {
    cart.push({
      id:    product.id,
      name:  product.name,
      size,
      price,
      qty:   capped,
      image: product.images?.[0] || null,
      max:   stock
    });
  }

  saveCart();
  openCartPanel();
  flashFloat();
  return capped < wanted;                // true si el stock limitó la cantidad
}

function removeFromCart(id, size) {
  cart = cart.filter(i => !(i.id === id && i.size === size));
  saveCart();
}

function changeQty(id, size, delta) {
  const item = cart.find(i => i.id === id && i.size === size);
  if (!item) return;

  const next = item.qty + delta;
  if (next < 1) { removeFromCart(id, size); return; }

  if (item.max && next > item.max) {
    showToast(`Sólo quedan ${item.max} en talla ${item.size}`, "err");
    return;
  }

  item.qty = next;
  saveCart();
}

function clearCart() {
  if (!cart.length) return;
  cart = [];
  saveCart();
  showToast("Carrito vaciado");
}

function cartTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

// ── Panel ─────────────────────────────────────────
function openCartPanel() {
  const panel = document.getElementById("cart-panel");
  if (!panel || panel.classList.contains("open")) return;
  panel.classList.add("open");
  panel.inert = false;
  panel.setAttribute("aria-hidden", "false");
  document.getElementById("cart-overlay")?.classList.add("active");
  lockScroll();
  trapFocus(panel);
}

function closeCartPanel() {
  const panel = document.getElementById("cart-panel");
  if (!panel || !panel.classList.contains("open")) return;
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
  document.getElementById("cart-overlay")?.classList.remove("active");
  unlockScroll();
  releaseFocus(panel);
  panel.inert = true;              // después de devolver el foco
}

// ── Render ────────────────────────────────────────
function renderAllCartBadges() {
  const n = cartCount();
  document.querySelectorAll(".cart-badge").forEach(el => {
    el.textContent = n > 99 ? "99+" : n;
    el.style.display = n ? "flex" : "none";
  });
  document.querySelectorAll(".cart-btn, #cart-float").forEach(btn => {
    btn.setAttribute(
      "aria-label",
      n ? `Abrir carrito, ${n} ${n === 1 ? "artículo" : "artículos"}` : "Abrir carrito, vacío"
    );
  });
}

function cartItemThumb(item) {
  if (item.image) {
    return `<img src="${esc(item.image)}" alt="" class="ci-thumb-img" loading="lazy">`;
  }
  return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
            <path d="M8 4h16v6l4 4v14H4V14l4-4V4z"/>
            <path d="M12 4v6a4 4 0 008 0V4"/>
          </svg>`;
}

function renderCartPanel() {
  const body  = document.getElementById("cart-body");
  const foot  = document.getElementById("cart-foot");
  const totEl = document.getElementById("cart-total");
  const cntEl = document.getElementById("cart-count-label");
  if (!body) return;

  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty">
      <div class="cart-empty-icon">
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
          <path d="M12 4H8l-4 8v28a2 2 0 002 2h32a2 2 0 002-2V12l-4-8h-4"/>
          <line x1="4" y1="12" x2="44" y2="12"/>
          <path d="M32 20a8 8 0 01-16 0"/>
        </svg>
      </div>
      <p>Tu carrito está vacío</p>
      <span>Agrega tus pijamas favoritos</span>
      <a href="catalogo.html" class="cart-empty-cta">Ver catálogo</a>
    </div>`;
    if (foot) foot.style.display = "none";
    if (cntEl) cntEl.textContent = "";
    return;
  }

  body.innerHTML = cart.map(item => {
    const id   = escJs(item.id);
    const size = escJs(item.size);
    const atMax = item.max && item.qty >= item.max;

    return `
    <div class="cart-item">
      <div class="cart-item-swatch">${cartItemThumb(item)}</div>
      <div class="cart-item-info">
        <p class="ci-name">${esc(item.name)}</p>
        <p class="ci-size">Talla ${esc(item.size)}</p>
        <p class="ci-price">${money(item.price * item.qty)}</p>
        ${atMax ? `<p class="ci-stock">Último disponible en esta talla</p>` : ""}
      </div>
      <div class="cart-item-ctrl">
        <div class="qty-row">
          <button type="button" onclick="changeQty('${id}','${size}',-1)"
                  aria-label="Quitar una unidad de ${esc(item.name)} talla ${esc(item.size)}">&minus;</button>
          <span aria-live="polite">${item.qty}</span>
          <button type="button" onclick="changeQty('${id}','${size}',1)" ${atMax ? "disabled" : ""}
                  aria-label="Agregar una unidad de ${esc(item.name)} talla ${esc(item.size)}">+</button>
        </div>
        <button type="button" class="ci-remove" onclick="removeFromCart('${id}','${size}')"
                aria-label="Eliminar ${esc(item.name)} talla ${esc(item.size)} del carrito">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M15 5L5 15M5 5l10 10"/>
          </svg>
        </button>
      </div>
    </div>`;
  }).join("");

  const n = cartCount();
  if (cntEl) cntEl.textContent = `${n} ${n === 1 ? "artículo" : "artículos"}`;
  if (foot)  foot.style.display = "flex";
  if (totEl) totEl.textContent = money(cartTotal());
}

// ── WhatsApp ──────────────────────────────────────
function sendWhatsApp() {
  if (!cart.length) return;
  const lines = cart.map(i =>
    `• *${i.name}* — Talla ${i.size} ×${i.qty}  →  ${money(i.price * i.qty)}`
  ).join("\n");
  const msg =
    `Hola Ladys Comfort 🌸\n\nQuiero hacer este pedido:\n\n${lines}\n\n` +
    `*Total: ${money(cartTotal())}*\n\n¿Está disponible? 😊`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
}

// ── Toast ─────────────────────────────────────────
function showToast(msg, type = "ok") {
  document.querySelectorAll(".lc-toast").forEach(t => t.remove());
  const t = document.createElement("div");
  t.className = "lc-toast " + type;
  t.setAttribute("role", "status");
  t.setAttribute("aria-live", "polite");
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("in"));
  setTimeout(() => {
    t.classList.remove("in");
    setTimeout(() => t.remove(), 350);
  }, 3000);
}

// ── Float button pulse ────────────────────────────
function flashFloat() {
  const btn = document.getElementById("cart-float");
  btn?.classList.add("pulse");
  setTimeout(() => btn?.classList.remove("pulse"), 700);
}

// ── Init ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderAllCartBadges();
  renderCartPanel();

  document.getElementById("cart-overlay")?.addEventListener("click", closeCartPanel);

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (document.getElementById("cart-panel")?.classList.contains("open")) closeCartPanel();
  });

  // Mantiene el carrito sincronizado entre pestañas abiertas.
  window.addEventListener("storage", e => {
    if (e.key !== CART_KEY) return;
    cart = loadCart();
    renderAllCartBadges();
    renderCartPanel();
  });
});
