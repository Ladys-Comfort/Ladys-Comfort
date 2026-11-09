// =====================================================
// HOME — Ladys Comfort
// El inicio no muestra fotos de producto: sólo trae de
// Firestore las cifras reales del catálogo para que los
// números del hero nunca queden desactualizados a mano.
// =====================================================

const HOME_SIZES = ["S", "M", "L", "XL"];
// "U" (talla única) cuenta para saber si un pijama está disponible,
// pero no suma al número de tallas del catálogo.
const HOME_STOCK_KEYS = [...HOME_SIZES, "U"];
const homeStock  = (p, s) => Number(p?.sizes?.[s]) || 0;

async function loadHomeStats() {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  try {
    // loadEvents() nunca lanza: si falla, el inicio sigue igual, sin franja.
    const [snap, eventos] = await Promise.all([
      db.collection("products").get(),
      loadEvents()
    ]);
    // Mismo criterio que el catálogo: lo que aún no toca no cuenta.
    const all = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => isProductVisible(p, eventos));

    const destacado = renderDestacado(eventos, all);
    renderTemporada(eventos, all, destacado);
    renderNavCollab(eventos);

    // Sólo cuentan los que realmente se pueden comprar.
    const conStock = all.filter(p => HOME_STOCK_KEYS.some(s => homeStock(p, s) > 0));
    const tallas   = HOME_SIZES.filter(s => all.some(p => homeStock(p, s) > 0));

    set("stat-productos", conStock.length || all.length);
    set("stat-tallas", tallas.length || 4);
  } catch {
    // Sin conexión dejamos un valor honesto en vez de un guión.
    set("stat-productos", "20+");
  }
}

/**
 * Colaboración destacada: el foco de atención del inicio. Es opcional: sólo
 * aparece si Evelyn marcó un evento en curso como "destacado". Lleva un
 * carrusel con las fotos del evento y un botón a su página.
 * Devuelve el evento mostrado (o null) para no repetirlo en la franja.
 */
function renderDestacado(eventos, productos) {
  const sec  = document.getElementById("destacado");
  const cont = document.getElementById("destacado-card");
  if (!sec || !cont) return null;

  const ev = featuredEvent(eventos);
  if (!ev) { sec.hidden = true; return null; }

  const n = productos.filter(p => p.eventId === ev.id).length;
  mountEventSpot(cont, ev, { href: eventHref(ev), count: n, desc: true });
  sec.hidden = false;
  return ev;
}

/** Franja de temporada: una tarjeta por cada colección en curso con pijamas. */
function renderTemporada(eventos, productos, destacado) {
  const sec  = document.getElementById("temporada");
  const cont = document.getElementById("temporada-list");
  if (!sec || !cont) return;

  const activos = eventos.list.filter(ev =>
    eventStatus(ev) === "activo" &&
    !(destacado && ev.id === destacado.id) &&
    productos.some(p => p.eventId === ev.id));
  if (!activos.length) { sec.hidden = true; return; }

  cont.innerHTML = activos.map(ev => {
    const n = productos.filter(p => p.eventId === ev.id).length;
    return `
    <a class="season-card" style="${eventStyle(ev)}" href="${esc(eventHref(ev))}">
      <span class="season-emoji" aria-hidden="true">${eventIconHTML(ev)}</span>
      <span class="season-body">
        <span class="season-kicker">${esc(eventKindLabel(ev))}${ev.partner ? " · " + esc(ev.partner) : ""} · ${esc(eventEndLabel(ev))}</span>
        <strong class="season-name">${esc(ev.name)}</strong>
        ${ev.tagline ? `<span class="season-tagline">${esc(ev.tagline)}</span>` : ""}
      </span>
      <span class="season-cta">Ver ${n} ${n === 1 ? "pijama" : "pijamas"} →</span>
    </a>`;
  }).join("");
  sec.hidden = false;
}

document.addEventListener("DOMContentLoaded", loadHomeStats);
