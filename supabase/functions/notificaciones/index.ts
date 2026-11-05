// Función «notificaciones»: subir el PDF de una notificación desde la app y volver a procesarla.
//   POST /notificaciones/subir      multipart: archivo (PDF), asunto_id?   (cualquier persona del despacho)
//   POST /notificaciones/procesar   {id}                                    (tras asignarla a un asunto, o para reintentar)
import { CORS, json, sql, usuario } from "../_shared/bd.ts";
import { procesarNotificacion, registrarPdf } from "../_shared/procesar.ts";

const MAX = 20 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function manejar(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const partes = new URL(req.url).pathname.split("/").filter(Boolean);
  const ruta = partes[partes.indexOf("notificaciones") + 1] ?? "";
  try {
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
    const u = await usuario(req);
    if (!u) return json({ error: "Inicia sesión para continuar." }, 401);

    if (ruta === "subir") {
      const f = await req.formData();
      const archivo = f.get("archivo");
      if (!(archivo instanceof File)) return json({ error: "Adjunta el PDF de la notificación." }, 400);
      if (archivo.size > MAX) return json({ error: "El PDF ocupa más de 20 MB." }, 400);
      const datos = new Uint8Array(await archivo.arrayBuffer());
      if (String.fromCharCode(...datos.subarray(0, 5)) !== "%PDF-") return json({ error: "El archivo no es un PDF." }, 400);
      const asunto = String(f.get("asunto_id") ?? "");
      if (asunto && (!UUID.test(asunto) || !(await sql`select 1 from public.asuntos where id = ${asunto} and despacho_id = ${u.despacho}`).length)) {
        return json({ error: "Asunto no válido." }, 400);
      }
      const { id, nueva } = await registrarPdf({ despacho: u.despacho, datos, nombre: archivo.name || "notificacion.pdf", origen: "subida", asunto: asunto || null });
      if (nueva) await procesarNotificacion(id);
      return json({ ok: true, id, nueva });
    }

    if (ruta === "procesar") {
      const b = await req.json().catch(() => ({}));
      const id = String(b.id ?? "");
      if (!UUID.test(id)) return json({ error: "Notificación no válida." }, 400);
      const [n] = await sql`select estado from public.notificaciones where id = ${id} and despacho_id = ${u.despacho}`;
      if (!n) return json({ error: "Notificación no encontrada." }, 404);
      if (!["lista", "error", "recibida"].includes(n.estado)) return json({ error: "Esta notificación ya se ha resuelto." }, 409);
      await procesarNotificacion(id);
      return json({ ok: true });
    }
    return json({ error: "Ruta no encontrada" }, 404);
  } catch (e) {
    console.error("notificaciones", ruta, e);
    return json({ error: "Error interno. Inténtalo de nuevo en unos minutos." }, 500);
  }
}

if (import.meta.main) Deno.serve(manejar);
