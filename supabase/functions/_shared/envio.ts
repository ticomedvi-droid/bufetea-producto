// Envío de un mensaje ya aprobado (o permitido por una regla automática) por email o WhatsApp.
// La base de datos (mensajes_control) vuelve a comprobar que tiene aprobación o regla antes de dejarlo pasar.
import { sql } from "./bd.ts";
import { enviarCorreo } from "./correo.ts";
import { traducir } from "./ia.ts";
import { textos } from "./textos.ts";
import { normalizarTelefono } from "./telefono.ts";
import { enviarPlantilla, enviarTexto, IDIOMA_PLANTILLA } from "./whatsapp.ts";

const PLANTILLA = Deno.env.get("WHATSAPP_PLANTILLA_AVISO") ?? "bufetea_aviso";

/** Conversación de WhatsApp de un número (la crea si no existe). */
export async function conversacion(despacho: string, telefono: string, clienteId: string | null) {
  const [c] = await sql`insert into public.wa_conversaciones (despacho_id, telefono, cliente_id) values (${despacho}, ${telefono}, ${clienteId})
    on conflict (despacho_id, telefono) do update set cliente_id = coalesce(public.wa_conversaciones.cliente_id, excluded.cliente_id)
    returning *`;
  return c;
}

export async function enviarMensaje(id: string): Promise<{ ok: boolean; error?: string }> {
  const [m] = await sql`update public.mensajes set estado = 'enviando', actualizado_en = now()
    where id = ${id} and estado = 'programado' returning *`;
  if (!m) return { ok: false, error: "El mensaje ya se ha enviado o no está aprobado." };
  try {
    const [d] = await sql`select d.nombre, coalesce(d.firma, d.nombre) as firma, d.email_respuesta,
        (select coalesce(p.nombre, p.email) from public.perfiles p where p.id = ${m.aprobado_por}::uuid) as aprobador,
        (select u.email from auth.users u where u.id = coalesce(${m.aprobado_por}::uuid,
          (select p.id from public.perfiles p where p.despacho_id = d.id and p.rol = 'admin' and p.activo limit 1))) as email_aprobador
      from public.despachos d where d.id = ${m.despacho_id}`;
    const t = textos(m.idioma);
    // Los avisos automáticos se escriben en español: se traducen al idioma del cliente al salir.
    let cuerpo: string = m.cuerpo;
    if (m.idioma !== "es" && (!m.cuerpo_es || m.cuerpo === m.cuerpo_es)) {
      cuerpo = await traducir(m.cuerpo_es ?? m.cuerpo, m.idioma).catch(() => m.cuerpo);
      await sql`update public.mensajes set cuerpo_es = coalesce(cuerpo_es, cuerpo), cuerpo = ${cuerpo} where id = ${m.id}`;
    }
    const pie = m.auto || !m.aprobado_por ? t.pieAuto(d.nombre) : t.pieAprobado(d.aprobador ?? "su abogado", d.nombre);
    let proveedorId: string | null = null;
    if (m.canal === "email") {
      proveedorId = await enviarCorreo({ idempotencia: `bufetea-${m.id}`, despacho: d.nombre, para: m.destinatario, asunto: m.titulo || `Novedades de ${d.nombre}`,
        texto: cuerpo, pie, responderA: d.email_respuesta ?? d.email_aprobador });
    } else {
      const [n] = await sql`select phone_number_id from public.wa_numeros where despacho_id = ${m.despacho_id} and activo limit 1`;
      if (!n) throw new Error("El despacho no tiene todavía su WhatsApp conectado.");
      const para = normalizarTelefono(m.destinatario);
      if (!para) throw new Error("El cliente no tiene un móvil válido.");
      const c = await conversacion(m.despacho_id, para, m.cliente_id);
      const dentro = c.ultimo_entrante_en && Date.now() - new Date(c.ultimo_entrante_en).getTime() < 23.5 * 3600e3;
      const texto = `${cuerpo}\n\n— ${pie}`;
      proveedorId = dentro
        ? await enviarTexto(n.phone_number_id, para, texto)
        : await enviarPlantilla(n.phone_number_id, para, PLANTILLA, IDIOMA_PLANTILLA[m.idioma] ?? "es", [d.nombre, texto]);
      await sql`insert into public.wa_mensajes (despacho_id, conversacion_id, direccion, tipo, texto, wa_id, estado, enviado_por, auto, regla_auto, mensaje_id, asunto_id)
        values (${m.despacho_id}, ${c.id}, 'salida', ${dentro ? "texto" : "plantilla"}, ${texto}, ${proveedorId}, 'enviado', ${m.aprobado_por}, ${m.auto}, ${m.regla_auto}, ${m.id}, ${m.asunto_id})`;
      await sql`update public.wa_conversaciones set ultimo_mensaje_en = now() where id = ${c.id}`;
    }
    await sql`update public.mensajes set estado = 'enviado', enviado_en = now(), proveedor_id = ${proveedorId}, error = null, actualizado_en = now() where id = ${m.id}`;
    if (m.fase_cliente && m.asunto_id) await sql`update public.asuntos set fase_cliente = ${m.fase_cliente} where id = ${m.asunto_id}`;
    if (m.notificacion_id) {
      const [n] = await sql`update public.notificaciones set estado = 'enviada', revisada_por = ${m.aprobado_por}, revisada_en = now()
        where id = ${m.notificacion_id} returning senalamiento_en, senalamiento_lugar, tipo_resolucion, asunto_id`;
      // Señalamiento: queda en la agenda del asunto para que salgan los recordatorios de la semana antes y la víspera.
      if (n?.senalamiento_en && n.asunto_id) {
        await sql`insert into public.agenda (despacho_id, origen, asunto_id, titulo, lugar, inicio, fin)
          select ${m.despacho_id}, 'bufetea', ${n.asunto_id}, 'Juicio o vista', ${n.senalamiento_lugar}, ${n.senalamiento_en}, ${n.senalamiento_en}::timestamptz + interval '1 hour'
          where not exists (select 1 from public.agenda e where e.asunto_id = ${n.asunto_id} and e.inicio = ${n.senalamiento_en} and not e.eliminado)`;
      }
    }
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300);
    await sql`update public.mensajes set estado = 'error', error = ${msg}, actualizado_en = now() where id = ${m.id}`;
    return { ok: false, error: msg };
  }
}
