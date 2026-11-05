// Función «whatsapp»: el WhatsApp del despacho (WhatsApp Business Cloud API de Meta).
//   GET  /whatsapp              verificación del webhook (hub.challenge)
//   POST /whatsapp              mensajes y estados que envía Meta (firma X-Hub-Signature-256)
//   POST /whatsapp/enviar       {conversacion, texto}   una persona del despacho contesta
//   POST /whatsapp/proponer     {conversacion}          vuelve a pedir a la IA una respuesta propuesta
// Nunca se da información de un asunto sin número + código verificados. Lo que sale solo, sale por una regla activa.
import { CORS, iguales, json, sql, subirArchivo, usuario } from "../_shared/bd.ts";
import { decidir } from "../_shared/conversacion.ts";
import { proponerRespuesta } from "../_shared/ia.ts";
import { extraerCodigo } from "../_shared/limites.ts";
import { textos } from "../_shared/textos.ts";
import { ultimas9 } from "../_shared/telefono.ts";
import { descargarMedia, enviarTexto, firmaValida, transcribir } from "../_shared/whatsapp.ts";
import { conversacion } from "../_shared/envio.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERIFICACION_MIN = 30;
const EXT: Record<string, string> = { "audio/ogg": "ogg", "audio/mpeg": "mp3", "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

type MsgMeta = { id: string; from: string; type: string; text?: { body: string }; audio?: { id: string }; voice?: { id: string };
  image?: { id: string; caption?: string }; document?: { id: string; filename?: string; caption?: string }; button?: { text: string } };

async function registrarSalida(despacho: string, conv: string, texto: string, waId: string | null, p: { auto?: boolean; regla?: string | null; por?: string | null; estado?: string; error?: string | null }) {
  await sql`insert into public.wa_mensajes (despacho_id, conversacion_id, direccion, tipo, texto, wa_id, estado, error, enviado_por, auto, regla_auto)
    values (${despacho}, ${conv}, 'salida', 'texto', ${texto}, ${waId}, ${p.estado ?? "enviado"}, ${p.error ?? null}, ${p.por ?? null}, ${p.auto ?? false}, ${p.regla ?? null})`;
  await sql`update public.wa_conversaciones set ultimo_mensaje_en = now() where id = ${conv}`;
}

async function procesarEntrante(phoneNumberId: string, m: MsgMeta, nombrePerfil: string | null) {
  const [num] = await sql`select despacho_id from public.wa_numeros where phone_number_id = ${phoneNumberId} and activo`;
  if (!num) return;
  const despacho: string = num.despacho_id;
  const from = String(m.from).replace(/\D/g, "");
  // Cliente por su número (últimas 9 cifras). Si hay varios con el mismo número, no se elige ninguno.
  const coincidencias = await sql`select id, idioma from public.clientes where despacho_id = ${despacho} and not eliminado
    and right(regexp_replace(coalesce(telefono, ''), '\\D', '', 'g'), 9) = ${ultimas9(from)} limit 2`;
  const cliente = coincidencias.length === 1 ? coincidencias[0] : null;
  const c = await conversacion(despacho, from, cliente?.id ?? null);
  const [asunto] = cliente ? await sql`select a.id from public.asunto_clientes ac join public.asuntos a on a.id = ac.asunto_id
    where ac.cliente_id = ${cliente.id} and not a.eliminado and a.situacion = 'abierto' order by a.fecha_apertura desc nulls last limit 1` : [];

  // Guardar el mensaje (los duplicados de Meta se ignoran por wa_id).
  let tipo = "otro", texto: string | null = null, mediaId: string | null = null;
  if (m.type === "text") { tipo = "texto"; texto = m.text?.body ?? ""; }
  else if (m.type === "button") { tipo = "texto"; texto = m.button?.text ?? ""; }
  else if (m.type === "audio" || m.type === "voice") { tipo = "audio"; mediaId = (m.audio ?? m.voice)?.id ?? null; }
  else if (m.type === "image") { tipo = "imagen"; mediaId = m.image?.id ?? null; texto = m.image?.caption ?? null; }
  else if (m.type === "document") { tipo = "documento"; mediaId = m.document?.id ?? null; texto = m.document?.caption ?? m.document?.filename ?? null; }
  const [fila] = await sql`insert into public.wa_mensajes (despacho_id, conversacion_id, direccion, tipo, texto, wa_id, estado, asunto_id)
    values (${despacho}, ${c.id}, 'entrada', ${tipo}, ${texto}, ${m.id}, 'recibido', ${asunto?.id ?? null})
    on conflict (wa_id) do nothing returning id`;
  if (!fila) return;
  await sql`update public.wa_conversaciones set ultimo_entrante_en = now(), ultimo_mensaje_en = now(), no_leidos = no_leidos + 1,
    nombre_perfil = coalesce(${nombrePerfil}, nombre_perfil) where id = ${c.id}`;

  // Adjuntos: se guardan en el asunto; las notas de voz se transcriben.
  if (mediaId) {
    try {
      const { datos, tipo: mime } = await descargarMedia(mediaId);
      const ruta = `${despacho}/${c.id}/${m.id}.${EXT[mime.split(";")[0]] ?? "bin"}`;
      await subirArchivo("whatsapp", ruta, datos, mime);
      const trans = tipo === "audio" ? await transcribir(datos, mime) : null;
      await sql`update public.wa_mensajes set media_path = ${ruta}, media_mime = ${mime}, transcripcion = ${trans} where id = ${fila.id}`;
      if (trans) texto = trans;
    } catch (e) {
      console.error("whatsapp media", e);
    }
  }
  if (!texto) return; // un adjunto sin texto: lo revisa el equipo

  // ¿Trae un código? Solo vale si es el del cliente de ESE número.
  const [d] = await sql`select nombre, envio_auto from public.despachos where id = ${despacho}`;
  let verificado = !!(c.verificada_hasta && new Date(c.verificada_hasta) > new Date() && c.verificado_cliente_id === cliente?.id);
  let valido = false, fallido = false;
  const codigo = cliente && !verificado ? extraerCodigo(texto) : null;
  if (cliente && codigo) {
    const [v] = await sql`select public.verificar_cliente(${despacho}, ${from}, ${codigo}, 'whatsapp') as id`;
    if (v.id === cliente.id) {
      valido = verificado = true;
      await sql`update public.wa_conversaciones set verificada_hasta = now() + make_interval(mins => ${VERIFICACION_MIN}), verificado_cliente_id = ${cliente.id} where id = ${c.id}`;
    } else fallido = true;
  }
  const [{ fallos }] = await sql`select count(*)::int as fallos from privado.intentos_codigo
    where despacho_id = ${despacho} and conversacion_id = ${"whatsapp:" + ultimas9(from)} and not ok and creado_en > now() - interval '1 hour'`;
  const decision = decidir({ texto, clienteId: cliente?.id ?? null, verificado, codigoRecienValidado: valido, codigoRecienFallido: fallido,
    bloqueado: fallos >= 3 && !valido, reglas: d.envio_auto ?? [], preguntaPendiente: false });

  const t = textos(cliente?.idioma);
  let respuesta = "";
  switch (decision.accion) {
    case "pedir_codigo": respuesta = t.pedirCodigo; break;
    case "codigo_mal": respuesta = t.codigoMal; break;
    case "bloqueado": respuesta = t.bloqueado; break;
    case "derivar_abogado": respuesta = t.derivar; break;
    case "acuse_consulta": respuesta = t.noCliente; break;
    case "responder_estado": {
      const [e] = await sql`select public.estado_aprobado_cliente(${cliente!.id}) as estado`;
      const lista = (e.estado ?? []) as { asunto: string; fase: string | null; ultima_novedad_idioma: string | null; fecha: string | null }[];
      respuesta = lista.length ? lista.slice(0, 3).map((x) => t.estado(x.asunto, x.fase, x.ultima_novedad_idioma, x.fecha)).join("\n\n") : t.sinNovedad;
      break;
    }
  }
  if (decision.accion !== "proponer" && decision.auto) {
    const final = `${respuesta}\n\n— ${t.soyIA(d.nombre)}`;
    try {
      const waId = await enviarTexto(phoneNumberId, from, final);
      await registrarSalida(despacho, c.id, final, waId, { auto: true, regla: decision.regla });
      await sql`update public.wa_conversaciones set propuesta = null, propuesta_motivo = null, propuesta_en = null where id = ${c.id}`;
    } catch (e) {
      await registrarSalida(despacho, c.id, final, null, { auto: true, regla: decision.regla, estado: "fallido", error: (e as Error).message });
    }
    return;
  }
  // No sale solo: queda una propuesta para que la envíe una persona.
  if (decision.accion === "proponer") {
    await proponer(c.id, despacho);
  } else {
    const motivo = decision.accion === "responder_estado" ? "Cliente verificado con su código: última novedad aprobada."
      : decision.accion === "derivar_abogado" ? "Pide consejo o un pronóstico: lo contesta su abogado."
      : decision.accion === "pedir_codigo" ? "Pregunta por su asunto sin haber confirmado su código."
      : "Respuesta estándar.";
    await sql`update public.wa_conversaciones set propuesta = ${respuesta}, propuesta_motivo = ${motivo}, propuesta_en = now() where id = ${c.id}`;
  }
}

async function proponer(conv: string, despacho: string) {
  const [c] = await sql`select c.*, cl.nombre as cliente, cl.idioma, d.nombre as despacho from public.wa_conversaciones c
    join public.despachos d on d.id = c.despacho_id left join public.clientes cl on cl.id = c.cliente_id where c.id = ${conv} and c.despacho_id = ${despacho}`;
  if (!c) return;
  const verificado = !!(c.verificada_hasta && new Date(c.verificada_hasta) > new Date());
  const hist = await sql`select direccion, coalesce(transcripcion, texto) as texto from public.wa_mensajes where conversacion_id = ${conv} and coalesce(transcripcion, texto) is not null order by creado_en desc limit 12`;
  const [e] = verificado && c.cliente_id ? await sql`select public.estado_aprobado_cliente(${c.cliente_id}) as estado` : [{ estado: null }];
  try {
    const p = await proponerRespuesta({ despacho: c.despacho, cliente: c.cliente, verificado, idioma: c.idioma ?? "es", aprobado: e.estado,
      historial: hist.reverse().map((h) => ({ quien: h.direccion === "entrada" ? "cliente" as const : "despacho" as const, texto: h.texto })) });
    await sql`update public.wa_conversaciones set propuesta = ${p.texto || null}, propuesta_motivo = ${p.motivo}, propuesta_en = now() where id = ${conv}`;
  } catch (e) {
    await sql`update public.wa_conversaciones set propuesta = null, propuesta_motivo = ${"La IA no ha podido proponer una respuesta: " + (e as Error).message}, propuesta_en = now() where id = ${conv}`;
  }
}

export async function manejar(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const partes = url.pathname.split("/").filter(Boolean);
  const ruta = partes[partes.indexOf("whatsapp") + 1] ?? "";
  try {
    // Verificación del webhook al darlo de alta en Meta.
    if (req.method === "GET" && !ruta) {
      const token = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
      const recibido = url.searchParams.get("hub.verify_token") ?? "";
      if (url.searchParams.get("hub.mode") === "subscribe" && token && iguales(recibido, token)) {
        return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
      }
      return new Response("no autorizado", { status: 403 });
    }
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

    // Eventos de Meta.
    if (!ruta) {
      const cuerpo = await req.text();
      if (!(await firmaValida(cuerpo, req.headers.get("x-hub-signature-256")))) return json({ error: "Firma no válida" }, 401);
      const ev = JSON.parse(cuerpo);
      const trabajo = (async () => {
        for (const entrada of ev.entry ?? []) for (const cambio of entrada.changes ?? []) {
          const v = cambio.value ?? {};
          const pid = v.metadata?.phone_number_id;
          for (const s of v.statuses ?? []) {
            const estado = { sent: "enviado", delivered: "entregado", read: "leido", failed: "fallido" }[s.status as string];
            if (!estado) continue;
            const [w] = await sql`update public.wa_mensajes set estado = ${estado}, error = ${s.errors?.[0]?.title ?? null} where wa_id = ${s.id} returning mensaje_id`;
            if (w?.mensaje_id && estado === "entregado") await sql`update public.mensajes set entregado_en = now() where id = ${w.mensaje_id} and entregado_en is null`;
            if (w?.mensaje_id && estado === "leido") await sql`update public.mensajes set leido_en = now() where id = ${w.mensaje_id} and leido_en is null`;
          }
          for (const m of v.messages ?? []) {
            try { await procesarEntrante(pid, m, v.contacts?.[0]?.profile?.name ?? null); } catch (e) { console.error("whatsapp entrante", e); }
          }
        }
      })();
      // Meta exige responder enseguida: el trabajo sigue en segundo plano.
      if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(trabajo); else await trabajo;
      return json({ ok: true });
    }

    const u = await usuario(req);
    if (!u) return json({ error: "Inicia sesión para continuar." }, 401);
    const b = await req.json().catch(() => ({}));
    if (!UUID.test(String(b.conversacion ?? ""))) return json({ error: "Conversación no válida." }, 400);
    const [c] = await sql`select c.*, n.phone_number_id from public.wa_conversaciones c
      left join public.wa_numeros n on n.despacho_id = c.despacho_id and n.activo where c.id = ${String(b.conversacion)} and c.despacho_id = ${u.despacho}`;
    if (!c) return json({ error: "Conversación no encontrada." }, 404);

    if (ruta === "enviar") {
      const texto = String(b.texto ?? "").trim().slice(0, 4000);
      if (!texto) return json({ error: "Escribe la respuesta." }, 400);
      if (!c.phone_number_id) return json({ error: "El WhatsApp del despacho no está conectado." }, 409);
      if (!c.ultimo_entrante_en || Date.now() - new Date(c.ultimo_entrante_en).getTime() > 24 * 3600e3) {
        return json({ error: "Han pasado más de 24 horas desde el último mensaje del cliente. WhatsApp solo deja escribirle con un aviso aprobado (plantilla)." }, 409);
      }
      try {
        const waId = await enviarTexto(c.phone_number_id, c.telefono, texto);
        await registrarSalida(u.despacho, c.id, texto, waId, { por: u.id });
        await sql`update public.wa_conversaciones set propuesta = null, propuesta_motivo = null, propuesta_en = null, no_leidos = 0 where id = ${c.id}`;
        return json({ ok: true });
      } catch (e) {
        return json({ error: (e as Error).message }, 502);
      }
    }
    if (ruta === "proponer") {
      await proponer(c.id, u.despacho);
      const [r] = await sql`select propuesta, propuesta_motivo from public.wa_conversaciones where id = ${c.id}`;
      return json({ ok: true, ...r });
    }
    return json({ error: "Ruta no encontrada" }, 404);
  } catch (e) {
    console.error("whatsapp", ruta, e);
    return json({ error: "Error interno" }, 500);
  }
}

if (import.meta.main) Deno.serve(manejar);
