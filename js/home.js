// =====================================================
// HOME — Ladys Comfort
// El inicio no muestra fotos de producto: sólo trae de
// Firestore las cifras reales del catálogo para que los
// números del hero nunca queden desactualizados a mano.
// =====================================================

const HOME_SIZES = ["S", "M", "L", "XL"];
const homeStock  = (p, s) => Number(p?.sizes?.[s]) || 0;

async function loadHomeStats() {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  try {
    const snap = await db.collection("products").get();
    const all  = snap.docs.map(d => d.data());

    // Sólo cuentan los que realmente se pueden comprar.
    const conStock = all.filter(p => HOME_SIZES.some(s => homeStock(p, s) > 0));
    const tallas   = HOME_SIZES.filter(s => all.some(p => homeStock(p, s) > 0));

    set("stat-productos", conStock.length || all.length);
    set("stat-tallas", tallas.length || 4);
  } catch {
    // Sin conexión dejamos un valor honesto en vez de un guión.
    set("stat-productos", "20+");
  }
}

document.addEventListener("DOMContentLoaded", loadHomeStats);
