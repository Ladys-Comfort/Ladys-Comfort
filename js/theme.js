// =====================================================
// THEME — Ladys Comfort
// Se ejecuta ANTES de que el navegador pinte nada
// para evitar el parpadeo de tema al cargar.
// =====================================================

(function () {
  var saved = null;
  try { saved = localStorage.getItem("lc_theme"); } catch (e) {}

  // Sin preferencia guardada seguimos la del sistema operativo.
  var theme = saved === "dark" || saved === "light"
    ? saved
    : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", theme);

  // Marca que hay JS: sin esta clase el contenido animado se muestra
  // directamente, en vez de quedar invisible si algo falla.
  document.documentElement.classList.add("js");
})();

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem("lc_theme", theme); } catch (e) {}
  updateThemeIcons();
  updateThemeColorMeta();
}

function toggleTheme() {
  var current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
}

function updateThemeIcons() {
  var isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    var sun  = btn.querySelector(".icon-sun");
    var moon = btn.querySelector(".icon-moon");
    if (sun)  sun.style.display  = isDark ? "none"  : "block";
    if (moon) moon.style.display = isDark ? "block" : "none";
    var label = isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
    btn.title = label;
    btn.setAttribute("aria-label", label);
  });
}

// Tiñe la barra del navegador en móvil con el color del tema.
function updateThemeColorMeta() {
  var isDark = document.documentElement.getAttribute("data-theme") === "dark";
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = isDark ? "#0a080c" : "#faf4f7";
}

// Si el usuario nunca eligió tema, seguimos los cambios del sistema en vivo.
if (window.matchMedia) {
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var onSystemChange = function (e) {
    var saved = null;
    try { saved = localStorage.getItem("lc_theme"); } catch (err) {}
    if (saved) return;
    document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    updateThemeIcons();
    updateThemeColorMeta();
  };
  if (mq.addEventListener) mq.addEventListener("change", onSystemChange);
  else if (mq.addListener) mq.addListener(onSystemChange);
}

document.addEventListener("DOMContentLoaded", function () {
  updateThemeIcons();
  updateThemeColorMeta();
});

// ── Red de seguridad del contenido ────────────────
// El CSS oculta los elementos .anim y es ui.js quien los revela. Si ui.js
// falla —o ni siquiera lo parsea un Safari antiguo— la página se queda en
// blanco. Esto va aquí a propósito: theme.js es ES5, se carga en el <head>
// y se ejecuta siempre, así que no puede caer por el mismo motivo.
setTimeout(function () {
  // Si ui.js hizo su trabajo, no tocamos nada: se conserva la animación.
  if (document.documentElement.className.indexOf("reveal-ready") !== -1) return;
  var els = document.querySelectorAll(".anim");
  for (var i = 0; i < els.length; i++) els[i].className += " visible";
}, 3000);
