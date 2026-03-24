// =====================================================
// CART — Ladys Comfort
// =====================================================

const WA_NUMBER = "3015384813";
let cart = JSON.parse(localStorage.getItem("lc_cart") || "[]");

// ── Persistencia ──────────────────────────────────
function saveCart() {
  localStorage.setItem("lc_cart", JSON.stringify(cart));
  renderAllCartBadges();
  renderCartPanel();
}

// ── Acciones ──────────────────────────────────────
function addToCart(product, size) {
  const existing = cart.find(i => i.id === product.id && i.size === size);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      id:    product.id,
      name:  product.name,
      size,
      price: product.isOffer && product.offerPrice ? product.offerPrice : product.price,
      qty:   1
    });
  }
  saveCart();
  openCartPanel();
  flashFloat();
}

function removeFromCart(id, size) {
  cart = cart.filter(i => !(i.id === id && i.size === size));
  saveCart();
}

function changeQty(id, size, delta) {
  const item = cart.find(i => i.id === id && i.size === size);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
}

function cartTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

// ── Panel ─────────────────────────────────────────
function openCartPanel() {
  document.getElementById("cart-panel")?.classList.add("open");
  document.getElementById("cart-overlay")?.classList.add("active");
  document.body.style.overflow = "hidden";
}
function closeCartPanel() {
  document.getElementById("cart-panel")?.classList.remove("open");
  document.getElementById("cart-overlay")?.classList.remove("active");
  document.body.style.overflow = "";
}

// ── Render ────────────────────────────────────────
function renderAllCartBadges() {
  const n = cartCount();
  document.querySelectorAll(".cart-badge").forEach(el => {
    el.textContent = n;
    el.style.display = n ? "flex" : "none";
  });
}

function renderCartPanel() {
  const body   = document.getElementById("cart-body");
  const foot   = document.getElementById("cart-foot");
  const totEl  = document.getElementById("cart-total");
  if (!body) return;

  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty">
      <div class="cart-empty-icon">
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M12 4H8l-4 8v28a2 2 0 002 2h32a2 2 0 002-2V12l-4-8h-4"/>
          <line x1="4" y1="12" x2="44" y2="12"/>
          <path d="M32 20a8 8 0 01-16 0"/>
        </svg>
      </div>
      <p>Carrito vacío</p>
      <span>Agrega tus pijamas favoritos</span>
    </div>`;
    if (foot) foot.style.display = "none";
    return;
  }

  body.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-swatch" style="background:var(--neon-faint)">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M8 4h16v6l4 4v14H4V14l4-4V4z"/>
          <path d="M12 4v6a4 4 0 008 0V4"/>
        </svg>
      </div>
      <div class="cart-item-info">
        <p class="ci-name">${item.name}</p>
        <p class="ci-size">Talla ${item.size}</p>
        <p class="ci-price">$${item.price.toLocaleString("es-CO")}</p>
      </div>
      <div class="cart-item-ctrl">
        <div class="qty-row">
          <button onclick="changeQty('${item.id}','${item.size}',-1)">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty('${item.id}','${item.size}',1)">+</button>
        </div>
        <button class="ci-remove" onclick="removeFromCart('${item.id}','${item.size}')">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 5L5 15M5 5l10 10"/>
          </svg>
        </button>
      </div>
    </div>`).join("");

  if (foot) foot.style.display = "flex";
  if (totEl) totEl.textContent = "$" + cartTotal().toLocaleString("es-CO");
}

// ── WhatsApp ──────────────────────────────────────
function sendWhatsApp() {
  if (!cart.length) return;
  const lines = cart.map(i =>
    `• *${i.name}* — Talla ${i.size} ×${i.qty}  →  $${(i.price * i.qty).toLocaleString("es-CO")}`
  ).join("\n");
  const msg = `Hola Ladys Comfort 🌸\n\nQuiero hacer este pedido:\n\n${lines}\n\n*Total: $${cartTotal().toLocaleString("es-CO")}*\n\n¿Está disponible? 😊`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
}

// ── Toast ─────────────────────────────────────────
function showToast(msg, type = "ok") {
  document.querySelectorAll(".lc-toast").forEach(t => t.remove());
  const t = document.createElement("div");
  t.className = "lc-toast " + type;
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
});
