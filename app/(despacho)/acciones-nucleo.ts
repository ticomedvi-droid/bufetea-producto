"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { MODO_DEMO, SUPABASE_KEY, SUPABASE_URL } from "@/lib/config";
import { supabaseServidor } from "@/lib/supabase/server";
import { COOKIE_INTEGRADO, COOKIE_REGLAS, COOKIE_RESUELTAS } from "@/lib/datos/demo";
import type { Resultado } from "@/components/Envio";

const DEMO: Resultado = { ok: false, mensaje: "Es una demo con datos ficticios: no se envía ni se guarda nada." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REGLAS = ["recordatorio_semana", "recordatorio_vispera", "respuesta_codigo", "consultas_nuevas", "avisos_sin_noticias", "cierre"];
const txt = (f: FormData, k: string, max = 10000) => {
  const v = String(f.get(k) ?? "").trim().slice(0, max);
  return v || null;
};
const listo = (mensaje: string, ir?: string): Resultado => {
  revalidatePath("/", "layout");
  return { ok: true, mensaje, ir };
};
const limpiarError = (m: string) => m.replace(/^LIMITE:\s*/, "");

/** Llama a la función «nucleo» con la sesión de quien está en la app. */
async function nucleo(ruta: string, cuerpo: BodyInit | Record<string, unknown>): Promise<{ ok: boolean; datos: Record<string, unknown> }> {
  const sb = await supabaseServidor();
  const { data } = await sb.auth.getSession();
  if (!data.session) return { ok: false, datos: { error: "Inicia sesión de nuevo." } };
  const esForm = cuerpo instanceof FormData;
  const r = await fetch(`${SUPABASE_URL}/functions/v1/nucleo/${ruta}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${data.session.access_token}`, ...(esForm ? {} : { "Content-Type": "application/json" }) },
    body: esForm ? cuerpo : JSON.stringify(cuerpo),
  }).catch(() => null);
  const datos = r ? await r.json().catch(() => ({})) : { error: "No hay conexión con el servidor." };
  return { ok: !!r?.ok, datos };
}

async function marcarDemo(id: string) {
  const c = await cookies();
  const s = new Set((c.get(COOKIE_RESUELTAS)?.value ?? "").split(",").filter(Boolean));
  s.add(id);
  c.set(COOKIE_RESUELTAS, [...s].join(","), { path: "/", sameSite: "lax", httpOnly: true });
}

// ---------- Notificaciones ----------
export async function subirNotificacion(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const archivo = f.get("archivo");
  if (!(archivo instanceof File) || !archivo.size) return { ok: false, mensaje: "Elige el PDF de la notificación." };
  if (archivo.size > 20 * 1024 * 1024) return { ok: false, mensaje: "El PDF ocupa más de 20 MB." };
  const fd = new FormData();
  fd.append("archivo", archivo);
  const asunto = txt(f, "asunto_id", 40);
  if (asunto) fd.append("asunto_id", asunto);
  const r = await nucleo("notificaciones/subir", fd);
  if (!r.ok) return { ok: false, mensaje: String(r.datos.error ?? "No se ha podido subir.") };
  return listo(r.datos.nueva ? "Notificación recibida e interpretada." : "Esa notificación ya estaba recibida.", `/notificaciones?n=${r.datos.id}`);
}

export async function asignarNotificacion(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const id = txt(f, "id", 40), asunto = txt(f, "asunto_id", 40);
  if (!id || !UUID.test(id) || !asunto || !UUID.test(asunto)) return { ok: false, mensaje: "Elige el asunto." };
  const sb = await supabaseServidor();
  const { error } = await sb.rpc("asignar_notificacion", { p_notificacion: id, p_asunto: asunto });
  if (error) return { ok: false, mensaje: error.message };
  const r = await nucleo("notificaciones/procesar", { id });
  return r.ok ? listo("Asignada. El mensaje para el cliente ya está preparado.") : { ok: false, mensaje: String(r.datos.error ?? "No se ha podido preparar el mensaje.") };
}

export async function reprocesar(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const r = await nucleo("notificaciones/procesar", { id: txt(f, "id", 40) });
  return r.ok ? listo("Notificación interpretada de nuevo.") : { ok: false, mensaje: String(r.datos.error ?? "No se ha podido procesar.") };
}

export async function noContar(_: Resultado, f: FormData): Promise<Resultado> {
  const id = txt(f, "id", 40);
  if (!id) return { ok: false, mensaje: "Notificación no válida." };
  if (MODO_DEMO) { await marcarDemo(id); return listo("Notificación revisada. No se le cuenta al cliente."); }
  const sb = await supabaseServidor();
  const { error } = await sb.rpc("no_contar_notificacion", { p_notificacion: id });
  return error ? { ok: false, mensaje: error.message } : listo("Notificación revisada. No se le cuenta al cliente.");
}

// ---------- Mensajes al cliente ----------
function camposMensaje(f: FormData) {
  return { id: txt(f, "mensaje_id", 40), titulo: txt(f, "titulo", 200) ?? undefined, cuerpo: txt(f, "cuerpo") ?? undefined,
    cuerpo_es: txt(f, "cuerpo_es") ?? undefined, destinatario: txt(f, "destinatario", 200) ?? undefined };
}

export async function aprobarYEnviar(_: Resultado, f: FormData): Promise<Resultado> {
  const c = camposMensaje(f);
  if (MODO_DEMO) {
    const n = txt(f, "notificacion_id", 40);
    if (n) await marcarDemo(n);
    return listo("Mensaje aprobado. En la demo no se envía nada.");
  }
  const r = await nucleo("mensajes/aprobar", { ...c, enviarAhora: f.get("ahora") !== "0" });
  if (!r.ok) return { ok: false, mensaje: limpiarError(String(r.datos.error ?? "No se ha podido enviar.")) };
  return listo(r.datos.estado === "programado" ? "Aprobado. Saldrá en su fecha." : "Aprobado y enviado.");
}

export async function guardarMensaje(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const r = await nucleo("mensajes/guardar", camposMensaje(f));
  return r.ok ? listo("Cambios guardados. Queda por aprobar.") : { ok: false, mensaje: String(r.datos.error ?? "No se ha podido guardar.") };
}

export async function traducirMensaje(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const r = await nucleo("mensajes/traducir", { id: txt(f, "mensaje_id", 40), idioma: txt(f, "idioma", 3), cuerpo_es: txt(f, "cuerpo_es") ?? undefined });
  return r.ok ? listo("Mensaje traducido al idioma del cliente. Revísalo antes de aprobar.") : { ok: false, mensaje: String(r.datos.error ?? "No se ha podido traducir.") };
}

export async function cancelarMensaje(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const id = txt(f, "mensaje_id", 40);
  if (!id || !UUID.test(id)) return { ok: false, mensaje: "Mensaje no válido." };
  const sb = await supabaseServidor();
  const { error } = await sb.from("mensajes").update({ estado: "cancelado", actualizado_en: new Date().toISOString() }).eq("id", id);
  return error ? { ok: false, mensaje: "No se ha podido cancelar." } : listo("Aviso cancelado.");
}

export async function prepararSinNoticias(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const r = await nucleo("mensajes/sin-noticias", { asunto_id: txt(f, "asunto_id", 40) });
  return r.ok ? listo("Mensaje preparado. Revísalo y apruébalo en «Avisos que salen solos».", "/avisos") : { ok: false, mensaje: String(r.datos.error ?? "No se ha podido preparar.") };
}

// ---------- Reglas ----------
export async function guardarReglas(_: Resultado, f: FormData): Promise<Resultado> {
  const elegidas = REGLAS.filter((r) => f.get(r) === "on");
  if (MODO_DEMO) {
    (await cookies()).set(COOKIE_REGLAS, elegidas.join(","), { path: "/", sameSite: "lax", httpOnly: true });
    return listo("Reglas guardadas.");
  }
  const sb = await supabaseServidor();
  const { error } = await sb.rpc("ajustar_envio_auto", { p_tipos: elegidas });
  return error ? { ok: false, mensaje: error.message } : listo("Reglas guardadas. Lo que encaja con ellas saldrá solo; lo demás te espera.");
}

// ---------- WhatsApp ----------
export async function responderWhatsApp(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const r = await nucleo("whatsapp/enviar", { conversacion: txt(f, "conversacion", 40), texto: txt(f, "texto", 4000) });
  return r.ok ? listo("Respuesta enviada.") : { ok: false, mensaje: String(r.datos.error ?? "No se ha podido enviar.") };
}

export async function proponerWhatsApp(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const r = await nucleo("whatsapp/proponer", { conversacion: txt(f, "conversacion", 40) });
  return r.ok ? listo("Nueva propuesta lista.") : { ok: false, mensaje: String(r.datos.error ?? "No se ha podido proponer.") };
}

export async function marcarLeida(id: string) {
  if (MODO_DEMO || !UUID.test(id)) return;
  const sb = await supabaseServidor();
  await sb.rpc("marcar_conversacion_leida", { p_conversacion: id });
}

// ---------- Programa de gestión y códigos ----------
export async function pedirComprobarPrograma(_: Resultado, f: FormData): Promise<Resultado> {
  const programa = txt(f, "programa", 80);
  if (!programa || programa.length < 2) return { ok: false, mensaje: "Escribe qué programa de gestión usáis." };
  if (MODO_DEMO) return listo("Recibido. Te decimos en unos días si se puede conectar.");
  const sb = await supabaseServidor();
  const { data: u } = await sb.auth.getUser();
  const { data: p } = await sb.from("perfiles").select("despacho_id").eq("id", u.user?.id ?? "").maybeSingle();
  const { error } = await sb.from("solicitudes_conexion").insert({ despacho_id: p?.despacho_id, programa, comentario: txt(f, "comentario", 1000), solicitado_por: u.user?.id });
  return error ? { ok: false, mensaje: "No se ha podido enviar." } : listo("Recibido. Te decimos en unos días si tu programa se puede conectar.");
}

export async function regenerarCodigo(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const sb = await supabaseServidor();
  const { error } = await sb.rpc("regenerar_codigo", { p_cliente: txt(f, "cliente_id", 40) });
  return error ? { ok: false, mensaje: error.message } : listo("Código nuevo generado. El anterior ya no vale.");
}

/** Solo en la demo: alterna entre despacho conectado a su programa de gestión o independiente. */
export async function demoIntegrado(_: Resultado, f: FormData): Promise<Resultado> {
  if (!MODO_DEMO) return { ok: false, mensaje: "Solo en la demo." };
  (await cookies()).set(COOKIE_INTEGRADO, f.get("on") === "1" ? "1" : "0", { path: "/", sameSite: "lax", httpOnly: true });
  return listo("Hecho.");
}
