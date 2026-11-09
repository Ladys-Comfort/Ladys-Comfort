// =====================================================
// COLAB — Ladys Comfort
// El panel grande de una colaboración o colección. Lo usan:
//   · el inicio (js/home.js), como foco de atención, con botón a su página
//   · la página propia de cada colaboración (js/colaboracion.js)
//
// Necesita js/events.js y js/carousel.js.
// =====================================================

const ARROW_SVG = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 10h12M10 4l6 6-6 6"/></svg>`;

/**
 * HTML del panel.
 *   opts.href   enlace del botón (sin él, no hay botón)
 *   opts.label  texto del botón
 *   opts.count  cuántas pijamas tiene (se muestra si se pasa)
 *   opts.chip   texto de la etiqueta de fechas (por defecto, cuánto falta para que termine)
 *   opts.desc   mostrar la descripción (el inicio sí; la página la pone aparte)
 *   opts.tag    etiqueta del título: "h2" en el inicio, "h1" en su página
 */
function eventSpotHTML(ev, opts = {}) {
  const fotos = eventImages(ev);
  const colab = eventKind(ev) === "colaboracion";
  const tag   = opts.tag || "h2";
  const fin   = opts.chip !== undefined ? opts.chip : eventEndLabel(ev);

  // La portada es lo principal. Sin fotos (sólo colecciones de temporada) queda
  // un fondo del color del evento: nunca un emoji gigante.
  const media = fotos.length
    ? `<div class="spot-media">${carouselHTML(fotos, ev.name)}<div class="spot-shade"></div></div>`
    : `<div class="spot-media is-plain"><div class="spot-shade"></div></div>`;

  const meta = [
    fin ? `<span class="spot-chip">${esc(fin)}</span>` : "",
    typeof opts.count === "number"
      ? `<span class="spot-chip">${opts.count} ${opts.count === 1 ? "pijama" : "pijamas"}</span>` : ""
  ].join("");

  // "LADYS COMFORT / SOFI" en colaboraciones; "COLECCIÓN DE TEMPORADA" en temporadas.
  const kicker = colab
    ? `Ladys Comfort${ev.partner ? " <i>/</i> " + esc(ev.partner) : ""}`
    : esc(eventKindLabel(ev)) + (ev.partner ? " <i>/</i> " + esc(ev.partner) : "");

  return `
  <article class="spot${fotos.length ? "" : " spot-noimg"}" style="${eventStyle(ev)}">
    ${media}
    <div class="spot-body">
      <p class="spot-kicker">${kicker}</p>
      <${tag} class="spot-title">${esc(ev.name)}</${tag}>
      ${ev.tagline ? `<p class="spot-note"><i>/</i> ${esc(ev.tagline)} <i>/</i></p>` : ""}
      ${opts.desc && ev.description ? `<p class="spot-desc">${esc(ev.description)}</p>` : ""}
      ${meta ? `<div class="spot-meta">${meta}</div>` : ""}
      ${opts.href ? `<div class="spot-actions">
        <a class="spot-cta" href="${esc(opts.href)}">${esc(opts.label || eventCtaLabel(ev))} ${ARROW_SVG}</a>
      </div>` : ""}
    </div>
  </article>`;
}

/** Pinta el panel dentro de `cont` y arranca su carrusel. */
function mountEventSpot(cont, ev, opts) {
  cont.innerHTML = eventSpotHTML(ev, opts);
  initCarousel(cont);
}
