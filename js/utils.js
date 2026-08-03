// =====================================================
// UTILS — Ladys Comfort
// Helpers compartidos por toda la tienda.
// Se carga en el <head>, antes que cualquier otro script.
// =====================================================

/** Escapa texto para insertarlo con seguridad dentro de HTML. */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapa texto para insertarlo dentro de un atributo onclick='...'. */
function escJs(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Formatea un número como precio en pesos colombianos. */
function money(n) {
  const v = Number(n);
  return "$" + (Number.isFinite(v) ? v : 0).toLocaleString("es-CO");
}

/** Agrupa llamadas seguidas en una sola (para inputs de búsqueda). */
function debounce(fn, wait = 220) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Lee de forma segura desde localStorage (modo incógnito puede bloquearlo). */
function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

/** Escribe de forma segura en localStorage. */
function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sin persistencia disponible: la sesión sigue funcionando en memoria */
  }
}

// ── Foco accesible ──────────────────────────────────
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let focusReturnStack = [];

/**
 * Atrapa el foco dentro de un contenedor (panel o modal) y recuerda
 * qué elemento tenía el foco para devolverlo al cerrar.
 */
function trapFocus(container) {
  if (!container) return;
  focusReturnStack.push(document.activeElement);
  // preventScroll evita el salto de página, así que no hace falta esperar
  // a un frame: enfocamos ya, y el teclado funciona aunque no haya animación.
  container.querySelector(FOCUSABLE)?.focus({ preventScroll: true });

  container._lcTrap = e => {
    if (e.key !== "Tab") return;
    const items = [...container.querySelectorAll(FOCUSABLE)].filter(
      el => el.offsetParent !== null
    );
    if (!items.length) return;
    const firstEl = items[0];
    const lastEl = items[items.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  };
  container.addEventListener("keydown", container._lcTrap);
}

/** Libera el foco atrapado y lo devuelve a donde estaba. */
function releaseFocus(container) {
  if (container?._lcTrap) {
    container.removeEventListener("keydown", container._lcTrap);
    delete container._lcTrap;
  }
  const prev = focusReturnStack.pop();
  if (prev && typeof prev.focus === "function") {
    prev.focus({ preventScroll: true });
  }
}

// ── Bloqueo de scroll sin saltos ────────────────────
let scrollLocks = 0;

function lockScroll() {
  if (scrollLocks++ > 0) return;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = "hidden";
  if (gap > 0) document.body.style.paddingRight = gap + "px";
}

function unlockScroll(force = false) {
  if (force) scrollLocks = 0;
  else scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks > 0) return;
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
}
