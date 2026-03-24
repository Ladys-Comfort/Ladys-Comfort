// ── Ejecuta ANTES de que el navegador pinte nada ──
(function () {
  var saved = localStorage.getItem("lc_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
})();

function toggleTheme() {
  var current = document.documentElement.getAttribute("data-theme");
  var next    = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("lc_theme", next);
  updateThemeIcons();
}

function updateThemeIcons() {
  var isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.querySelectorAll(".theme-toggle").forEach(function(btn) {
    var sun  = btn.querySelector(".icon-sun");
    var moon = btn.querySelector(".icon-moon");
    if (sun)  sun.style.display  = isDark ? "none"  : "block";
    if (moon) moon.style.display = isDark ? "block" : "none";
    btn.title = isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
  });
}

document.addEventListener("DOMContentLoaded", updateThemeIcons);
