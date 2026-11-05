// WhatsApp Business Cloud API (Meta). Funciona igual en modo de pruebas que en producción: lo que cambia es el número
// (wa_numeros.phone_number_id), el token y, en pruebas, que solo se puede escribir a los números de prueba dados de alta en Meta.
const VERSION = Deno.env.get("WHATSAPP_API_VERSION") ?? "v23.0";
const TOKEN = () => Deno.env.get("WHATSAPP_TOKEN") ?? "";
const GRAPH = `https://graph.facebook.com/${VERSION}`;

export const hayWhatsApp = () => TOKEN().length > 0;

async function llamar(ruta: string, cuerpo: unknown) {
  if (!hayWhatsApp()) throw new Error("WhatsApp no está configurado todavía (falta WHATSAPP_TOKEN).");
  const r = await fetch(`${GRAPH}/${ruta}`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = j?.error;
    // 131047: fuera de la ventana de 24 h; 131030: número no permitido en modo de pruebas; 132001: plantilla inexistente.
    const motivo = e?.code === 131047 ? "Han pasado más de 24 horas desde el último mensaje del cliente: hay que usar una plantilla aprobada."
      : e?.code === 131030 ? "En modo de pruebas de Meta solo se puede escribir a los números de prueba dados de alta."
      : e?.code === 132001 ? "La plantilla de WhatsApp no existe o no está aprobada en ese idioma."
      : e?.message ?? `Error de WhatsApp (${r.status})`;
    throw new Error(motivo);
  }
  return j as { messages?: { id: string }[] };
}

export async function enviarTexto(phoneNumberId: string, para: string, texto: string) {
  const j = await llamar(`${phoneNumberId}/messages`, { messaging_product: "whatsapp", to: para, type: "text", text: { body: texto.slice(0, 4096), preview_url: false } });
  return j.messages?.[0]?.id ?? null;
}

/** Plantilla aprobada (fuera de la ventana de 24 h). Los parámetros no pueden llevar saltos de línea. */
export async function enviarPlantilla(phoneNumberId: string, para: string, nombre: string, idioma: string, parametros: string[]) {
  const limpio = (t: string) => t.replace(/\s*\n+\s*/g, " · ").replace(/\s{4,}/g, "   ").slice(0, 1000);
  const j = await llamar(`${phoneNumberId}/messages`, {
    messaging_product: "whatsapp", to: para, type: "template",
    template: { name: nombre, language: { code: idioma }, components: parametros.length ? [{ type: "body", parameters: parametros.map((p) => ({ type: "text", text: limpio(p) })) }] : [] },
  });
  return j.messages?.[0]?.id ?? null;
}

/** Códigos de idioma de las plantillas de Meta. */
export const IDIOMA_PLANTILLA: Record<string, string> = { es: "es", en: "en", fr: "fr", ro: "ro", ar: "ar", zh: "zh_CN", de: "de", it: "it", pt: "pt_PT", ca: "ca" };

export async function descargarMedia(mediaId: string): Promise<{ datos: Uint8Array; tipo: string }> {
  const r1 = await fetch(`${GRAPH}/${mediaId}`, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const meta = await r1.json();
  if (!r1.ok || !meta.url) throw new Error("No se ha podido obtener el adjunto de WhatsApp.");
  const r2 = await fetch(meta.url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  if (!r2.ok) throw new Error("No se ha podido descargar el adjunto de WhatsApp.");
  return { datos: new Uint8Array(await r2.arrayBuffer()), tipo: meta.mime_type ?? r2.headers.get("content-type") ?? "application/octet-stream" };
}

/** Firma del webhook de Meta: X-Hub-Signature-256 = sha256=HMAC(app_secret, cuerpo). */
export async function firmaValida(cuerpo: string, cabecera: string | null): Promise<boolean> {
  const secreto = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";
  if (!secreto || !cabecera?.startsWith("sha256=")) return false;
  const clave = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(cuerpo)));
  const hex = [...firma].map((b) => b.toString(16).padStart(2, "0")).join("");
  const recibida = cabecera.slice(7);
  if (recibida.length !== hex.length) return false;
  let d = 0;
  for (let i = 0; i < hex.length; i++) d |= hex.charCodeAt(i) ^ recibida.charCodeAt(i);
  return d === 0;
}

/** Transcripción de notas de voz con ElevenLabs (opcional). */
export async function transcribir(datos: Uint8Array, tipo: string): Promise<string | null> {
  const clave = Deno.env.get("ELEVENLABS_API_KEY");
  if (!clave) return null;
  const f = new FormData();
  f.append("model_id", "scribe_v1");
  f.append("file", new Blob([datos as unknown as BlobPart], { type: tipo }), "nota-de-voz.ogg");
  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": clave }, body: f });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j?.text ?? null;
}
