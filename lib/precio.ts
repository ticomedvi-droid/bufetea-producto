// Cálculo del importe del mes: el mismo que la calculadora de la web (web-referencia/v4.js) y que la función SQL calcular_importe.
// Los precios llegan siempre de las tablas planes y extras (cargadas desde docs/comercial.py); aquí no hay ninguno escrito.

export type Plan = {
  id: string;
  nombre: string;
  precio_mes: number;
  precio_anio: number;
  asuntos_incluidos: number;
  exceso_asunto: number;
  incluye: string[];
};
export type Extra = { id: string; nombre: string; subtitulo?: string | null; precio_mes: number; desde?: boolean };
export type Facturacion = "mensual" | "anual";

export type Estimacion = {
  plan: string;
  facturacion: Facturacion;
  base: number;
  asuntos: number;
  incluidos: number;
  adicionales: number;
  exceso: number;
  importe_adicional: number;
  extras: { extra: string; nombre: string; incluido: boolean; importe: number }[];
  importe_extras: number;
  total: number;
};

const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export function calcularImporte(
  plan: Plan,
  facturacion: Facturacion,
  asuntos: number,
  extras: Extra[] = [],
  pactados: Record<string, number> = {},
): Estimacion {
  const base = facturacion === "anual" ? plan.precio_anio / 12 : plan.precio_mes;
  const adicionales = Math.max(0, Math.round(asuntos) - plan.asuntos_incluidos);
  const importeAdicional = adicionales * plan.exceso_asunto;
  const lineas = extras.map((e) => {
    const incluido = plan.incluye.includes(e.id);
    const importe = incluido ? 0 : (pactados[e.id] ?? e.precio_mes);
    return { extra: e.id, nombre: e.nombre, incluido, importe: r2(importe) };
  });
  const importeExtras = lineas.reduce((s, l) => s + l.importe, 0);
  return {
    plan: plan.id,
    facturacion,
    base: r2(base),
    asuntos: Math.max(0, Math.round(asuntos)),
    incluidos: plan.asuntos_incluidos,
    adicionales,
    exceso: plan.exceso_asunto,
    importe_adicional: r2(importeAdicional),
    extras: lineas,
    importe_extras: r2(importeExtras),
    total: r2(base + importeAdicional + importeExtras),
  };
}

/** Formato español, como en la web: 49 → «49 €», 0.4 → «0,40 €», 1490 → «1.490 €», 99.5 → «99,50 €». */
export function eur(x: number, decimales?: number) {
  const d = decimales ?? (Number.isInteger(x) ? 0 : 2);
  const [ent, dec] = Math.abs(x).toFixed(d).split(".");
  const miles = ent.length >= 4 ? ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ent;
  return `${x < 0 ? "-" : ""}${miles}${dec ? "," + dec : ""} €`;
}

export function precioExtra(e: Pick<Extra, "precio_mes" | "desde">, pactado?: number | null) {
  return `${e.desde && pactado == null ? "desde " : ""}${eur(pactado ?? e.precio_mes)}/mes`;
}
