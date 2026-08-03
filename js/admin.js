// =====================================================
// ADMIN — Ladys Comfort
// =====================================================

const ADMIN_SIZES = ["S", "M", "L", "XL"];
const MAX_IMAGES  = 3;

let adminProducts  = [];
let editingId      = null;
let newFiles       = [];      // File objects pendientes de subir
let existingUrls   = [];      // URLs ya guardadas en Firestore

// ── Auth ──────────────────────────────────────────
function initAdmin() {
  auth.onAuthStateChanged(user => {
    const boot = document.getElementById("boot-view");
    if (boot) boot.style.display = "none";
    document.getElementById("login-view").style.display = user ? "none" : "flex";
    document.getElementById("dash-view").style.display  = user ? "flex" : "none";
    if (user) fetchProducts();
    else document.getElementById("inp-email")?.focus();
  });
}

async function doLogin() {
  const email = document.getElementById("inp-email").value.trim();
  const pass  = document.getElementById("inp-pass").value;
  const err   = document.getElementById("login-err");
  const btn   = document.getElementById("login-btn");
  err.textContent = "";

  if (!email || !pass) {
    err.textContent = "Escribe tu correo y contraseña.";
    return;
  }

  setLoading(btn, true, "login-loader");
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    err.textContent = e?.code === "auth/too-many-requests"
      ? "Demasiados intentos. Espera un momento e inténtalo de nuevo."
      : e?.code === "auth/network-request-failed"
        ? "Sin conexión. Revisa tu internet."
        : "Correo o contraseña incorrectos.";
  }
  setLoading(btn, false, "login-loader");
}

function doLogout() { auth.signOut(); }

// ── Productos ─────────────────────────────────────
async function fetchProducts() {
  const list = document.getElementById("admin-list");
  list.innerHTML = `<div class="a-loading"><div class="spinner"></div><p>Cargando...</p></div>`;
  try {
    const snap = await db.collection("products").orderBy("createdAt", "desc").get();
    adminProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAdminList(adminProducts);
    const c = adminProducts.length;
    document.getElementById("dash-count").textContent = c + " producto" + (c !== 1 ? "s" : "");
  } catch (e) {
    list.innerHTML = `<div class="a-msg error">Error: ${e.message}</div>`;
  }
}

function renderAdminList(list) {
  const el = document.getElementById("admin-list");
  if (!list.length) {
    el.innerHTML = `<div class="a-msg">No hay productos. ¡Agrega el primero!</div>`;
    return;
  }
  el.innerHTML = list.map(buildRow).join("");
}

function buildRow(p) {
  const id = escJs(p.id);

  const price = p.isOffer && p.offerPrice
    ? `<s>${money(p.price)}</s> <strong>${money(p.offerPrice)}</strong>`
    : `<strong>${money(p.price)}</strong>`;

  // El catálogo filtra por talla, así que el stock por talla va al frente.
  const total = ADMIN_SIZES.reduce((sum, s) => sum + (Number(p.sizes?.[s]) || 0), 0);
  const sizePills = ADMIN_SIZES.map(s => {
    const q = Number(p.sizes?.[s]) || 0;
    return `<span class="a-size-pill${q ? "" : " empty"}" title="Talla ${s}: ${q} en stock">
              ${s}<b>${q}</b></span>`;
  }).join("");

  const badges = [
    total === 0 ? `<span class="atag tag-out">Agotado</span>`     : "",
    p.isNew     ? `<span class="atag tag-new">Nuevo</span>`       : "",
    p.isOffer   ? `<span class="atag tag-off">Oferta</span>`      : "",
    p.isFeatured? `<span class="atag tag-feat">Destacado</span>`  : ""
  ].join("");

  const colorDot = {
    rosa:"#ff3f96", azul:"#4da6ff", amarillo:"#ffe040",
    verde:"#3ddc84", turquesa:"#00d4c8", otro:"#aaa"
  }[p.color?.toLowerCase()] || "#aaa";

  const thumb = p.images && p.images[0]
    ? `<img src="${esc(p.images[0])}" class="a-row-thumb" alt="Foto de ${esc(p.name)}" loading="lazy">`
    : `<div class="a-row-thumb no-img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>`;

  return `
  <div class="a-row${total === 0 ? " a-row-out" : ""}" data-id="${esc(p.id)}">
    ${thumb}
    <div class="a-row-color" style="background:${colorDot}" title="Color ${esc(p.color || "")}"></div>
    <div class="a-row-info">
      <div class="a-row-top">
        <h3>${esc(p.name)}</h3>
        <div class="a-row-badges">${badges}</div>
      </div>
      <div class="a-row-meta">
        <span class="meta-price">${price}</span>
        <span class="meta-sep">·</span>
        <span class="a-size-pills">${sizePills}</span>
      </div>
    </div>
    <div class="a-row-actions">
      <button class="btn-edit-row" type="button" onclick="openEdit('${id}')">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14.7 3.3a1 1 0 011.4 1.4L6 14.8l-3.5.9.9-3.5L14.7 3.3z"/></svg>
        Editar
      </button>
      <button class="btn-del-row" type="button" onclick="askDelete('${id}')">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12"/></svg>
        Eliminar
      </button>
    </div>
  </div>`;
}

// ── Búsqueda ──────────────────────────────────────
function searchAdmin() {
  const q = document.getElementById("admin-search").value.toLowerCase();
  renderAdminList(q ? adminProducts.filter(p => p.name.toLowerCase().includes(q)) : adminProducts);
}

// ── Modal ─────────────────────────────────────────
function openAdd() {
  editingId = null; newFiles = []; existingUrls = [];
  clearForm();
  document.getElementById("modal-title").textContent = "Agregar pijama";
  showModal();
}

async function openEdit(id) {
  editingId = id; newFiles = [];
  clearForm();
  document.getElementById("modal-title").textContent = "Editar pijama";
  const p = adminProducts.find(x => x.id === id);
  if (!p) return;
  existingUrls = [...(p.images || [])];
  document.getElementById("f-name").value        = p.name        || "";
  document.getElementById("f-color").value       = p.color       || "";
  document.getElementById("f-desc").value        = p.description || "";
  document.getElementById("f-price").value       = p.price       || "";
  document.getElementById("f-is-new").checked    = p.isNew       || false;
  document.getElementById("f-is-feat").checked   = p.isFeatured  || false;
  document.getElementById("f-is-offer").checked  = p.isOffer     || false;
  document.getElementById("f-offer").value       = p.offerPrice  || "";
  toggleOfferField();
  ADMIN_SIZES.forEach(s => {
    const el = document.getElementById(`f-${s}`);
    if (el) el.value = p.sizes?.[s] ?? 0;
  });
  renderPreviews();
  showModal();
}

function showModal() {
  const m = document.getElementById("prod-modal");
  m.style.display = "flex";
  lockScroll();
  trapFocus(m);
}

function closeModal() {
  const m = document.getElementById("prod-modal");
  if (m.style.display !== "flex") return;
  m.style.display = "none";
  unlockScroll();
  releaseFocus(m);
  editingId = null; newFiles = []; existingUrls = [];
}

function clearForm() {
  ["f-name","f-color","f-desc","f-price","f-offer"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  ["f-is-new","f-is-feat","f-is-offer"].forEach(id => {
    const el = document.getElementById(id); if (el) el.checked = false;
  });
  ADMIN_SIZES.forEach(s => {
    const el = document.getElementById(`f-${s}`); if (el) el.value = 0;
  });
  existingUrls = []; newFiles = [];
  document.getElementById("previews-grid").innerHTML = "";
  const inp = document.getElementById("f-images");
  if (inp) inp.value = "";
  toggleOfferField();
}

function toggleOfferField() {
  const show = document.getElementById("f-is-offer").checked;
  document.getElementById("offer-row").style.display = show ? "block" : "none";
}

// ── Imágenes ──────────────────────────────────────
function handleFiles(files) {
  const slots = MAX_IMAGES - existingUrls.length - newFiles.length;
  if (slots <= 0) { adminToast(`Máximo ${MAX_IMAGES} fotos por producto`, "err"); return; }

  let rejected = 0;
  Array.from(files).slice(0, slots).forEach(file => {
    if (!file.type.startsWith("image/")) { rejected++; return; }
    // Firebase Storage gratis se llena rápido: avisamos si la foto pesa mucho.
    if (file.size > 5 * 1024 * 1024) { rejected++; return; }
    newFiles.push(file);
  });
  if (rejected) adminToast("Algunas fotos se omitieron (no son imagen o pesan más de 5 MB)", "err");
  // Reset input so same file can be re-selected
  document.getElementById("f-images").value = "";
  renderPreviews();
}

function renderPreviews() {
  const grid = document.getElementById("previews-grid");
  grid.innerHTML = "";

  // Existing (already saved)
  existingUrls.forEach((url, i) => {
    const div = document.createElement("div");
    div.className = "preview-item";
    div.innerHTML = `
      <img src="${esc(url)}" alt="Foto ${i + 1}">
      <button class="preview-remove" type="button" onclick="removeExisting(${i})" aria-label="Eliminar foto ${i + 1}">×</button>
      <span class="preview-tag">Guardada</span>`;
    grid.appendChild(div);
  });

  // New (pending upload)
  newFiles.forEach((file, i) => {
    const div = document.createElement("div");
    div.className = "preview-item preview-new";
    const reader = new FileReader();
    reader.onload = e => {
      div.innerHTML = `
        <img src="${e.target.result}" alt="Foto nueva ${i + 1}">
        <button class="preview-remove" type="button" onclick="removeNew(${i})" aria-label="Quitar foto nueva ${i + 1}">×</button>
        <span class="preview-tag new">Nueva</span>`;
    };
    reader.readAsDataURL(file);
    grid.appendChild(div);
  });

  // Slot para agregar, mientras queden cupos
  if (existingUrls.length + newFiles.length < MAX_IMAGES) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "preview-item preview-add";
    add.onclick = () => document.getElementById("f-images").click();
    add.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Agregar</span>`;
    grid.appendChild(add);
  }
}

function removeExisting(i) {
  existingUrls.splice(i, 1);
  renderPreviews();
}
function removeNew(i) {
  newFiles.splice(i, 1);
  renderPreviews();
}

// Drag & drop
function setupDropzone() {
  const zone = document.getElementById("dropzone");
  if (!zone) return;
  zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("dz-over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("dz-over"));
  zone.addEventListener("drop", e => {
    e.preventDefault(); zone.classList.remove("dz-over");
    handleFiles(e.dataTransfer.files);
  });
}

async function uploadNewFiles() {
  if (!newFiles.length) return [];
  if (!storage) throw new Error("El almacenamiento de fotos no está disponible.");

  const urls = [];
  for (const file of newFiles) {
    // Nombre limpio: evita caracteres que rompen la ruta en Storage.
    const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-60);
    const ref  = storage.ref(`products/${Date.now()}_${safeName}`);
    const snap = await ref.put(file);
    urls.push(await snap.ref.getDownloadURL());
  }
  return urls;
}

// ── Guardar ───────────────────────────────────────
async function saveProduct() {
  const btn   = document.getElementById("save-btn");
  const name  = document.getElementById("f-name").value.trim();
  const color = document.getElementById("f-color").value;
  const price = parseFloat(document.getElementById("f-price").value);

  if (!name || !color || isNaN(price) || price < 0) {
    adminToast("Nombre, color y precio son obligatorios", "err"); return;
  }

  const isOffer  = document.getElementById("f-is-offer").checked;
  const offerP   = isOffer ? parseFloat(document.getElementById("f-offer").value) : null;
  if (isOffer && (!offerP || isNaN(offerP))) {
    adminToast("Ingresa el precio de oferta", "err"); return;
  }
  if (isOffer && offerP >= price) {
    adminToast("El precio de oferta debe ser menor al precio normal", "err"); return;
  }

  const sizes = {};
  ADMIN_SIZES.forEach(s => {
    sizes[s] = Math.max(0, parseInt(document.getElementById(`f-${s}`).value, 10) || 0);
  });

  // El catálogo filtra por talla: sin stock el producto sale como agotado.
  if (!Object.values(sizes).some(q => q > 0)) {
    adminToast("Ojo: sin stock en ninguna talla aparecerá como agotado");
  }

  setLoading(btn, true, "save-loader");

  try {
    // Subir fotos nuevas a Storage
    const uploadedUrls = await uploadNewFiles();
    const allImages    = [...existingUrls, ...uploadedUrls];

    const data = {
      name,
      color,
      description: document.getElementById("f-desc").value.trim(),
      price,
      isOffer,
      offerPrice:  isOffer ? offerP : null,
      isFeatured:  document.getElementById("f-is-feat").checked,
      isNew:       document.getElementById("f-is-new").checked,
      sizes,
      images:      allImages,
      updatedAt:   firebase.firestore.FieldValue.serverTimestamp()
    };

    if (editingId) {
      await db.collection("products").doc(editingId).update(data);
      adminToast("Producto actualizado ✓");
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("products").add(data);
      adminToast("Producto agregado ✓");
    }

    closeModal();
    fetchProducts();
  } catch (e) {
    adminToast("Error: " + e.message, "err");
  }

  setLoading(btn, false, "save-loader");
}

// ── Eliminar ──────────────────────────────────────
let pendingDeleteId = null;
function askDelete(id) {
  pendingDeleteId = id;
  const p = adminProducts.find(x => x.id === id);
  document.getElementById("del-name").textContent = p?.name || "este producto";
  const m = document.getElementById("del-modal");
  m.style.display = "flex";
  lockScroll();
  trapFocus(m);
}

function closeDelModal() {
  const m = document.getElementById("del-modal");
  if (m.style.display !== "flex") return;
  m.style.display = "none";
  unlockScroll();
  releaseFocus(m);
  pendingDeleteId = null;
}
async function confirmDelete() {
  if (!pendingDeleteId) return;
  try {
    await db.collection("products").doc(pendingDeleteId).delete();
    adminToast("Producto eliminado");
    closeDelModal();
    fetchProducts();
  } catch (e) {
    adminToast("Error: " + e.message, "err");
    closeDelModal();
  }
}

// ── Helpers ───────────────────────────────────────
function setLoading(btn, on, spinnerId) {
  btn.disabled = on;
  const sp = document.getElementById(spinnerId);
  if (sp) sp.style.display = on ? "inline-block" : "none";
  const tx = btn.querySelector(".btn-text");
  if (tx) tx.style.opacity = on ? "0" : "1";
}

function adminToast(msg, type = "ok") {
  document.querySelectorAll(".a-toast").forEach(t => t.remove());
  const t = document.createElement("div");
  t.className = "a-toast " + type;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("in"));
  setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 350); }, 3200);
}

// ── Init ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initAdmin();
  setupDropzone();

  document.getElementById("inp-pass")?.addEventListener("keydown", e => {
    if (e.key === "Enter") doLogin();
  });
  document.getElementById("prod-modal")?.addEventListener("click", e => {
    if (e.target.id === "prod-modal") closeModal();
  });
  document.getElementById("del-modal")?.addEventListener("click", e => {
    if (e.target.id === "del-modal") closeDelModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (document.getElementById("del-modal")?.style.display === "flex") closeDelModal();
    else if (document.getElementById("prod-modal")?.style.display === "flex") closeModal();
  });
});
