// Función «mensajes»: aprobar y enviar avisos al cliente (email o WhatsApp), traducirlos y preparar mensajes.
//   POST /mensajes/aprobar       {id, titulo?, cuerpo?, cuerpo_es?, destinatario?, enviarAhora?}   (abogado o titular)
//   POST /mensajes/guardar       {id, titulo?, cuerpo?, cuerpo_es?, destinatario?}                  (cualquiera del equipo)
//   POST /mensajes/traducir      {id, idioma?}                                                       (cualquiera del equipo)
//   POST /mensajes/sin-noticias  {asunto_id}                                                         (cualquiera del equipo)
//   POST /mensajes/cron          (pg_cron) envía los programados que toquen y propone recordatorios
import { CORS, esCron, json, sql, usuario } from "../_shared/bd.ts";
import { emailValido } from "../_shared/correo.ts";
import { enviarMensaje } from "../_shared/envio.ts";
import { mensajeSinNoticias, traducir } from "../_shared/ia.ts";
import { normalizarTelefono } from "../_shared/telefono.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const texto = (v: unknown, max: number) => (v == null ? null : String(v).trim().slice(0, max));

async function editable(id: unknown, despacho: string) {
  if (!UUID.test(String(id ?? ""))) return null;
  const [m] = await sql`select * from public.mensajes where id = ${String(id)} and despacho_id = ${despacho}`;
  return m && ["borrador", "error"].includes(m.estado) ? m : m ? "cerrado" : null;
}

function destinoValido(canal: string, dest: string | null) {
  return canal === "email" ? emailValido(dest) : !!normalizarTelefono(dest);
}

export async function manejar(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const partes = new URL(req.url).pathname.split("/").filter(Boolean);
  const ruta = partes[partes.indexOf("mensajes") + 1] ?? "";
  try {
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

    if (ruta === "cron") {
      if (!(await esCron(req))) return json({ error: "no autorizado" }, 401);
      await sql`update public.mensajes set estado = 'programado' where estado = 'enviando' and actualizado_en < now() - interval '10 minutes'`;
      let propuestos = 0;
      for (const d of await sql`select id from public.despachos where estado <> 'cancelado'`) {
        const [r] = await sql`select public.proponer_recordatorios(${d.id}) as n`;
        propuestos += Number(r.n) || 0;
      }
      const pendientes = await sql`select id from public.mensajes where estado = 'programado' and programado_para <= now() order by programado_para limit 50`;
      let enviados = 0, errores = 0;
      for (const m of pendientes) (await enviarMensaje(m.id)).ok ? enviados++ : errores++;
      return json({ ok: true, propuestos, enviados, errores });
    }

    const u = await usuario(req);
    if (!u) return json({ error: "Inicia sesión para continuar." }, 401);
    const b = await req.json().catch(() => ({}));

    if (ruta === "aprobar" || ruta === "guardar") {
      if (ruta === "aprobar" && u.rol === "administrativo") return json({ error: "Este mensaje lo tiene que aprobar un abogado del despacho." }, 403);
      const m = await editable(b.id, u.despacho);
      if (!m) return json({ error: "Mensaje no encontrado." }, 404);
      if (m === "cerrado") return json({ error: "Este mensaje ya está aprobado o enviado." }, 409);
      const titulo = texto(b.titulo, 200) ?? m.titulo;
      const cuerpo = texto(b.cuerpo, 10000) ?? m.cuerpo;
      const cuerpoEs = b.cuerpo_es !== undefined ? texto(b.cuerpo_es, 10000) : m.cuerpo_es;
      const dest = texto(b.destinatario, 200) ?? m.destinatario;
      if (!cuerpo) return json({ error: "El mensaje está vacío." }, 400);
      if (ruta === "guardar") {
        await sql`update public.mensajes set titulo = ${titulo}, cuerpo = ${cuerpo}, cuerpo_es = ${cuerpoEs}, destinatario = ${dest}, actualizado_en = now() where id = ${m.id}`;
        return json({ ok: true, estado: "borrador" });
      }
      if (!destinoValido(m.canal, dest)) return json({ error: m.canal === "email" ? "Escribe un email válido para el cliente." : "Escribe un móvil válido para el cliente." }, 400);
      const ahora = b.enviarAhora === true || !m.programado_para || new Date(m.programado_para).getTime() <= Date.now();
      await sql`update public.mensajes set titulo = ${titulo}, cuerpo = ${cuerpo}, cuerpo_es = ${cuerpoEs}, destinatario = ${dest}, estado = 'programado',
        programado_para = ${ahora ? new Date().toISOString() : m.programado_para}, aprobado_por = ${u.id}, aprobado_en = now(), auto = false, regla_auto = null,
        error = null, actualizado_en = now() where id = ${m.id} and estado in ('borrador', 'error')`;
      if (!ahora) return json({ ok: true, estado: "programado", programado_para: m.programado_para });
      const r = await enviarMensaje(m.id);
      return r.ok ? json({ ok: true, estado: "enviado" }) : json({ error: r.error }, 502);
    }

    if (ruta === "traducir") {
      const m = await editable(b.id, u.despacho);
      if (!m || m === "cerrado") return json({ error: "Solo se traducen borradores." }, 409);
      const idioma = /^[a-z]{2,3}$/.test(String(b.idioma ?? "")) ? String(b.idioma) : m.idioma;
      const origen = texto(b.cuerpo_es, 10000) ?? m.cuerpo_es ?? m.cuerpo;
      const traducido = await traducir(origen, idioma);
      await sql`update public.mensajes set idioma = ${idioma}, cuerpo_es = ${origen}, cuerpo = ${traducido}, actualizado_en = now() where id = ${m.id}`;
      return json({ ok: true, cuerpo: traducido, idioma });
    }

    if (ruta === "sin-noticias") {
      if (!UUID.test(String(b.asunto_id ?? ""))) return json({ error: "Asunto no válido." }, 400);
      const [a] = await sql`select a.id, a.descripcion, a.numero, a.fase_cliente, c.id as cliente_id, c.nombre, c.idioma, c.canal, c.email, c.telefono,
          coalesce(d.firma, d.nombre) as firma,
          floor(extract(epoch from now() - coalesce((select max(m.enviado_en) from public.mensajes m where m.asunto_id = a.id and m.estado = 'enviado'), a.fecha_apertura::timestamptz, a.creado_en)) / 86400)::int as dias
        from public.asuntos a join public.clientes c on c.id = a.cliente_id join public.despachos d on d.id = a.despacho_id
        where a.id = ${String(b.asunto_id)} and a.despacho_id = ${u.despacho}`;
      if (!a) return json({ error: "Asunto no encontrado." }, 404);
      const [ya] = await sql`select id from public.mensajes where asunto_id = ${a.id} and tipo = 'sin_noticias' and estado = 'borrador'`;
      if (ya) return json({ ok: true, id: ya.id });
      const es = await mensajeSinNoticias({ despacho: a.firma, cliente: a.nombre, asunto: a.descripcion ?? a.numero ?? "su asunto", fase: a.fase_cliente, dias: a.dias });
      const canal = a.canal === "whatsapp" && normalizarTelefono(a.telefono) ? "whatsapp" : a.email ? "email" : "whatsapp";
      const cuerpo = a.idioma === "es" ? es : await traducir(es, a.idioma).catch(() => es);
      const [m] = await sql`insert into public.mensajes (despacho_id, asunto_id, cliente_id, tipo, canal, idioma, destinatario, titulo, cuerpo, cuerpo_es, estado, creado_por)
        values (${u.despacho}, ${a.id}, ${a.cliente_id}, 'sin_noticias', ${canal}, ${a.idioma}, ${canal === "whatsapp" ? normalizarTelefono(a.telefono) : a.email},
                'Cómo va su asunto', ${cuerpo}, ${es}, 'borrador', ${u.id}) returning id`;
      return json({ ok: true, id: m.id });
    }
    return json({ error: "Ruta no encontrada" }, 404);
  } catch (e) {
    console.error("mensajes", ruta, e);
    const msg = String((e as Error).message ?? "");
    if (msg.startsWith("LIMITE:")) return json({ error: msg.replace("LIMITE: ", "") }, 403);
    return json({ error: "Error interno. Inténtalo de nuevo en unos minutos." }, 500);
  }
}

if (import.meta.main) Deno.serve(manejar);
