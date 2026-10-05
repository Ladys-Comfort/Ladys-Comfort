// =====================================================
// ADMIN · EVENTOS — Ladys Comfort
// Crear y administrar colecciones de temporada y colaboraciones.
// Usa lo de js/events.js (paleta, estados, visibilidad) y las
// utilidades de js/admin.js / js/utils.js.
// =====================================================

let adminEvents    = { list: [], byId: {}, error: null };
let editingEventId = null;
let evColor        = "rosa";
let currentView    = "productos";

const EVENT_STATUS_LABEL = {
  activo: "En curso", programado: "Programado", finalizado: "Finalizado", pausado: "Borrador"
};
const EVENT_STATUS_RANK = { activo: 0, programado: 1, pausado: 2, finalizado: 3 };

// ── Vistas (Productos / Eventos) ──────────────────
function showView(view) {
  currentView = view;
  const prod = view === "productos";
  document.getElementById("view-productos").style.display = prod ? "flex" : "none";
  document.getElementById("view-eventos").style.display   = prod ? "none" : "flex";
  document.getElementById("nav-productos").classList.toggle("active", prod);
  document.getElementById("nav-eventos").classList.toggle("active", !prod);
  document.getElementById("btn-add-prod").style.display  = prod ? "" : "none";
  document.getElementById("btn-add-event").style.display = prod ? "none" : "";
  document.getElementById("admin-title").textContent = prod ? "Productos" : "Eventos";
  updateSubtitle();
  document.getElementById("admin-sidebar")?.classList.remove("open");
  window.scrollTo(0, 0);
}

function updateSubtitle() {
  const el = document.getElementById("dash-count");
  if (!el) return;
  if (currentView === "productos") {
    const c = adminProducts.length;
    el.textContent = c + " producto" + (c !== 1 ? "s" : "");
  } else {
    const c = adminEvents.list.length;
    el.textContent = adminEvents.error ? "No disponible" : c + " evento" + (c !== 1 ? "s" : "");
  }
}

// ── Carga ─────────────────────────────────────────
async function fetchEvents() {
  try {
    const snap = await db.collection("events").get();
    const inicio = e => { const d = evDate(e.startsAt); return d ? d.getTime() : 0; };
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) =>
        (EVENT_STATUS_RANK[eventStatus(a)] - EVENT_STATUS_RANK[eventStatus(b)]) ||
        (inicio(b) - inicio(a)));
    const byId = {};
    list.forEach(e => { byId[e.id] = e; });
    adminEvents = { list, byId, error: null };
  } catch (e) {
    adminEvents = { list: [], byId: {}, error: e };
  }
  renderEventList();
  updateSubtitle();
}

// ── Lista de eventos ──────────────────────────────
function renderEventList() {
  const el = document.getElementById("event-list");
  if (!el) return;

  if (adminEvents.error) {
    const denegado = adminEvents.error.code === "permission-denied";
    el.innerHTML = `<div class="a-msg error">
      ${denegado
        ? "Los eventos todavía no están habilitados en la base de datos (permiso denegado)."
        : "No se pudieron cargar los eventos: " + esc(adminEvents.error.message || "error desconocido")}
    </div>`;
    return;
  }
  if (!adminEvents.list.length) {
    el.innerHTML = `<div class="a-msg">
      Aún no hay eventos. Crea el primero con <strong>Nuevo evento</strong>:
      Halloween, Navidad, una colaboración…</div>`;
    return;
  }
  el.innerHTML = adminEvents.list.map(buildEventRow).join("");
}

function startsInLabel(ev) {
  const ini = evDate(ev.startsAt);
  if (!ini) return "";
  const ms = ini - new Date();
  if (ms < 86400000) return "Empieza hoy";
  return "Empieza en " + Math.ceil(ms / 86400000) + " días";
}

function buildEventRow(ev) {
  const id = escJs(ev.id);
  const st = eventStatus(ev);
  const n  = adminProducts.filter(p => p.eventId === ev.id).length;

  const tiempo = st === "activo" ? eventEndLabel(ev)
               : st === "programado" ? startsInLabel(ev) : "";
  const ocultos = st !== "activo" && ev.onlyDuring !== false && n > 0;

  return `
  <div class="a-row a-row-event" style="${eventStyle(ev)}" data-id="${esc(ev.id)}">
    <div class="a-ev-emoji" aria-hidden="true">${esc(ev.emoji || "✦")}</div>
    <div class="a-row-info">
      <div class="a-row-top">
        <h3>${esc(ev.name)}</h3>
        <div class="a-row-badges"><span class="atag tag-ev-${st}">${EVENT_STATUS_LABEL[st]}</span></div>
      </div>
      <div class="a-row-meta">
        <span>${esc(eventDateRange(ev))}</span>
        ${tiempo ? `<span class="meta-sep">·</span><span>${esc(tiempo)}</span>` : ""}
        <span class="meta-sep">·</span>
        <span>${n} pijama${n === 1 ? "" : "s"}</span>
        ${ocultos ? `<span class="meta-sep">·</span><span class="a-ev-warn">no se ven en la tienda</span>` : ""}
      </div>
    </div>
    <div class="a-row-actions">
      <button class="btn-edit-row" type="button" onclick="openEventEdit('${id}')">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14.7 3.3a1 1 0 011.4 1.4L6 14.8l-3.5.9.9-3.5L14.7 3.3z"/></svg>
        Editar
      </button>
      <button class="btn-del-row" type="button" onclick="askDeleteEvent('${id}')">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12"/></svg>
        Eliminar
      </button>
    </div>
  </div>`;
}

// ── En la lista de productos: etiqueta del evento ─
/** HTML con la etiqueta del evento de un pijama (y si hoy está oculto). */
function productEventTags(p) {
  if (!p.eventId) return "";
  const ev = adminEvents.byId[p.eventId];
  if (!ev) return "";
  const chip = `<span class="atag tag-ev" style="${eventStyle(ev)}">${esc(ev.emoji || "✦")} ${esc(ev.name)}</span>`;
  const visible = isProductVisible(p, { loaded: true, byId: adminEvents.byId });
  return chip + (visible ? ""
    : `<span class="atag tag-out" title="El evento no está en curso: este pijama no se ve en la tienda">Oculto</span>`);
}

// ── Selector de evento en el formulario de producto ─
function populateEventSelect(selectedId) {
  const sel = document.getElementById("f-event");
  if (!sel) return;
  const opciones = adminEvents.list.map(ev =>
    `<option value="${esc(ev.id)}">${esc(ev.emoji || "✦")} ${esc(ev.name)} · ${EVENT_STATUS_LABEL[eventStatus(ev)]}</option>`);
  sel.innerHTML = `<option value="">Ninguno (pijama del catálogo normal)</option>` + opciones.join("");
  // Si el pijama apunta a un evento que no se pudo cargar, se conserva la
  // opción para que guardar el producto no le borre el evento sin querer.
  if (selectedId && !adminEvents.byId[selectedId]) {
    sel.insertAdjacentHTML("beforeend",
      `<option value="${esc(selectedId)}">(evento no disponible)</option>`);
  }
  sel.value = selectedId || "";
  updateProductEventNote();
}

function updateProductEventNote() {
  const note = document.getElementById("f-event-note");
  const sel  = document.getElementById("f-event");
  if (!note || !sel) return;
  const ev = adminEvents.byId[sel.value];
  if (!ev) { note.textContent = ""; return; }
  const st = eventStatus(ev);
  const solo = ev.onlyDuring !== false;
  let txt;
  if (st === "activo") {
    txt = "El evento está en curso: este pijama se ve en la tienda con su etiqueta.";
  } else if (st === "programado") {
    txt = solo ? "Aún no empieza (" + eventDateRange(ev) + "): hasta entonces este pijama no se verá en la tienda."
               : "Aún no empieza, pero este pijama se verá en la tienda desde ya.";
  } else if (st === "finalizado") {
    txt = solo ? "El evento ya terminó: este pijama no se verá en la tienda."
               : "El evento ya terminó; este pijama sigue en el catálogo normal.";
  } else {
    txt = solo ? "El evento está en borrador: este pijama no se verá en la tienda."
               : "El evento está en borrador; este pijama se ve como uno normal.";
  }
  note.textContent = txt;
}

// ── Modal de evento ───────────────────────────────
const pad2 = n => String(n).padStart(2, "0");
function toInputValue(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
const fromInput = id => {
  const v = document.getElementById(id).value;
  const d = v ? new Date(v) : null;
  return d && !isNaN(d) ? d : null;
};

function renderEventColors() {
  document.getElementById("ev-colors").innerHTML = Object.entries(EVENT_COLORS).map(([k, c]) =>
    `<button type="button" class="ev-swatch${k === evColor ? " on" : ""}" style="--sw:${c.hex}"
             aria-pressed="${k === evColor}" aria-label="${esc(c.label)}" title="${esc(c.label)}"
             onclick="pickEventColor('${k}')"></button>`).join("");
}
function pickEventColor(k) { evColor = k; renderEventColors(); }

function renderEventProducts(seleccionados) {
  const lista = [...adminProducts].sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  const box = document.getElementById("ev-prod-list");
  if (!lista.length) {
    box.innerHTML = `<p class="ev-prod-empty">Todavía no hay pijamas. Crea alguno primero.</p>`;
  } else {
    box.innerHTML = lista.map(p => {
      const otro = p.eventId && p.eventId !== editingEventId ? adminEvents.byId[p.eventId] : null;
      const thumb = p.images && p.images[0]
        ? `<img src="${esc(p.images[0])}" alt="" loading="lazy">` : `<span class="ev-prod-noimg"></span>`;
      return `
      <label class="ev-prod" data-name="${esc((p.name || "").toLowerCase())}">
        <input type="checkbox" value="${esc(p.id)}" ${seleccionados.has(p.id) ? "checked" : ""}
               onchange="updateEventProductCount()">
        ${thumb}
        <span class="ev-prod-name">${esc(p.name)}</span>
        ${otro ? `<small class="ev-prod-other">Está en “${esc(otro.name)}”: se moverá aquí</small>` : ""}
      </label>`;
    }).join("");
  }
  document.getElementById("ev-prod-search").value = "";
  updateEventProductCount();
}

function filterEventProducts() {
  const q = document.getElementById("ev-prod-search").value.trim().toLowerCase();
  document.querySelectorAll("#ev-prod-list .ev-prod").forEach(el => {
    el.style.display = !q || el.dataset.name.includes(q) ? "" : "none";
  });
}

function updateEventProductCount() {
  const n = document.querySelectorAll("#ev-prod-list input:checked").length;
  document.getElementById("ev-prod-count").textContent = n
    ? n + " pijama" + (n === 1 ? "" : "s") + " seleccionado" + (n === 1 ? "" : "s") + "."
    : "Aún no hay pijamas seleccionados. Puedes agregarlos ahora o después.";
}

/** Vista previa del estado según las fechas y el interruptor "Publicado". */
function updateEventHint() {
  const el = document.getElementById("ev-status-hint");
  if (!el) return;
  const ini = fromInput("ev-start"), fin = fromInput("ev-end");
  el.classList.remove("is-error");
  if (!ini || !fin) { el.textContent = ""; return; }
  if (fin <= ini) {
    el.textContent = "La fecha de fin tiene que ser posterior a la de inicio.";
    el.classList.add("is-error");
    return;
  }
  const prueba = { enabled: document.getElementById("ev-enabled").checked, startsAt: ini, endsAt: fin };
  const st = eventStatus(prueba);
  if (st === "pausado")         el.textContent = "Borrador: no se mostrará en la tienda hasta que lo publiques.";
  else if (st === "programado") el.textContent = startsInLabel(prueba) + ". Se activará solo en esa fecha.";
  else if (st === "finalizado") el.textContent = "Esas fechas ya pasaron: este evento quedaría como finalizado.";
  else                          el.textContent = "Quedaría en curso desde ahora. " + eventEndLabel(prueba) + ".";
}

function openEventAdd() {
  editingEventId = null;
  evColor = "rosa";
  document.getElementById("event-modal-title").textContent = "Nuevo evento";
  document.getElementById("ev-name").value    = "";
  document.getElementById("ev-emoji").value   = "";
  document.getElementById("ev-tagline").value = "";
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fin = new Date(hoy); fin.setDate(fin.getDate() + 30); fin.setHours(23, 59, 0, 0);
  document.getElementById("ev-start").value = toInputValue(hoy);
  document.getElementById("ev-end").value   = toInputValue(fin);
  document.getElementById("ev-enabled").checked = true;
  document.getElementById("ev-only").checked    = true;
  renderEventColors();
  renderEventProducts(new Set());
  updateEventHint();
  showEventModal();
}

function openEventEdit(id) {
  const ev = adminEvents.byId[id];
  if (!ev) return;
  editingEventId = id;
  evColor = EVENT_COLORS[ev.color] ? ev.color : "rosa";
  document.getElementById("event-modal-title").textContent = "Editar evento";
  document.getElementById("ev-name").value    = ev.name    || "";
  document.getElementById("ev-emoji").value   = ev.emoji   || "";
  document.getElementById("ev-tagline").value = ev.tagline || "";
  const ini = evDate(ev.startsAt), fin = evDate(ev.endsAt);
  document.getElementById("ev-start").value = ini ? toInputValue(ini) : "";
  document.getElementById("ev-end").value   = fin ? toInputValue(fin) : "";
  document.getElementById("ev-enabled").checked = ev.enabled !== false;
  document.getElementById("ev-only").checked    = ev.onlyDuring !== false;
  renderEventColors();
  renderEventProducts(new Set(adminProducts.filter(p => p.eventId === id).map(p => p.id)));
  updateEventHint();
  showEventModal();
}

function showEventModal() {
  const m = document.getElementById("event-modal");
  m.style.display = "flex";
  lockScroll();
  trapFocus(m);
}

function closeEventModal() {
  const m = document.getElementById("event-modal");
  if (!m || m.style.display !== "flex") return;
  m.style.display = "none";
  unlockScroll();
  releaseFocus(m);
  editingEventId = null;
}

// ── Guardar ───────────────────────────────────────
/** Un id libre a partir del nombre: "halloween-2026", y -2, -3 si ya existe. */
async function uniqueEventId(nombre, inicio) {
  const base = slugify(nombre) + "-" + inicio.getFullYear();
  for (let i = 1; i < 20; i++) {
    const id = i === 1 ? base : base + "-" + i;
    const existe = await db.collection("events").doc(id).get();
    if (!existe.exists) return id;
  }
  return base + "-" + Date.now();
}

/** Deja los pijamas marcados apuntando a este evento y suelta los desmarcados. */
async function syncEventProducts(id) {
  const elegidos = new Set(
    [...document.querySelectorAll("#ev-prod-list input:checked")].map(i => i.value));
  const ops = [];
  adminProducts.forEach(p => {
    const tenia = p.eventId === id, quiere = elegidos.has(p.id);
    if (quiere && !tenia) ops.push([p.id, id]);
    else if (!quiere && tenia) ops.push([p.id, null]);
  });
  for (let i = 0; i < ops.length; i += 400) {            // un batch admite 500
    const batch = db.batch();
    ops.slice(i, i + 400).forEach(([pid, valor]) =>
      batch.update(db.collection("products").doc(pid), { eventId: valor }));
    await batch.commit();
  }
  return ops.length;
}

function eventErrorMessage(e) {
  return e && e.code === "permission-denied"
    ? "Sin permiso: los eventos todavía no están habilitados en la base de datos."
    : "Error: " + (e && e.message ? e.message : e);
}

async function saveEvent() {
  const btn    = document.getElementById("event-save-btn");
  const nombre = document.getElementById("ev-name").value.trim();
  const inicio = fromInput("ev-start");
  const fin    = fromInput("ev-end");

  if (!nombre)         { adminToast("Ponle un nombre al evento", "err"); return; }
  if (!inicio || !fin) { adminToast("Elige la fecha de inicio y la de fin", "err"); return; }
  if (fin <= inicio)   { adminToast("La fecha de fin tiene que ser posterior a la de inicio", "err"); return; }

  const esNuevo = !editingEventId;
  setLoading(btn, true, "event-save-loader");
  try {
    const id = esNuevo ? await uniqueEventId(nombre, inicio) : editingEventId;
    const data = {
      name:       nombre,
      emoji:      document.getElementById("ev-emoji").value.trim(),
      tagline:    document.getElementById("ev-tagline").value.trim(),
      color:      evColor,
      startsAt:   firebase.firestore.Timestamp.fromDate(inicio),
      endsAt:     firebase.firestore.Timestamp.fromDate(fin),
      enabled:    document.getElementById("ev-enabled").checked,
      onlyDuring: document.getElementById("ev-only").checked,
      updatedAt:  firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = db.collection("events").doc(id);
    if (esNuevo) {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await ref.set(data);
    } else {
      await ref.update(data);
    }
    await syncEventProducts(id);

    adminToast(esNuevo ? "Evento creado \u2713" : "Evento actualizado \u2713");
    closeEventModal();
    await fetchProducts();          // refresca productos y eventos
  } catch (e) {
    adminToast(eventErrorMessage(e), "err");
  }
  setLoading(btn, false, "event-save-loader");
}

// ── Eliminar ──────────────────────────────────────
function askDeleteEvent(id) {
  const ev = adminEvents.byId[id];
  if (!ev) return;
  const n = adminProducts.filter(p => p.eventId === id).length;
  pendingDeleteId   = id;
  pendingDeleteKind = "event";
  document.getElementById("del-title").textContent = "¿Eliminar evento?";
  document.getElementById("del-name").textContent  = ev.name;
  document.getElementById("del-extra").textContent = n
    ? "Sus " + n + " pijama" + (n === 1 ? "" : "s") + " NO se borra" + (n === 1 ? "" : "n") +
      ": vuelve" + (n === 1 ? "" : "n") + " al catálogo normal y se verá" + (n === 1 ? "" : "n") + " en la tienda."
    : "Esta acción no se puede deshacer.";
  const m = document.getElementById("del-modal");
  m.style.display = "flex";
  lockScroll();
  trapFocus(m);
}

async function confirmDeleteEvent() {
  const id = pendingDeleteId;
  if (!id) return;
  try {
    const sueltos = adminProducts.filter(p => p.eventId === id).map(p => p.id);
    for (let i = 0; i < sueltos.length; i += 400) {
      const batch = db.batch();
      sueltos.slice(i, i + 400).forEach(pid =>
        batch.update(db.collection("products").doc(pid), { eventId: null }));
      await batch.commit();
    }
    await db.collection("events").doc(id).delete();
    adminToast("Evento eliminado");
    closeDelModal();
    await fetchProducts();
  } catch (e) {
    adminToast(eventErrorMessage(e), "err");
    closeDelModal();
  }
}

// ── Init ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("f-event")?.addEventListener("change", updateProductEventNote);
  document.getElementById("event-modal")?.addEventListener("click", e => {
    if (e.target.id === "event-modal") closeEventModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeEventModal();
  });
});
