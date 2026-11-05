// Función «buzon»: recibe los correos reenviados a <identificador>@entrada.<dominio> (Resend, evento email.received),
// guarda cada PDF adjunto como notificación del despacho y la procesa en segundo plano.
import { json, sql } from "../_shared/bd.ts";
import { adjuntosRecibidos, firmaResendValida } from "../_shared/correo.ts";
import { procesarNotificacion, registrarPdf } from "../_shared/procesar.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
const DOMINIO = (Deno.env.get("BUFETEA_DOMINIO") ?? "").trim().toLowerCase();

function despachoDe(destinos: string[]): string | null {
  for (const d of destinos) {
    const m = String(d).toLowerCase().match(/<?([a-z0-9._-]+)@entrada\.([a-z0-9.-]+)>?/);
    if (m && (!DOMINIO || m[2] === DOMINIO)) return m[1];
  }
  return null;
}

export async function manejar(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const cuerpo = await req.text();
  if (!(await firmaResendValida(cuerpo, req.headers))) return json({ error: "Firma no válida" }, 401);
  try {
    const ev = JSON.parse(cuerpo);
    if (ev.type !== "email.received") return json({ ok: true, ignorado: ev.type });
    const datos = ev.data ?? {};
    const slug = despachoDe([...(datos.to ?? []), ...(datos.cc ?? [])]);
    const [d] = slug ? await sql`select id from public.despachos where slug = ${slug} and estado <> 'cancelado'` : [];
    if (!d) return json({ ok: true, ignorado: "buzón desconocido" });
    const pdfs = (await adjuntosRecibidos(datos.email_id)).filter((a) => /pdf/i.test(a.content_type) || /\.pdf$/i.test(a.filename));
    const ids: string[] = [];
    for (const a of pdfs.slice(0, 10)) {
      const r = await fetch(a.download_url);
      if (!r.ok) continue;
      const bytes = new Uint8Array(await r.arrayBuffer());
      if (bytes.length > 20 * 1024 * 1024 || String.fromCharCode(...bytes.subarray(0, 5)) !== "%PDF-") continue;
      const { id, nueva } = await registrarPdf({ despacho: d.id, datos: bytes, nombre: a.filename, origen: "buzon", remitente: String(datos.from ?? "").slice(0, 200), asuntoCorreo: String(datos.subject ?? "").slice(0, 300) });
      if (nueva) ids.push(id);
    }
    const trabajo = (async () => { for (const id of ids) await procesarNotificacion(id); })();
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(trabajo); else await trabajo;
    return json({ ok: true, recibidas: ids.length });
  } catch (e) {
    console.error("buzon", e);
    return json({ error: "Error interno" }, 500);
  }
}

if (import.meta.main) Deno.serve(manejar);
