// IA de Bufetea: Claude (Anthropic), llamado solo desde las funciones del servidor. Nunca desde el navegador.
// Sin ANTHROPIC_API_KEY, todo sigue funcionando con la lectura determinista de lexnet.ts y plantillas fijas,
// marcado como «sin IA» para que el abogado lo sepa.
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { LIMITES_IA, textoSeguro } from "./limites.ts";
import * as lexnet from "./lexnet.ts";
import { finDePlazo } from "./plazos.ts";

const CLAVE = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
export const MODELO = Deno.env.get("BUFETEA_IA_MODELO") ?? "claude-opus-5-5";
export const hayIA = () => CLAVE.length > 0;
const cliente = () => new Anthropic({ apiKey: CLAVE, maxRetries: 2, timeout: 120_000 });

export const IDIOMAS: Record<string, string> = {
  es: "español de España", en: "inglés", ro: "rumano", fr: "francés", ar: "árabe", zh: "chino simplificado", de: "alemán", it: "italiano",
  pt: "portugués", ca: "catalán", uk: "ucraniano", ru: "ruso", pl: "polaco", bg: "búlgaro", nl: "neerlandés",
};

async function pedirJSON<T>(sistema: string, contenido: Anthropic.Beta.BetaContentBlockParam[], schema: Record<string, unknown>, esfuerzo: "low" | "medium" = "medium"): Promise<T> {
  const r = await cliente().beta.messages.create({
    model: MODELO,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: esfuerzo, format: { type: "json_schema", schema } },
    system: `${LIMITES_IA}\n\n${sistema}`,
    messages: [{ role: "user", content: contenido }],
  });
  if (r.stop_reason === "refusal") throw new Error("La IA no ha podido procesar este contenido.");
  if (r.stop_reason === "max_tokens") throw new Error("La respuesta de la IA ha quedado incompleta.");
  const texto = r.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return JSON.parse(texto) as T;
}

const nullable = (type: string) => ({ type: [type, "null"] });

// ---------- Notificaciones explicadas ----------
export type Interpretacion = {
  tipo_resolucion: string | null; organo: string | null; procedimiento: string | null; fecha_resolucion: string | null;
  lo_que_dice: string; resumen: string;
  plazo: { hay: boolean; tipo: string | null; descripcion: string | null; dias: number | null; habiles: boolean; corre_para_cliente: boolean; fecha: string | null };
  senalamiento: { fecha: string; hora: string | null; lugar: string | null } | null;
  cliente_debe_actuar: boolean; accion_cliente: string | null; fase_cliente: string;
  mensaje_es: string; mensaje_idioma: string | null; ia: string;
};

const ESQUEMA_NOTIFICACION = {
  type: "object", additionalProperties: false,
  required: ["tipo_resolucion", "organo", "procedimiento", "fecha_resolucion", "lo_que_dice", "resumen", "plazo", "senalamiento",
    "cliente_debe_actuar", "accion_cliente", "fase_cliente", "mensaje_es", "mensaje_idioma"],
  properties: {
    tipo_resolucion: nullable("string"), organo: nullable("string"), procedimiento: nullable("string"),
    fecha_resolucion: { ...nullable("string"), description: "AAAA-MM-DD" },
    lo_que_dice: { type: "string", description: "Fragmento literal y breve de la parte dispositiva, copiado del documento" },
    resumen: { type: "string", description: "Para el abogado: qué ha pasado, qué plazo corre y si el cliente tiene que hacer algo. 2-3 frases." },
    plazo: {
      type: "object", additionalProperties: false, required: ["hay", "tipo", "descripcion", "dias", "habiles", "corre_para_cliente"],
      properties: { hay: { type: "boolean" }, tipo: nullable("string"), descripcion: nullable("string"), dias: nullable("integer"), habiles: { type: "boolean" }, corre_para_cliente: { type: "boolean" } },
    },
    senalamiento: {
      anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, required: ["fecha", "hora", "lugar"],
        properties: { fecha: { type: "string", description: "AAAA-MM-DD" }, hora: { ...nullable("string"), description: "HH:MM" }, lugar: nullable("string") } }],
    },
    cliente_debe_actuar: { type: "boolean" }, accion_cliente: nullable("string"),
    fase_cliente: { type: "string", description: "Fase del procedimiento en 2-5 palabras sencillas, p. ej. «Demanda admitida»" },
    mensaje_es: { type: "string", description: "Mensaje para el cliente en español de España, sin tecnicismos, 2-5 frases, empieza saludando por su nombre" },
    mensaje_idioma: { ...nullable("string"), description: "El mismo mensaje en el idioma del cliente, o null si es español" },
  },
};

type Contexto = { cliente: string | null; idioma: string; asunto: string | null; fase: string | null; despacho: string; recibida: string };

export async function interpretarNotificacion(texto: string, pdfBase64: string | null, ctx: Contexto): Promise<Interpretacion> {
  if (!hayIA()) return sinIA(texto, ctx);
  const idioma = IDIOMAS[ctx.idioma] ?? ctx.idioma;
  const sistema = `Eres el asistente de un despacho de abogados en España. Lees notificaciones judiciales (normalmente de LexNET) y preparas:
1) un resumen técnico y breve para el abogado; 2) un mensaje para el cliente sin tecnicismos.
El mensaje al cliente explica qué ha pasado y si tiene que hacer algo. No valora ni pronostica, no da consejos y no inventa nada que no esté en el documento.
Si un plazo corre para la otra parte, dilo así («la otra parte tiene 20 días para contestar»), sin alarmar. Firma como el despacho, no como una persona.`;
  const contexto = `Despacho: ${ctx.despacho}\nCliente: ${ctx.cliente ?? "(sin asignar)"}\nAsunto: ${ctx.asunto ?? "(sin asignar)"}\nFase actual: ${ctx.fase ?? "(sin indicar)"}\nIdioma del cliente: ${idioma}\nFecha de recepción: ${ctx.recibida}`;
  const contenido: Anthropic.Beta.BetaContentBlockParam[] = pdfBase64
    ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } }, { type: "text", text: contexto }]
    : [{ type: "text", text: `${contexto}\n\nTexto de la notificación:\n<documento>\n${texto.slice(0, 120000)}\n</documento>` }];
  const r = await pedirJSON<Omit<Interpretacion, "ia" | "plazo"> & { plazo: Omit<Interpretacion["plazo"], "fecha"> }>(sistema, contenido, ESQUEMA_NOTIFICACION);
  for (const m of [r.mensaje_es, r.mensaje_idioma]) if (m && !textoSeguro(m)) throw new Error("El borrador de la IA no cumplía los límites; se ha descartado.");
  return { ...r, plazo: { ...r.plazo, fecha: calcularFecha(r.plazo, r.fecha_resolucion, ctx.recibida) }, ia: MODELO };
}

function calcularFecha(p: { hay: boolean; dias: number | null; habiles: boolean }, fechaResolucion: string | null, recibida: string): string | null {
  if (!p.hay || !p.dias) return null;
  const desde = (recibida || fechaResolucion || new Date().toISOString()).slice(0, 10);
  if (p.habiles) return finDePlazo(desde, p.dias);
  const d = new Date(desde + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + p.dias); return d.toISOString().slice(0, 10);
}

/** Sin IA: lectura determinista y un mensaje prudente que el abogado completa antes de aprobar. */
export function sinIA(texto: string, ctx: Contexto): Interpretacion {
  const tipo = lexnet.tipoResolucion(texto);
  const pl = lexnet.plazo(texto);
  const se = lexnet.senalamiento(texto);
  const nombre = (ctx.cliente ?? "").split(" ")[0];
  const quePasa = se ? `el juzgado ha fijado una fecha: el ${se.fecha.split("-").reverse().join("/")}${se.hora ? ` a las ${se.hora}` : ""}` : `hemos recibido ${tipo ? `un ${tipo.toLowerCase()}` : "una notificación"} del juzgado sobre su asunto`;
  const fecha = lexnet.fechaResolucion(texto);
  return {
    tipo_resolucion: tipo, organo: lexnet.organo(texto), procedimiento: lexnet.procedimientos(texto)[0] ?? null, fecha_resolucion: fecha,
    lo_que_dice: lexnet.extracto(texto),
    resumen: `${tipo ?? "Notificación"} recibida${pl ? `. Menciona un plazo de ${pl.dias} días${pl.habiles ? " hábiles" : ""}` : ""}${se ? `. Señalamiento el ${se.fecha}${se.hora ? ` a las ${se.hora}` : ""}` : ""}. Resumen automático sin IA: revísalo antes de aprobar.`,
    plazo: { hay: !!pl, tipo: pl ? "Plazo mencionado en la resolución" : null, descripcion: pl?.frase ?? null, dias: pl?.dias ?? null, habiles: pl?.habiles ?? true, corre_para_cliente: false,
      fecha: pl ? calcularFecha({ hay: true, dias: pl.dias, habiles: pl.habiles }, fecha, ctx.recibida) : null },
    senalamiento: se ? { fecha: se.fecha, hora: se.hora, lugar: null } : null,
    cliente_debe_actuar: false, accion_cliente: null, fase_cliente: ctx.fase ?? (tipo ?? "Notificación recibida"),
    mensaje_es: `Hola${nombre ? `, ${nombre}` : ""}. Le escribimos para contarle que ${quePasa}. Por ahora usted no tiene que hacer nada; si necesitamos algo, se lo diremos.\n\nUn saludo,\n${ctx.despacho}`,
    mensaje_idioma: null, ia: "sin IA",
  };
}

// ---------- Traducción y redacción ----------
export async function traducir(texto: string, idioma: string): Promise<string> {
  if (idioma === "es" || !hayIA()) return texto;
  const r = await pedirJSON<{ traduccion: string }>(
    `Traduce al ${IDIOMAS[idioma] ?? idioma} el mensaje de un despacho de abogados a su cliente. Mantén el tono cercano y sencillo, los nombres, fechas e importes. No añadas nada.`,
    [{ type: "text", text: `<mensaje>\n${texto}\n</mensaje>` }],
    { type: "object", additionalProperties: false, required: ["traduccion"], properties: { traduccion: { type: "string" } } }, "low");
  return r.traduccion;
}

/** Propuesta de respuesta para la bandeja de WhatsApp. La envía siempre una persona. */
export async function proponerRespuesta(p: { despacho: string; cliente: string | null; verificado: boolean; idioma: string; historial: { quien: "cliente" | "despacho"; texto: string }[]; aprobado: unknown }): Promise<{ texto: string; motivo: string }> {
  if (!hayIA()) return { texto: "", motivo: "Sin IA configurada: escribe la respuesta." };
  const r = await pedirJSON<{ respuesta: string; motivo: string }>(
    `Propones respuestas de WhatsApp para el equipo de ${p.despacho}; las revisa y envía una persona. Respuestas breves, amables y en ${IDIOMAS[p.idioma] ?? p.idioma}.
${p.verificado ? "El cliente ha confirmado su código: puedes usar SOLO la información aprobada que se te da." : "El cliente NO ha confirmado su código: no hables de ningún asunto ni des datos; si pregunta por su asunto, pídele el código de 6 cifras."}
Si pide consejo o un pronóstico, responde que se lo contestará su abogado. Si pide una cita o envía documentos, agradécelo y di que el despacho lo revisa.`,
    [{ type: "text", text: `Cliente: ${p.cliente ?? "número desconocido"}\nInformación aprobada: ${JSON.stringify(p.aprobado ?? null)}\n\nConversación (lo último al final):\n${p.historial.slice(-12).map((m) => `${m.quien}: ${m.texto}`).join("\n")}` }],
    { type: "object", additionalProperties: false, required: ["respuesta", "motivo"], properties: { respuesta: { type: "string" }, motivo: { type: "string", description: "Por qué propones esto, en una frase para el equipo" } } }, "low");
  if (!textoSeguro(r.respuesta)) return { texto: "", motivo: "La propuesta de la IA no cumplía los límites; escribe la respuesta tú." };
  return { texto: r.respuesta, motivo: r.motivo };
}

/** Mensaje para un cliente que lleva tiempo sin noticias: solo lo ya aprobado, sin novedades inventadas. */
export async function mensajeSinNoticias(p: { despacho: string; cliente: string; asunto: string; fase: string | null; dias: number }): Promise<string> {
  const nombre = p.cliente.split(" ")[0];
  const base = `Hola, ${nombre}. Le escribimos para contarle cómo va su asunto «${p.asunto}».${p.fase ? ` Ahora mismo está en la fase «${p.fase}».` : ""} Estos procedimientos tienen tiempos de espera en el juzgado: en cuanto haya una novedad, se la contamos. Si tiene cualquier duda, responda a este mensaje.\n\nUn saludo,\n${p.despacho}`;
  if (!hayIA()) return base;
  const r = await pedirJSON<{ mensaje: string }>(
    `Redactas un mensaje breve y cercano de un despacho a un cliente que lleva ${p.dias} días sin noticias de su asunto. No hay novedades nuevas: no inventes ninguna, no des plazos ni pronósticos. Español de España, sin tecnicismos, 3-4 frases, firma como el despacho.`,
    [{ type: "text", text: `Despacho: ${p.despacho}\nCliente: ${p.cliente}\nAsunto: ${p.asunto}\nFase actual: ${p.fase ?? "(sin indicar)"}\nBase orientativa:\n${base}` }],
    { type: "object", additionalProperties: false, required: ["mensaje"], properties: { mensaje: { type: "string" } } }, "low");
  return textoSeguro(r.mensaje) ? r.mensaje : base;
}
