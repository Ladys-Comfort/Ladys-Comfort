// =====================================================
// CARRUSEL — Ladys Comfort
// Fotos de una colaboración. Se desliza con el dedo (scroll-snap nativo),
// tiene flechas, puntos y avance automático.
//
//   carouselHTML(fotos, alt)  -> marcado del carrusel
//   initCarousel(raiz)        -> le da vida (flechas, puntos, autoplay)
//
// El avance automático se detiene al tocar, al pasar el mouse, al enfocar,
// con la pestaña oculta, fuera de pantalla y si la persona pidió menos
// movimiento en su sistema.
// =====================================================

const CAROUSEL_MS = 5500;

function carouselHTML(fotos, alt) {
  if (!fotos.length) return "";
  const slides = fotos.map((src, i) => `
      <div class="ccar-slide" role="group" aria-roledescription="foto" aria-label="${i + 1} de ${fotos.length}">
        <img src="${esc(src)}" alt="${esc(alt)}${fotos.length > 1 ? " · foto " + (i + 1) : ""}"
             ${i === 0 ? `loading="eager" fetchpriority="high"` : `loading="lazy"`} decoding="async" draggable="false">
      </div>`).join("");
  const varias = fotos.length > 1;
  return `
  <div class="ccar${varias ? "" : " ccar-single"}" data-count="${fotos.length}">
    <div class="ccar-track" tabindex="0" role="region" aria-roledescription="carrusel"
         aria-label="Fotos de ${esc(alt)}">${slides}
    </div>
    ${varias ? `
    <button type="button" class="ccar-btn ccar-prev" aria-label="Foto anterior">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12.5 4l-6 6 6 6"/></svg>
    </button>
    <button type="button" class="ccar-btn ccar-next" aria-label="Foto siguiente">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7.5 4l6 6-6 6"/></svg>
    </button>
    <div class="ccar-dots" role="group" aria-label="Elegir foto">
      ${fotos.map((_, i) => `<button type="button" class="ccar-dot${i === 0 ? " on" : ""}" aria-label="Ir a la foto ${i + 1}"${i === 0 ? ` aria-current="true"` : ""}></button>`).join("")}
    </div>` : ""}
  </div>`;
}

function initCarousel(raiz) {
  const car = raiz && raiz.querySelector(".ccar");
  if (!car || car.classList.contains("ccar-single") || car.dataset.ready) return;
  car.dataset.ready = "1";

  const track = car.querySelector(".ccar-track");
  const dots  = [...car.querySelectorAll(".ccar-dot")];
  const n     = dots.length;
  let idx = 0, pausado = false, visible = true, timer = null, raf = 0;

  const ancho = () => track.clientWidth || 1;

  function marcar(i) {
    idx = i;
    dots.forEach((d, k) => {
      d.classList.toggle("on", k === i);
      if (k === i) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
    });
  }

  function ir(i, suave = true) {
    const destino = (i + n) % n;
    // Dar la vuelta (de la última a la primera) es un salto directo: deslizar
    // de golpe por todas las fotos se ve mal.
    const vuelta = n > 2 && Math.abs(destino - idx) > 1;
    // `behavior` en scrollTo no existe en iOS viejo: allí el salto es directo.
    try { track.scrollTo({ left: destino * ancho(), behavior: suave && !vuelta ? "smooth" : "auto" }); }
    catch (e) { track.scrollLeft = destino * ancho(); }
    marcar(destino);
  }

  // El punto activo sigue al dedo mientras se desliza.
  track.addEventListener("scroll", () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const i = Math.round(track.scrollLeft / ancho());
      if (i !== idx && i >= 0 && i < n) marcar(i);
    });
  }, { passive: true });

  car.querySelector(".ccar-prev").addEventListener("click", () => { ir(idx - 1); reiniciar(); });
  car.querySelector(".ccar-next").addEventListener("click", () => { ir(idx + 1); reiniciar(); });
  dots.forEach((d, k) => d.addEventListener("click", () => { ir(k); reiniciar(); }));

  track.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { e.preventDefault(); ir(idx + 1); reiniciar(); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); ir(idx - 1); reiniciar(); }
  });

  // Si cambia el ancho (girar el teléfono) la foto vuelve a quedar alineada.
  window.addEventListener("resize", () => ir(idx, false));

  // ── Avance automático ──
  const quiereMenosMovimiento =
    window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function parar()    { clearInterval(timer); timer = null; }
  function arrancar() {
    parar();
    if (quiereMenosMovimiento || pausado || !visible || document.hidden) return;
    timer = setInterval(() => ir(idx + 1), CAROUSEL_MS);
  }
  function reiniciar() { arrancar(); }

  car.addEventListener("mouseenter", () => { pausado = true;  parar(); });
  car.addEventListener("mouseleave", () => { pausado = false; arrancar(); });
  car.addEventListener("focusin",    () => { pausado = true;  parar(); });
  car.addEventListener("focusout",   () => { pausado = false; arrancar(); });
  // Al tocar se detiene un rato: con el dedo encima no debe moverse sola.
  car.addEventListener("touchstart", () => { pausado = true; parar(); }, { passive: true });
  car.addEventListener("touchend",   () => { setTimeout(() => { pausado = false; arrancar(); }, 4000); }, { passive: true });
  document.addEventListener("visibilitychange", arrancar);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting; arrancar(); }, { threshold: 0.25 }).observe(car);
  }
  arrancar();
}
