// =====================================================
// OFERTAS — Ladys Comfort
// Descuentos y combos. Los dos viven en la colección `products`, así que no
// hace falta ninguna regla nueva en Firebase.
//
//  · Descuento: un pijama con `isOffer` y `offerPrice` (menor que `price`).
//  · Combo:     un producto con `isCombo: true`. `price` es el precio del combo
//               completo; el resto es opcional:
//                 comboQty           cuántas pijamas incluye (mínimo 2)
//                 comboIncludes      texto: "Camisa + short + pantalón"
//                 comboRegularPrice  lo que costarían por separado (para mostrar
//                                    cuánto se ahorra)
//
// Nada se muestra como oferta hasta que la propietaria lo marca en el admin.
// =====================================================

const isCombo = p => !!p && p.isCombo === true;

/** Descuento "normal": un pijama suelto con precio de oferta real. */
const hasDiscount = p =>
  !!p && !isCombo(p) && !!p.isOffer && Number(p.offerPrice) > 0 && Number(p.offerPrice) < Number(p.price);

const comboQtyOf = p => Math.max(2, parseInt(p && p.comboQty, 10) || 2);

/** Lo que paga la clienta. */
const payPrice = p => (p && p.isOffer && p.offerPrice ? Number(p.offerPrice) : Number(p && p.price)) || 0;

/**
 * Ahorro real {regular, saved, pct}, o null si no hay.
 *  · Descuento: el precio normal frente al de oferta.
 *  · Combo: lo que costaría por separado frente al precio del combo.
 */
function savingsOf(p) {
  if (!p) return null;
  const pay = payPrice(p);
  const regular = isCombo(p)
    ? Number(p.comboRegularPrice) || 0
    : (p.isOffer && p.offerPrice ? Number(p.price) || 0 : 0);
  if (!regular || regular <= pay) return null;
  return { regular, saved: regular - pay, pct: Math.round((1 - pay / regular) * 100) };
}

// ── Combos armados con pijamas distintas ──────────
// Un combo puede tener `comboItems`: las pijamas que lo forman, cada una con las
// fotos que la propietaria quiso mostrar. Es opcional; se guarda el nombre y las
// fotos dentro del propio combo para que siga viéndose igual aunque después se
// edite o se borre la pijama original.
//   comboItems: [{ id, name, images: [url, ...] }, ...]

const comboItemsOf = p =>
  (isCombo(p) && Array.isArray(p.comboItems) ? p.comboItems : []).filter(it => it && typeof it === "object");

/** Sólo http(s): las URLs vienen de la base de datos. */
const comboItemImgs = it =>
  (Array.isArray(it && it.images) ? it.images : []).filter(u => typeof u === "string" && /^https?:\/\//i.test(u));

/** Fotos propias del combo + las elegidas de cada pijama, sin repetir. */
function comboGallery(p) {
  const own = (Array.isArray(p.images) ? p.images : []).filter(Boolean);
  return [...new Set([...own, ...comboItemsOf(p).flatMap(comboItemImgs)])];
}

/** "A + B + C": lo que escribió la propietaria o, si no, los nombres de las pijamas. */
const comboIncludesText = p =>
  (p && p.comboIncludes && String(p.comboIncludes).trim()) ||
  comboItemsOf(p).map(i => i.name).filter(Boolean).join(" + ");

/** Todas las fotos de un producto; en un combo, también las de sus pijamas. */
const galleryOf = p => isCombo(p) ? comboGallery(p) : (Array.isArray(p.images) ? p.images.filter(Boolean) : []);
