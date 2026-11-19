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
