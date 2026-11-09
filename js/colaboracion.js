// =====================================================
// COLABORACIÓN — Ladys Comfort
// Página propia de una colaboración o colección de temporada:
//   colaboracion.html?c=<id del evento>
//
// Es el mismo catálogo de siempre (js/catalogo.js: tarjetas, tallas, vista
// rápida, carrito) pero con las pijamas de ese evento nada más. Este archivo
// le agrega la portada con carrusel, el texto de la colaboración y los avisos
// cuando todavía no empieza, ya terminó o no existe.
//
// Debe cargarse ANTES de catalogo.js: fija el evento que éste va a leer.
// =====================================================

(function () {
  const p = new URLSearchParams(location.search);
  window.EVENTO_FIJO = (p.get("c") || p.get("evento") || "").trim();
})();

const $c = id => document.getElementById(id);

const _fmtInicio = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long" });

function noteHTML(emoji, titulo, texto, boton, href) {
  return `
  <div class="colab-note">
    <div class="colab-note-icon" aria-hidden="true">${esc(emoji)}</div>
    <h2>${esc(titulo)}</h2>
    <p>${esc(texto)}</p>
    ${boton ? `<a class="colab-note-btn" href="${esc(href)}">${esc(boton)}</a>` : ""}
  </div>`;
}

/** Sólo el aviso: se esconde todo lo demás. */
function showOnlyNote(html) {
  $c("chero").hidden = true;
  $c("cabout").hidden = true;
  ["cpieces-head", "colab-toolbar", "colab-main"].forEach(id => { $c(id).hidden = true; });
  document.getElementById("active-filters").hidden = true;
  const n = $c("colab-note");
  n.innerHTML = html;
  n.hidden = false;
}

function aboutHTML(ev, nPijamas) {
  const colab = eventKind(ev) === "colaboracion";
  const datos = [
    ev.partner ? `<div><dt>${colab ? "Con" : "Marca"}</dt><dd>${esc(ev.partner)}</dd></div>` : "",
    `<div><dt>Disponible</dt><dd>${esc(eventDateRange(ev))}</dd></div>`,
    nPijamas ? `<div><dt>Piezas</dt><dd>${nPijamas} ${nPijamas === 1 ? "pijama" : "pijamas"}</dd></div>` : ""
  ].join("");

  return `
  <div class="cabout-grid">
    <div>
      <p class="cabout-eyebrow">${colab ? "Sobre la colaboración" : "Sobre la colección"}</p>
      <h2 id="cabout-title">${esc(ev.name)}</h2>
      ${ev.description ? `<p class="cabout-text">${esc(ev.description)}</p>` : ""}
    </div>
    <aside class="cabout-card" aria-label="Datos">
      <dl class="cabout-facts">${datos}</dl>
      <button type="button" class="cabout-share" id="colab-share">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <circle cx="15" cy="4.5" r="2.3"/><circle cx="5" cy="10" r="2.3"/><circle cx="15" cy="15.5" r="2.3"/>
          <path d="M7.1 8.9l5.8-3.3M7.1 11.1l5.8 3.3"/>
        </svg>
        Compartir
      </button>
    </aside>
  </div>`;
}

/** Compartir con el menú del teléfono; si no existe, copia el enlace. */
async function shareColab(ev) {
  const url = location.href;
  if (navigator.share) {
    try { await navigator.share({ title: ev.name + " · Ladys Comfort", text: ev.tagline || ev.name, url }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast("Enlace copiado ✓");
  } catch (e) {
    window.prompt("Copia este enlace:", url);
  }
}

// catalogo.js llama a esto cuando ya cargó los productos y los eventos.
window.onCatalogReady = function (ctx) {
  const slug = window.EVENTO_FIJO;

  if (!slug) {
    return showOnlyNote(noteHTML("✦", "Falta la colaboración",
      "Este enlace no indica cuál colaboración abrir.", "Ver el catálogo", "catalogo.html"));
  }
  if (!ctx.loaded) {
    return showOnlyNote(noteHTML("⚠", "No pudimos cargar la colaboración",
      "Revisa tu conexión e inténtalo de nuevo.", "Reintentar", location.href));
  }

  const ev = ctx.byId[slug];
  const st = ev ? eventStatus(ev) : null;
  // Un borrador (o un enlace viejo de un evento borrado) no se muestra.
  if (!ev || st === "pausado") {
    return showOnlyNote(noteHTML("✦", "Esta colaboración no está disponible",
      "Puede que ya haya terminado o que el enlace no sea correcto.", "Ver el catálogo", "catalogo.html"));
  }

  // Colores del evento para toda la página (valores de la paleta, no de Firestore).
  $c("colab-root").setAttribute("style", eventStyle(ev));
  document.title = ev.name + " | Ladys Comfort";
  const og = document.querySelector('meta[property="og:title"]');
  if (og) og.setAttribute("content", ev.name + " | Ladys Comfort");

  // allProducts ya viene filtrado: aquí sólo quedan las que se pueden ver.
  const piezas = allProducts.filter(p => p.eventId === ev.id);
  const hayPiezas = piezas.length > 0;

  // ── Portada ──
  const hero = $c("chero");
  hero.hidden = false;
  mountEventSpot(hero, ev, {
    tag: "h1",
    count: hayPiezas ? piezas.length : undefined,
    chip: st === "programado" ? "Empieza el " + _fmtInicio.format(evDate(ev.startsAt)) : undefined,
    href: hayPiezas ? "#piezas" : "",
    label: "Ver las pijamas"
  });

  // ── Texto ──
  const about = $c("cabout");
  about.innerHTML = aboutHTML(ev, piezas.length);
  about.hidden = false;
  $c("colab-share")?.addEventListener("click", () => shareColab(ev));

  // ── Piezas o aviso ──
  ["cpieces-head", "colab-toolbar", "colab-main"].forEach(id => { $c(id).hidden = !hayPiezas; });
  document.getElementById("active-filters").hidden = !hayPiezas;

  const nota = $c("colab-note");
  if (hayPiezas && st !== "finalizado") {
    nota.hidden = true;
  } else {
    let html;
    if (st === "programado") {
      html = noteHTML(eventGlyph(ev), "Muy pronto",
        "Esta colaboración empieza el " + _fmtInicio.format(evDate(ev.startsAt)) + ". Vuelve ese día para ver las pijamas.",
        "Ver el catálogo", "catalogo.html");
    } else if (st === "finalizado") {
      html = noteHTML(eventGlyph(ev), "Esta colaboración ya terminó",
        hayPiezas ? "Las pijamas que quedan siguen disponibles aquí abajo."
                  : "Gracias por acompañarnos. Mira lo que tenemos ahora en el catálogo.",
        hayPiezas ? "" : "Ver el catálogo", "catalogo.html");
    } else {
      html = noteHTML(eventGlyph(ev), "Estamos preparando las pijamas",
        "Muy pronto vas a ver aquí las piezas de esta colaboración.", "Ver el catálogo", "catalogo.html");
    }
    nota.innerHTML = html;
    nota.hidden = false;
  }
};
