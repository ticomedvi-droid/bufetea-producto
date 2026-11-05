// Lectura de notificaciones judiciales sin IA: número de procedimiento, órgano, tipo de resolución, plazo y señalamiento.
// Sirve para asociar el PDF a su asunto y como respaldo si la IA no está configurada o falla.

const NUMEROS: Record<string, number> = {
  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, "dieciséis": 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, treinta: 30, cuarenta: 40, sesenta: 60,
};
const MESES: Record<string, number> = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };

const limpio = (t: string) => t.replace(/\s+/g, " ").trim();

/** Números de procedimiento («412/2026») que aparecen junto a las palabras habituales. El primero es el más probable. */
export function procedimientos(texto: string): string[] {
  const t = limpio(texto);
  const res: string[] = [];
  const re = /(?:procedimiento|autos|juicio [a-záéíóú ]{3,40}?|ejecuci[oó]n [a-záéíóú ]{0,30}?|recurso [a-záéíóú ]{0,30}?|rollo|diligencias (?:previas|urgentes)|despido|monitorio|verbal|ordinario|ETJ|PO|JV|DP|N\.?º|n[uú]m(?:ero)?\.?)\s*(?:n[º°o.]*\s*)?(\d{1,6})\s*\/\s*(\d{4})/gi;
  for (const m of t.matchAll(re)) res.push(`${Number(m[1])}/${m[2]}`);
  for (const m of t.matchAll(/\b(\d{1,6})\s*\/\s*(20\d{2})\b/g)) res.push(`${Number(m[1])}/${m[2]}`);
  return [...new Set(res)];
}

export function nig(texto: string): string | null {
  const m = limpio(texto).match(/N\.?\s?I\.?\s?G\.?\s*:?\s*([0-9A-Z]{5}\s?[0-9A-Z]{2}\s?[0-9A-Z]\s?[0-9]{4}\s?[0-9]{7})/i);
  return m ? m[1].replace(/\s/g, "") : null;
}

export function organo(texto: string): string | null {
  const linea = (texto ?? "").split(/\r?\n/).map((l) => l.trim()).find((l) => /^(JUZGADO|TRIBUNAL|AUDIENCIA|SALA)\b/i.test(l));
  if (linea) return linea.replace(/[.,;]+$/, "").slice(0, 160);
  const m = limpio(texto).match(/((?:JUZGADO|TRIBUNAL|AUDIENCIA|SALA)\b.{5,140}?)(?=\s+(?:Procedimiento|Autos|N\.?\s?I\.?\s?G|DECRETO|AUTO|SENTENCIA|DILIGENCIA|PROVIDENCIA|C[ÉE]DULA)\b|[.;]|$)/i);
  return m ? limpio(m[1]).slice(0, 160) : null;
}

const TIPOS = ["Sentencia", "Auto", "Decreto", "Diligencia de ordenación", "Providencia", "Cédula de citación", "Cédula de emplazamiento", "Requerimiento", "Mandamiento"];
export function tipoResolucion(texto: string): string | null {
  const t = limpio(texto).toLowerCase();
  let mejor: { tipo: string; pos: number } | null = null;
  for (const tipo of TIPOS) {
    const pos = t.indexOf(tipo.toLowerCase());
    if (pos >= 0 && (!mejor || pos < mejor.pos)) mejor = { tipo, pos };
  }
  return mejor?.tipo ?? null;
}

/** Primer plazo en días que se menciona: «plazo de veinte días hábiles», «en el plazo de 5 días», «diez (10) días». */
export function plazo(texto: string): { dias: number; habiles: boolean; frase: string } | null {
  const t = limpio(texto);
  const re = /(?:plazo|t[eé]rmino)\s+(?:improrrogable\s+)?de\s+([a-záéíóú]+|\d{1,3})(?:\s*\((\d{1,3})\))?\s+d[ií]as(\s+h[aá]biles)?/i;
  const m = t.match(re);
  if (!m) return null;
  const n = m[2] ? Number(m[2]) : /^\d+$/.test(m[1]) ? Number(m[1]) : NUMEROS[m[1].toLowerCase()];
  if (!n) return null;
  return { dias: n, habiles: !!m[3] || !/naturales/i.test(t.slice(m.index ?? 0, (m.index ?? 0) + 80)), frase: m[0] };
}

/** Señalamiento de vista o juicio: «el día 14 de enero de 2027, a las 10:20 horas». Hora de Madrid. */
export function senalamiento(texto: string): { fecha: string; hora: string | null } | null {
  const t = limpio(texto);
  const m = t.match(/(?:se\s+señala|señalad[oa]|señalamiento|se\s+cita|citad[oa]s?\s+para|comparecer|celebraci[oó]n\s+de)[^.]{0,120}?(?:d[ií]a\s+)?(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})(?:[^.]{0,30}?(?:a\s+las\s+)?(\d{1,2})[:.,](\d{2})\s*(?:h|horas)?)?/i);
  if (!m || !MESES[m[2].toLowerCase()]) return null;
  const fecha = `${m[3]}-${String(MESES[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return { fecha, hora: m[4] ? `${m[4].padStart(2, "0")}:${m[5]}` : null };
}

/** Fecha de la resolución («En Valencia, a 3 de noviembre de 2026»). */
export function fechaResolucion(texto: string): string | null {
  const m = limpio(texto).match(/a\s+(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/i);
  if (!m || !MESES[m[2].toLowerCase()]) return null;
  return `${m[3]}-${String(MESES[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** Un extracto del texto de la parte dispositiva (lo que «dice el juzgado»), sin cabeceras. */
export function extracto(texto: string, max = 700): string {
  const t = limpio(texto);
  const i = t.search(/(ACUERDO|DISPONGO|FALLO|PARTE DISPOSITIVA|SE ACUERDA|Se admite|Dese traslado|Se tiene por|Se señala)/i);
  const base = i >= 0 ? t.slice(i) : t;
  return base.length > max ? base.slice(0, max).replace(/\s+\S*$/, "") + "…" : base;
}
