// Envío y recepción de correo con Resend. El remitente depende del dominio de Bufetea (variable BUFETEA_DOMINIO).
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
export const emailValido = (e: string | null | undefined) => !!e && EMAIL.test(e);

export function remitente(): string {
  const dominio = (Deno.env.get("BUFETEA_DOMINIO") ?? "").trim();
  return Deno.env.get("BUFETEA_FROM") ?? (dominio ? `avisos@${dominio}` : "onboarding@resend.dev");
}

function escapar(t: string) {
  return t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function html(despacho: string, cuerpo: string, pie: string) {
  const parrafos = escapar(cuerpo.trim()).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`).join("");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f4f7;font-family:Helvetica,Arial,sans-serif;color:#0f1220">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#07080d;color:#ffffff;padding:18px 24px;font-size:17px;font-weight:bold">${escapar(despacho)}</td></tr>
<tr><td style="padding:24px;font-size:16px;line-height:1.55">${parrafos}</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #e7e7ee;font-size:12px;color:#5d6476">${escapar(pie)} Si tiene dudas, responda a este correo y le contestará el despacho.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function enviarCorreo(p: { idempotencia: string; despacho: string; para: string; asunto: string; texto: string; pie: string; responderA?: string | null }) {
  const clave = Deno.env.get("RESEND_API_KEY");
  if (!clave) throw new Error("Falta configurar el envío de correo (RESEND_API_KEY).");
  if (!emailValido(p.para)) throw new Error("El cliente no tiene un email válido.");
  const nombre = p.despacho.replace(/[<>"\\\r\n]/g, "").slice(0, 70);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json", "Idempotency-Key": p.idempotencia },
    body: JSON.stringify({
      from: `${nombre} <${remitente()}>`, to: [p.para], subject: p.asunto, text: `${p.texto}\n\n— ${p.pie}`, html: html(nombre, p.texto, p.pie),
      ...(emailValido(p.responderA) ? { reply_to: p.responderA } : {}),
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`El correo no ha salido (${r.status}): ${j?.message ?? "error del proveedor"}`);
  return (j.id as string) ?? null;
}

/** Firma de los webhooks de Resend (Svix): base64(HMAC-SHA256(secreto, `${id}.${timestamp}.${cuerpo}`)). */
export async function firmaResendValida(cuerpo: string, h: Headers): Promise<boolean> {
  const secreto = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";
  const id = h.get("svix-id"), ts = h.get("svix-timestamp"), firmas = h.get("svix-signature");
  if (!secreto || !id || !ts || !firmas) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const bytes = Uint8Array.from(atob(secreto.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const clave = await crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(`${id}.${ts}.${cuerpo}`)));
  let b = ""; for (const x of firma) b += String.fromCharCode(x);
  const esperada = btoa(b);
  return firmas.split(" ").some((f) => f.split(",")[1] === esperada);
}

/** Adjuntos de un correo recibido (Resend Receiving): metadatos con una URL de descarga temporal. */
export async function adjuntosRecibidos(emailId: string): Promise<{ id: string; filename: string; content_type: string; download_url: string }[]> {
  const clave = Deno.env.get("RESEND_API_KEY") ?? "";
  const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments`, { headers: { Authorization: `Bearer ${clave}` } });
  if (!r.ok) throw new Error(`No se han podido leer los adjuntos (${r.status})`);
  const j = await r.json();
  return j.data ?? [];
}
