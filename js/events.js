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

// Paleta cerrada: el admin elige una CLAVE, nunca un color libre. Así lo que
// llega de Firestore no se inyecta en estilos, y todos los colores tienen el
// contraste de texto ya comprobado (`ink` es el color del texto encima).
const EVENT_COLORS = {
  rosa:    { label: "Rosa",    hex: "#ff3f96", ink: "#ffffff" },
  naranja: { label: "Naranja", hex: "#ff8a3d", ink: "#1a0810" },
  rojo:    { label: "Rojo",    hex: "#e11d48", ink: "#ffffff" },
  dorado:  { label: "Dorado",  hex: "#ffc850", ink: "#1a0810" },
  verde:   { label: "Verde",   hex: "#3ddc84", ink: "#0a1a10" },
  morado:  { label: "Morado",  hex: "#8b5cf6", ink: "#ffffff" },
  azul:    { label: "Azul",    hex: "#4da6ff", ink: "#06121f" }
};

const eventColor = key => EVENT_COLORS[key] || EVENT_COLORS.rosa;

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
