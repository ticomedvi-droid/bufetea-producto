// Conexión directa a la base de datos desde las funciones del servidor (como propietario: sin RLS, filtrar SIEMPRE por despacho).
import postgres from "npm:postgres@3.4.5";

export const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 3, idle_timeout: 20 });
export const SUPA = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
const SERVICIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
export const json = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

/** Persona que llama, a partir de su sesión de Supabase. */
export async function usuario(req: Request): Promise<{ id: string; despacho: string; rol: string; nombre: string } | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const r = await fetch(`${SUPA}/auth/v1/user`, { headers: { Authorization: auth, apikey: req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "" } });
  if (!r.ok) return null;
  const u = await r.json();
  if (!u?.id) return null;
  const [p] = await sql`select despacho_id, rol, coalesce(nombre, email) as nombre from public.perfiles where id = ${u.id} and activo`;
  return p ? { id: u.id, despacho: p.despacho_id, rol: p.rol, nombre: p.nombre } : null;
}

/** Llamadas internas (pg_cron): secreto en el almacén de Supabase. */
export async function esCron(req: Request) {
  const [s] = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'bufetea_cron_secret' limit 1`;
  const h = req.headers.get("x-cron-secret") ?? "";
  return !!s?.decrypted_secret && h.length === s.decrypted_secret.length && iguales(h, s.decrypted_secret);
}

export function iguales(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// ---------- Almacenamiento (Storage) ----------
export async function subirArchivo(bucket: string, ruta: string, datos: Uint8Array, tipo: string) {
  const r = await fetch(`${SUPA}/storage/v1/object/${bucket}/${ruta}`, {
    method: "POST", headers: { Authorization: `Bearer ${SERVICIO}`, apikey: SERVICIO, "Content-Type": tipo, "x-upsert": "false" }, body: datos as unknown as BodyInit,
  });
  if (!r.ok && r.status !== 409) throw new Error(`No se ha podido guardar el archivo (${r.status})`);
}
export async function bajarArchivo(bucket: string, ruta: string): Promise<Uint8Array> {
  const r = await fetch(`${SUPA}/storage/v1/object/${bucket}/${ruta}`, { headers: { Authorization: `Bearer ${SERVICIO}`, apikey: SERVICIO } });
  if (!r.ok) throw new Error(`No se ha podido leer el archivo (${r.status})`);
  return new Uint8Array(await r.arrayBuffer());
}

export async function sha256(datos: Uint8Array) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", datos as unknown as BufferSource));
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function base64(datos: Uint8Array) {
  let s = "";
  for (let i = 0; i < datos.length; i += 0x8000) s += String.fromCharCode(...datos.subarray(i, i + 0x8000));
  return btoa(s);
}
