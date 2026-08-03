// =====================================================
// UI — Ladys Comfort
// Comportamientos compartidos por index y catálogo:
// navbar, menú móvil, animaciones de scroll y volver arriba.
// =====================================================

// ── Navbar ────────────────────────────────────────
function initNavbar() {
  const navbar   = document.getElementById("navbar");
  const toggle   = document.getElementById("menu-toggle");
  const backdrop = document.getElementById("nav-backdrop");
  if (!navbar) return;

  const closeNav = () => {
    navbar.classList.remove("nav-open");
    backdrop?.classList.remove("show");
    toggle?.setAttribute("aria-expanded", "false");
    unlockScroll();
  };

  const openNav = () => {
    navbar.classList.add("nav-open");
    backdrop?.classList.add("show");
    toggle?.setAttribute("aria-expanded", "true");
    lockScroll();
  };

  toggle?.addEventListener("click", () =>
    navbar.classList.contains("nav-open") ? closeNav() : openNav()
  );

  backdrop?.addEventListener("click", closeNav);

  document.querySelectorAll(".nav-links .nav-link").forEach(a =>
    a.addEventListener("click", closeNav)
  );

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && navbar.classList.contains("nav-open")) closeNav();
  });

  // Al pasar a escritorio el menú móvil deja de tener sentido.
  window.matchMedia("(min-width: 769px)").addEventListener("change", e => {
    if (e.matches && navbar.classList.contains("nav-open")) closeNav();
  });
}

// ── Scroll: navbar compacto + botón volver arriba ──
function initScrollEffects() {
  const navbar = document.getElementById("navbar");
  const toTop  = document.getElementById("to-top");
  let ticking  = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      navbar?.classList.toggle("scrolled", y > 50);
      toTop?.classList.toggle("show", y > 600);
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toTop?.addEventListener("click", () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  });
}

// ── Animaciones de entrada ────────────────────────
function initReveal() {
  const items = document.querySelectorAll(".anim");
  if (!items.length) return;

  // Sin soporte, o si el usuario pidió menos movimiento, mostramos todo de una.
  if (!("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach(el => el.classList.add("visible"));
    return;
  }

  let reporto = false;

  const observer = new IntersectionObserver(
    (entries, obs) =>
      entries.forEach(e => {
        reporto = true;
        if (!e.isIntersecting) return;
        e.target.classList.add("visible");
        obs.unobserve(e.target);      // una sola vez por elemento
      }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  items.forEach(el => observer.observe(el));

  // Red de seguridad: si el observer nunca reporta, mostramos todo.
  // Perder la animación es aceptable; dejar la página en blanco no.
  setTimeout(() => {
    if (reporto) return;
    observer.disconnect();
    items.forEach(el => el.classList.add("visible"));
  }, 1500);
}

// ── Init ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initScrollEffects();
  initReveal();
});
