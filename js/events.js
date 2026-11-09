// =====================================================
// EVENTS — Ladys Comfort
// Colaboraciones y eventos de temporada.
//
// Un evento vive en la colección `events`. El id del documento es el
// "slug" que se usa en la URL: catalogo.html?evento=halloween-2026.
// Cada pijama puede apuntar a un evento con su campo `eventId`.
//
// El estado (programado / activo / finalizado) NO se guarda: se calcula
// con las fechas. Así nadie tiene que acordarse de encender ni apagar
// nada cuando empieza o termina la temporada.
//
// Este archivo lo usan la tienda, el inicio y el panel de admin, para que
// la regla de "qué se ve y qué no" esté en un solo sitio.
// =====================================================

// El color de un evento es una CLAVE de esta paleta (con el contraste del
// texto ya comprobado: `ink` es el color de la letra encima) o un color libre
// en formato #rrggbb. Del color libre sólo se acepta ese formato exacto, así lo
// que llega de Firestore nunca se inyecta como CSS arbitrario; la letra se
// elige sola (clara u oscura) según la luminosidad del color.
const EVENT_COLORS = {
  rosa:    { label: "Rosa",    hex: "#ff3f96", ink: "#ffffff" },
  naranja: { label: "Naranja", hex: "#ff8a3d", ink: "#1a0810" },
  rojo:    { label: "Rojo",    hex: "#e11d48", ink: "#ffffff" },
  dorado:  { label: "Dorado",  hex: "#ffc850", ink: "#1a0810" },
  verde:   { label: "Verde",   hex: "#3ddc84", ink: "#0a1a10" },
  morado:  { label: "Morado",  hex: "#8b5cf6", ink: "#ffffff" },
  azul:    { label: "Azul",    hex: "#4da6ff", ink: "#06121f" }
};

const isHexColor = v => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

/** Letra clara u oscura según qué tan luminoso es el color de fondo. */
function inkFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255);
  return L > 0.35 ? "#1a0810" : "#ffffff";
}

const eventColor = key =>
  isHexColor(key) ? { label: "Personalizado", hex: key.toLowerCase(), ink: inkFor(key) }
                  : (EVENT_COLORS[key] || EVENT_COLORS.rosa);

/** Estilo en línea con los colores de un evento (valores de la paleta, no de Firestore). */
const eventStyle = ev => {
  const c = eventColor(ev && ev.color);
  return `--ev:${c.hex};--ev-ink:${c.ink}`;
};

/** Acepta Timestamp de Firestore, Date o texto; devuelve Date o null. */
function evDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

/** "pausado" | "programado" | "activo" | "finalizado" */
function eventStatus(ev, now = new Date()) {
  if (!ev || ev.enabled === false) return "pausado";
  const ini = evDate(ev.startsAt);
  const fin = evDate(ev.endsAt);
  if (ini && now < ini) return "programado";
  if (fin && now > fin) return "finalizado";
  return "activo";
}

function withTimeout(promesa, ms) {
  return Promise.race([
    promesa,
    new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("timeout")), ms))
  ]);
}

/**
 * Trae todos los eventos. Nunca lanza: si falla (sin conexión, o reglas de
 * Firestore sin autorizar la colección) devuelve `loaded:false` y la tienda
 * sigue funcionando sin eventos.
 */
async function loadEvents() {
  try {
    const snap = await withTimeout(db.collection("events").get(), 8000);
    const inicio = e => { const d = evDate(e.startsAt); return d ? d.getTime() : 0; };
    const list = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => inicio(a) - inicio(b));
    const byId = {};
    list.forEach(e => { byId[e.id] = e; });
    return { loaded: true, list, byId };
  } catch (e) {
    console.warn("Eventos no disponibles:", (e && e.code) || e);
    return { loaded: false, list: [], byId: {} };
  }
}

/**
 * ¿Debe verse este pijama en la tienda?
 *  - Sin evento: siempre.
 *  - Evento activo: sí.
 *  - Evento programado/finalizado/pausado: sólo si el evento NO está marcado
 *    como "mostrar sólo mientras dure" (`onlyDuring`, que por defecto es sí).
 *  - Evento borrado (id huérfano): se trata como pijama normal.
 *  - No se pudo cargar la lista de eventos: se oculta, porque no podemos
 *    saber si ese pijama todavía no se ha lanzado.
 */
function isProductVisible(p, ctx, now = new Date()) {
  if (!p.eventId) return true;
  if (!ctx || !ctx.loaded) return false;
  const ev = ctx.byId[p.eventId];
  if (!ev) return true;
  if (eventStatus(ev, now) === "activo") return true;
  return ev.onlyDuring === false;
}

const _fmtDia = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long" });
const _fmtCorto = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });
const _fmtHora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });

/** Texto para el cliente: "Hasta el 31 de octubre", "Quedan 3 días"... */
function eventEndLabel(ev, now = new Date()) {
  const fin = evDate(ev.endsAt);
  if (!fin) return "";
  const ms = fin - now;
  if (ms <= 0) return "Finalizado";
  if (ms < 86400000) return "Últimas horas";
  const dias = Math.ceil(ms / 86400000);
  if (dias <= 7) return `Quedan ${dias} días`;
  return "Hasta el " + _fmtDia.format(fin);
}

/** Texto para el admin: "5 oct – 31 oct 2026" (con hora si no es la de por defecto). */
function eventDateRange(ev) {
  const ini = evDate(ev.startsAt), fin = evDate(ev.endsAt);
  if (!ini || !fin) return "Sin fechas";
  const horaIni = !(ini.getHours() === 0 && ini.getMinutes() === 0);
  const horaFin = !(fin.getHours() === 23 && fin.getMinutes() === 59);
  const a = _fmtCorto.format(ini) + (horaIni ? ", " + _fmtHora.format(ini) : "");
  const b = _fmtCorto.format(fin) + " " + fin.getFullYear() + (horaFin ? ", " + _fmtHora.format(fin) : "");
  return `${a} – ${b}`;
}

/** "Halloween 2026" -> "halloween-2026" (sin tildes ni símbolos). */
function slugify(texto) {
  return String(texto || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 40) || "evento";
}

// ── Colaboraciones ────────────────────────────────
// Un evento puede ser una "colección de temporada" (por defecto) o una
// "colaboración" con alguien. Además de lo básico puede traer, todo opcional:
//   partner      con quién es la colaboración
//   description  texto largo para su página
//   images       fotos para el carrusel (la primera es la portada)
//   featured     si es true, se muestra grande en el inicio
//   ctaLabel     texto del botón del inicio
// Cada evento tiene su propia página: colaboracion.html?c=<id>.

const eventKind = ev => (ev && ev.kind === "colaboracion" ? "colaboracion" : "temporada");

/** "Colaboración" / "Colección de temporada" (con quién, si se indicó). */
function eventKindLabel(ev) {
  return eventKind(ev) === "colaboracion" ? "Colaboración" : "Colección de temporada";
}

/** Sólo http(s): la URL de una foto viene de la base de datos. */
const eventImages = ev =>
  (Array.isArray(ev && ev.images) ? ev.images : [])
    .filter(u => typeof u === "string" && /^https?:\/\//i.test(u));

/**
 * Lo que acompaña al nombre en etiquetas pequeñas. El emoji es sólo de las
 * colecciones de temporada; una colaboración se identifica por su foto.
 */
const eventGlyph = ev => (eventKind(ev) === "colaboracion" ? "✦" : (ev.emoji || "✦"));

/** Contenido del círculo de las tarjetas: la portada en colaboraciones, el emoji en temporadas. */
function eventIconHTML(ev) {
  if (eventKind(ev) !== "colaboracion") return esc(ev.emoji || "✦");
  const foto = eventImages(ev)[0];
  return foto ? `<img src="${esc(foto)}" alt="" loading="lazy" decoding="async">` : "✦";
}

const eventHref = ev => "colaboracion.html?c=" + encodeURIComponent(ev.id);

const eventCtaLabel = ev =>
  (ev.ctaLabel && String(ev.ctaLabel).trim()) ||
  (eventKind(ev) === "colaboracion" ? "Ver la colaboración" : "Ver la colección");

/**
 * El evento que va grande en el inicio: el último que empezó entre los que
 * están en curso y se marcaron como destacados. Sin ninguno, no hay sección.
 */
function featuredEvent(eventos) {
  const activos = eventos.list.filter(ev => ev.featured === true && eventStatus(ev) === "activo");
  return activos.length ? activos[activos.length - 1] : null;
}

/**
 * Enlace en el menú a la colaboración en curso. Va entre el catálogo y
 * contacto; si hay varias, la que empezó más recientemente.
 * `opts.current` es el id del evento que se está viendo (se marca activo).
 */
function renderNavCollab(eventos, opts = {}) {
  const ul = document.getElementById("nav-links");
  if (!ul || ul.querySelector(".nav-collab")) return;
  const ev = [...eventos.list].reverse()
    .find(e => eventKind(e) === "colaboracion" && eventStatus(e) === "activo");
  if (!ev) return;
  const li = document.createElement("li");
  const actual = opts.current === ev.id;
  li.innerHTML = `<a href="${eventHref(ev)}" class="nav-link nav-collab${actual ? " active" : ""}"
      style="${eventStyle(ev)}"${actual ? ` aria-current="page"` : ""}><span class="nav-collab-star" aria-hidden="true">✦</span> ${esc(ev.name)}</a>`;
  ul.insertBefore(li, ul.lastElementChild);
}
