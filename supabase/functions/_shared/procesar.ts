// Procesa una notificación: lee el PDF, la asocia a su asunto, la interpreta (IA o lectura determinista)
// y deja el mensaje para el cliente en «Por aprobar». Nunca envía nada.
import { extractText, getDocumentProxy } from "npm:unpdf@1.9.1";
import { base64, bajarArchivo, sql, sha256, subirArchivo } from "./bd.ts";
import { interpretarNotificacion, sinIA, type Interpretacion } from "./ia.ts";
import { procedimientos } from "./lexnet.ts";
import { normalizarTelefono } from "./telefono.ts";

export async function textoDePdf(datos: Uint8Array): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(datos));
    const { text } = await extractText(pdf, { mergePages: true });
    return String(text ?? "").replace(/\u0000/g, "").trim();
  } catch {
    return "";
  }
}

/** Guarda un PDF nuevo y crea su notificación. Si ya se había recibido el mismo PDF, devuelve la existente. */
export async function registrarPdf(p: { despacho: string; datos: Uint8Array; nombre: string; origen: "buzon" | "subida"; remitente?: string | null; asuntoCorreo?: string | null; asunto?: string | null }): Promise<{ id: string; nueva: boolean }> {
  const hash = await sha256(p.datos);
  const [ya] = await sql`select id from public.notificaciones where despacho_id = ${p.despacho} and archivo_hash = ${hash}`;
  if (ya) return { id: ya.id, nueva: false };
  const ruta = `${p.despacho}/${new Date().toISOString().slice(0, 7)}/${hash.slice(0, 32)}.pdf`;
  await subirArchivo("notificaciones", ruta, p.datos, "application/pdf");
  const [n] = await sql`insert into public.notificaciones (despacho_id, asunto_id, origen, remitente, asunto_correo, archivo_path, archivo_nombre, archivo_hash)
    values (${p.despacho}, ${p.asunto ?? null}, ${p.origen}, ${p.remitente ?? null}, ${p.asuntoCorreo ?? null}, ${ruta}, ${p.nombre.slice(0, 200)}, ${hash})
    on conflict (despacho_id, archivo_hash) where archivo_hash is not null do update set archivo_nombre = excluded.archivo_nombre
    returning id, (xmax = 0) as nueva`;
  return { id: n.id, nueva: n.nueva };
}

async function asociarAsunto(despacho: string, texto: string): Promise<string | null> {
  for (const proc of procedimientos(texto).slice(0, 6)) {
    const [a] = await sql`select id from public.asuntos where despacho_id = ${despacho} and not eliminado
      and (procedimiento = ${proc} or numero = ${proc} or regexp_replace(coalesce(procedimiento, ''), '^0+', '') = ${proc})
      order by (situacion = 'abierto') desc, fecha_apertura desc nulls last limit 1`;
    if (a) return a.id;
  }
  return null;
}

export async function procesarNotificacion(id: string): Promise<void> {
  const [n] = await sql`update public.notificaciones set estado = 'interpretando', error = null
    where id = ${id} and estado in ('recibida', 'error', 'lista') returning *`;
  if (!n) return;
  try {
    const [d] = await sql`select nombre, coalesce(firma, nombre) as firma from public.despachos where id = ${n.despacho_id}`;
    const pdf = n.archivo_path ? await bajarArchivo("notificaciones", n.archivo_path) : null;
    const texto: string = n.texto ?? (pdf ? await textoDePdf(pdf) : "");
    const asuntoId: string | null = n.asunto_id ?? (await asociarAsunto(n.despacho_id, texto));
    const [a] = asuntoId ? await sql`select a.id, a.descripcion, a.fase_cliente, a.informar, a.situacion,
        c.id as cliente_id, c.nombre as cliente, c.idioma, c.canal, c.email, c.telefono
      from public.asuntos a left join public.clientes c on c.id = a.cliente_id and not c.eliminado
      where a.id = ${asuntoId}` : [null];
    const ctx = { cliente: a?.cliente ?? null, idioma: a?.idioma ?? "es", asunto: a?.descripcion ?? null, fase: a?.fase_cliente ?? null, despacho: d.firma, recibida: new Date(n.creada_en).toISOString() };
    let r: Interpretacion;
    let aviso: string | null = null;
    try {
      // Si el PDF es una imagen escaneada (casi sin texto), se le pasa el PDF entero al modelo.
      r = await interpretarNotificacion(texto, texto.length < 300 && pdf ? base64(pdf) : null, ctx);
    } catch (e) {
      aviso = `La IA no ha podido interpretarla (${(e as Error).message}). Resumen automático: revísalo.`;
      r = sinIA(texto, ctx);
    }
    await sql`update public.notificaciones set
        estado = 'lista', asunto_id = ${asuntoId}, texto = ${texto.slice(0, 200000)}, error = ${aviso},
        tipo_resolucion = ${r.tipo_resolucion}, organo = ${r.organo}, procedimiento = ${r.procedimiento},
        fecha_resolucion = ${r.fecha_resolucion && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha_resolucion) ? r.fecha_resolucion : null},
        lo_que_dice = ${r.lo_que_dice}, resumen = ${r.resumen},
        plazo_tipo = ${r.plazo.hay ? r.plazo.tipo : null}, plazo_descripcion = ${r.plazo.hay ? r.plazo.descripcion : null},
        plazo_dias = ${r.plazo.hay ? r.plazo.dias : null}, plazo_fecha = ${r.plazo.fecha},
        senalamiento_en = ${r.senalamiento ? `${r.senalamiento.fecha}T${r.senalamiento.hora ?? "09:00"}:00` : null},
        senalamiento_lugar = ${r.senalamiento?.lugar ?? null},
        cliente_debe_actuar = ${r.cliente_debe_actuar}, accion_cliente = ${r.accion_cliente}, fase_sugerida = ${r.fase_cliente},
        ia = ${r.ia}, procesada_en = now()
      where id = ${id}`;
    if (r.senalamiento) {
      // La hora se interpreta en Madrid.
      await sql`update public.notificaciones set senalamiento_en = (${`${r.senalamiento.fecha} ${r.senalamiento.hora ?? "09:00"}`}::timestamp at time zone 'Europe/Madrid') where id = ${id}`;
    }
    // Borrador para el cliente: solo si el asunto está asignado, tiene cliente y el despacho informa de él.
    await sql`update public.mensajes set estado = 'cancelado', actualizado_en = now() where notificacion_id = ${id} and estado in ('borrador', 'error')`;
    if (a && a.cliente_id && a.informar && a.situacion === "abierto") {
      const canal = a.canal === "whatsapp" && normalizarTelefono(a.telefono) ? "whatsapp" : a.email ? "email" : "whatsapp";
      const destino = canal === "whatsapp" ? normalizarTelefono(a.telefono) : a.email;
      await sql`insert into public.mensajes (despacho_id, asunto_id, cliente_id, notificacion_id, tipo, canal, idioma, destinatario, titulo, cuerpo, cuerpo_es, fase_cliente, estado)
        values (${n.despacho_id}, ${a.id}, ${a.cliente_id}, ${id}, 'novedad', ${canal}, ${a.idioma ?? "es"}, ${destino},
                ${r.fase_cliente || r.tipo_resolucion || "Novedades de su asunto"}, ${r.mensaje_idioma || r.mensaje_es}, ${r.mensaje_es}, ${r.fase_cliente}, 'borrador')`;
    }
  } catch (e) {
    console.error("procesarNotificacion", id, e);
    await sql`update public.notificaciones set estado = 'error', error = ${(e as Error).message.slice(0, 300)} where id = ${id}`;
  }
}
