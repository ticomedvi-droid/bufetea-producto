// Cómputo orientativo de plazos procesales en días hábiles (art. 133 LEC y art. 182 LOPJ).
// Inhábiles: sábados, domingos, 24 y 31 de diciembre, todo agosto y festivos nacionales.
// No conoce los festivos autonómicos ni locales: por eso en pantalla siempre dice «se valida en tu programa».

function pascua(anio: number): Date {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anio, mes - 1, dia));
}

const clave = (d: Date) => d.toISOString().slice(0, 10);

export function festivosNacionales(anio: number): Set<string> {
  const fijos = ["01-01", "01-06", "05-01", "08-15", "10-12", "11-01", "12-06", "12-08", "12-25"].map((md) => `${anio}-${md}`);
  const viernesSanto = new Date(pascua(anio).getTime() - 2 * 864e5);
  return new Set([...fijos, clave(viernesSanto)]);
}

export function esHabil(d: Date, penal = false): boolean {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  const md = clave(d).slice(5);
  if (md === "12-24" || md === "12-31") return false;
  if (!penal && d.getUTCMonth() === 7) return false; // agosto, salvo instrucción penal
  return !festivosNacionales(d.getUTCFullYear()).has(clave(d));
}

/** Último día del plazo: empieza a contar el día hábil siguiente a la notificación. Fecha en formato AAAA-MM-DD. */
export function finDePlazo(notificacion: string, dias: number, penal = false): string {
  const d = new Date(notificacion.slice(0, 10) + "T00:00:00Z");
  let n = 0;
  while (n < dias) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (esHabil(d, penal)) n++;
  }
  return clave(d);
}
