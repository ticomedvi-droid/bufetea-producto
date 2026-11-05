// Configuración pública. El dominio de Bufetea es una variable: al comprarlo basta con cambiar NEXT_PUBLIC_BUFETEA_DOMINIO.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
export const DOMINIO = (process.env.NEXT_PUBLIC_BUFETEA_DOMINIO ?? "").trim().toLowerCase();

/** Modo demostración: datos ficticios, sin Supabase. Se activa a propósito o si falta la configuración de Supabase. */
export const MODO_DEMO = process.env.NEXT_PUBLIC_BUFETEA_DEMO === "1" || !SUPABASE_URL || !SUPABASE_KEY;

/** Direcciones que dependen del dominio. Devuelven null mientras no haya dominio. */
export function direcciones(slug: string | null | undefined) {
  if (!DOMINIO || !slug) return { buzon: null, remitente: null, portal: null };
  return {
    buzon: `${slug}@entrada.${DOMINIO}`,
    remitente: `avisos@${DOMINIO}`,
    portal: `https://portal.${DOMINIO}/${slug}`,
  };
}

export const VERSION_ART28 = "v1";
