// Teléfonos en formato internacional sin «+» (como los usa WhatsApp): 34600111222.
export function normalizarTelefono(t: string | null | undefined, prefijo = "34"): string | null {
  if (!t) return null;
  let d = String(t).replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.length === 9) d = prefijo + d;
  return /^\d{8,15}$/.test(d) ? d : null;
}

/** Últimas 9 cifras: así se compara el número de WhatsApp con el de la ficha, venga con prefijo o sin él. */
export const ultimas9 = (t: string | null | undefined) => String(t ?? "").replace(/\D/g, "").slice(-9);
