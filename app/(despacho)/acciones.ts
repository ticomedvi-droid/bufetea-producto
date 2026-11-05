"use server";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { APP_URL, MODO_DEMO, SUPABASE_KEY, SUPABASE_URL, VERSION_ART28 } from "@/lib/config";
import { supabaseServidor } from "@/lib/supabase/server";
import { COOKIE_EXTRAS, COOKIE_PLAN, COOKIE_SOLICITUDES } from "@/lib/datos/demo";
import type { Resultado } from "@/components/Envio";

const DEMO: Resultado = { ok: false, mensaje: "Es una demo con datos ficticios: no se guarda nada." };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const txt = (f: FormData, k: string, max = 200) => {
  const v = String(f.get(k) ?? "").trim().slice(0, max);
  return v || null;
};
const fallo = (e: { message: string } | null | undefined, porDefecto = "No se ha podido guardar.") =>
  ({ ok: false, mensaje: e?.message && !/violates|permission|policy|JWT/i.test(e.message) ? e.message : porDefecto }) as Resultado;
const listo = (mensaje: string, ir?: string): Resultado => {
  revalidatePath("/", "layout");
  return { ok: true, mensaje, ir };
};

async function miDespacho() {
  const sb = await supabaseServidor();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return { sb, desp: null as string | null };
  const { data } = await sb.from("perfiles").select("despacho_id").eq("id", u.user.id).maybeSingle();
  return { sb, desp: (data?.despacho_id as string) ?? null };
}

// ---------- Clientes ----------
export async function guardarCliente(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const id = txt(f, "id", 40);
  const datos = {
    nombre: txt(f, "nombre"),
    tipo: txt(f, "tipo", 40),
    email: txt(f, "email")?.toLowerCase() ?? null,
    telefono: txt(f, "telefono", 40),
    dni: txt(f, "dni", 20)?.toUpperCase().replace(/[^A-Z0-9]/g, "") || null,
    idioma: txt(f, "idioma", 3) ?? "es",
    canal: txt(f, "canal", 10) ?? "whatsapp",
    notas: txt(f, "notas", 4000),
  };
  if (!datos.nombre || datos.nombre.length < 2) return { ok: false, mensaje: "Escribe el nombre del cliente." };
  if (datos.email && !EMAIL.test(datos.email)) return { ok: false, mensaje: "Revisa el email." };
  if (datos.telefono && datos.telefono.replace(/\D/g, "").length < 9) return { ok: false, mensaje: "Revisa el teléfono: al menos 9 cifras." };
  if (!/^[a-z]{2,3}$/.test(datos.idioma)) return { ok: false, mensaje: "Idioma no válido." };
  if (!["whatsapp", "email"].includes(datos.canal)) return { ok: false, mensaje: "Canal no válido." };
  if (datos.canal === "email" && !datos.email) return { ok: false, mensaje: "Para avisarle por email, escribe su email." };
  if (datos.canal === "whatsapp" && !datos.telefono) return { ok: false, mensaje: "Para avisarle por WhatsApp, escribe su móvil." };
  const { sb, desp } = await miDespacho();
  if (!desp) return { ok: false, mensaje: "Inicia sesión de nuevo." };
  if (id) {
    if (!UUID.test(id)) return { ok: false, mensaje: "Cliente no válido." };
    const { data: actual } = await sb.from("clientes").select("origen").eq("id", id).maybeSingle();
    if (!actual) return { ok: false, mensaje: "Cliente no encontrado." };
    // Lo que viene del programa de gestión no se toca desde aquí: solo los datos propios de Bufetea.
    const cambios = actual.origen === "manual" || actual.origen === "csv" ? datos : { idioma: datos.idioma, canal: datos.canal, dni: datos.dni, notas: datos.notas };
    const { error } = await sb.from("clientes").update(cambios).eq("id", id);
    return error ? fallo(error) : listo("Cliente guardado.");
  }
  const { data, error } = await sb.from("clientes").insert({ ...datos, despacho_id: desp, origen: "manual" }).select("id").single();
  return error ? fallo(error) : listo("Cliente dado de alta.", `/clientes/${data.id}`);
}

export async function eliminarCliente(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const id = txt(f, "id", 40);
  if (!id || !UUID.test(id)) return { ok: false, mensaje: "Cliente no válido." };
  const { sb } = await miDespacho();
  const { error } = await sb.from("clientes").update({ eliminado: true }).eq("id", id);
  return error ? fallo(error) : listo("Cliente eliminado de Bufetea.", "/clientes");
}

// ---------- Asuntos ----------
export async function guardarAsunto(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const id = txt(f, "id", 40);
  const { sb, desp } = await miDespacho();
  if (!desp) return { ok: false, mensaje: "Inicia sesión de nuevo." };
  const abogadoId = txt(f, "abogado_id", 40);
  let abogado: string | null = null;
  if (abogadoId) {
    if (!UUID.test(abogadoId)) return { ok: false, mensaje: "Abogado no válido." };
    const { data } = await sb.from("perfiles").select("nombre, email").eq("id", abogadoId).maybeSingle();
    if (!data) return { ok: false, mensaje: "Abogado no válido." };
    abogado = data.nombre ?? data.email;
  }
  const situacion = txt(f, "situacion", 12) ?? "abierto";
  if (!["abierto", "cerrado", "archivado"].includes(situacion)) return { ok: false, mensaje: "Estado no válido." };
  let duplicadoDe: string | null = null;
  const dup = txt(f, "duplicado_de", 80);
  if (dup) {
    const { data } = await sb.from("asuntos").select("id").or(`numero.eq.${dup.replace(/[,()]/g, "")},procedimiento.eq.${dup.replace(/[,()]/g, "")}`).neq("id", id ?? "00000000-0000-0000-0000-000000000000").limit(1).maybeSingle();
    if (!data) return { ok: false, mensaje: `No encuentro el asunto «${dup}» para marcarlo como duplicado.` };
    duplicadoDe = data.id;
  }
  const datos = {
    numero: txt(f, "numero", 80),
    procedimiento: txt(f, "procedimiento", 80),
    juzgado: txt(f, "juzgado"),
    descripcion: txt(f, "descripcion", 500),
    area: txt(f, "area", 80),
    tipo_procedimiento: txt(f, "tipo_procedimiento", 80),
    fase_cliente: txt(f, "fase_cliente"),
    abogado_id: abogadoId,
    ...(abogadoId ? { abogado } : {}),
    situacion,
    fecha_cierre: situacion === "abierto" ? null : new Date().toISOString().slice(0, 10),
    informar: f.get("informar") === "on",
    duplicado_de: duplicadoDe,
    notas: txt(f, "notas", 4000),
  };
  if (!datos.numero && !datos.procedimiento && !datos.descripcion) return { ok: false, mensaje: "Escribe al menos el número, el procedimiento o una descripción." };
  if (id) {
    if (!UUID.test(id)) return { ok: false, mensaje: "Asunto no válido." };
    const { data: actual } = await sb.from("asuntos").select("origen").eq("id", id).maybeSingle();
    if (!actual) return { ok: false, mensaje: "Asunto no encontrado." };
    const propio = actual.origen === "manual" || actual.origen === "csv";
    const cambios = propio ? datos : {
      procedimiento: datos.procedimiento, juzgado: datos.juzgado, tipo_procedimiento: datos.tipo_procedimiento, fase_cliente: datos.fase_cliente,
      abogado_id: datos.abogado_id, informar: datos.informar, duplicado_de: datos.duplicado_de, notas: datos.notas,
    };
    const { error } = await sb.from("asuntos").update(cambios).eq("id", id);
    return error ? fallo(error) : listo("Asunto guardado.");
  }
  const clienteId = txt(f, "cliente_id", 40);
  if (clienteId && !UUID.test(clienteId)) return { ok: false, mensaje: "Cliente no válido." };
  const { data, error } = await sb.from("asuntos")
    .insert({ ...datos, despacho_id: desp, origen: "manual", cliente_id: clienteId, fecha_apertura: new Date().toISOString().slice(0, 10) })
    .select("id").single();
  return error ? fallo(error) : listo("Asunto dado de alta.", `/asuntos/${data.id}`);
}

export async function vincularCliente(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const asunto = txt(f, "asunto_id", 40), cliente = txt(f, "cliente_id", 40);
  if (!asunto || !cliente || !UUID.test(asunto) || !UUID.test(cliente)) return { ok: false, mensaje: "Elige un cliente." };
  const { sb, desp } = await miDespacho();
  const { error } = await sb.from("asunto_clientes").insert({ asunto_id: asunto, cliente_id: cliente, despacho_id: desp });
  if (error && /duplicate/i.test(error.message)) return { ok: false, mensaje: "Ese cliente ya está en el asunto." };
  if (error) return fallo(error);
  await sb.from("asuntos").update({ cliente_id: cliente }).eq("id", asunto).is("cliente_id", null);
  return listo("Cliente añadido al asunto.");
}

export async function desvincularCliente(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const asunto = txt(f, "asunto_id", 40), cliente = txt(f, "cliente_id", 40);
  if (!asunto || !cliente || !UUID.test(asunto) || !UUID.test(cliente)) return { ok: false, mensaje: "Datos no válidos." };
  const { sb } = await miDespacho();
  const { data: a } = await sb.from("asuntos").select("cliente_id, origen").eq("id", asunto).maybeSingle();
  if (a?.cliente_id === cliente && a.origen !== "manual" && a.origen !== "csv") {
    return { ok: false, mensaje: "Es el cliente principal que viene de tu programa de gestión: cámbialo allí." };
  }
  const { error } = await sb.from("asunto_clientes").delete().eq("asunto_id", asunto).eq("cliente_id", cliente);
  if (error) return fallo(error);
  if (a?.cliente_id === cliente) {
    const { data: otro } = await sb.from("asunto_clientes").select("cliente_id").eq("asunto_id", asunto).limit(1).maybeSingle();
    await sb.from("asuntos").update({ cliente_id: otro?.cliente_id ?? null }).eq("id", asunto);
  }
  return listo("Cliente quitado del asunto.");
}

// ---------- Importación ----------
export type FilaImportacion = { cliente: Record<string, string>; asunto: Record<string, string> };
export async function importar(filas: FilaImportacion[]): Promise<{ ok: boolean; mensaje: string; detalle?: Record<string, unknown> }> {
  if (MODO_DEMO) return { ok: false, mensaje: DEMO!.mensaje };
  if (!Array.isArray(filas) || !filas.length) return { ok: false, mensaje: "El archivo no tiene filas." };
  if (filas.length > 5000) return { ok: false, mensaje: "Como máximo 5.000 filas por importación. Divide el archivo." };
  const { sb } = await miDespacho();
  const { data, error } = await sb.rpc("importar_filas", { p_filas: filas });
  if (error) return { ok: false, mensaje: error.message };
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Importación terminada.", detalle: data };
}

// ---------- Plan y extras ----------
export async function cambiarPlan(_: Resultado, f: FormData): Promise<Resultado> {
  const plan = txt(f, "plan", 20), fact = txt(f, "facturacion", 10);
  if (!plan || !fact || !["mensual", "anual"].includes(fact)) return { ok: false, mensaje: "Elige plan y forma de pago." };
  if (MODO_DEMO) {
    (await cookies()).set(COOKIE_PLAN, `${plan}:${fact}`, { path: "/", sameSite: "lax", httpOnly: true });
    return listo("Plan cambiado en la demo. En tu despacho, el cambio se aplica al momento.");
  }
  const { sb } = await miDespacho();
  const { error } = await sb.rpc("cambiar_plan", { p_plan: plan, p_facturacion: fact });
  return error ? fallo(error) : listo("Plan cambiado. Los extras incluidos ya están activos.");
}

export async function solicitarActivacion(_: Resultado, f: FormData): Promise<Resultado> {
  const extra = txt(f, "extra", 20);
  if (!extra) return { ok: false, mensaje: "Extra no válido." };
  if (MODO_DEMO) {
    const c = await cookies();
    const actuales = new Set((c.get(COOKIE_SOLICITUDES)?.value ?? "").split(",").filter(Boolean));
    actuales.add(extra);
    c.set(COOKIE_SOLICITUDES, [...actuales].join(","), { path: "/", sameSite: "lax", httpOnly: true });
    return listo("Solicitud enviada. El equipo de Bufetea te escribe para confirmarte el precio antes de activarlo.");
  }
  const { sb } = await miDespacho();
  const { error } = await sb.rpc("solicitar_activacion", { p_extra: extra, p_comentario: txt(f, "comentario", 1000) });
  return error ? fallo(error) : listo("Solicitud enviada. El equipo de Bufetea te escribe para confirmarte el precio antes de activarlo.");
}

/** Solo en la demo: simula que el equipo de Bufetea activa o quita un extra contratado. */
export async function demoExtra(_: Resultado, f: FormData): Promise<Resultado> {
  if (!MODO_DEMO) return { ok: false, mensaje: "Solo en la demo." };
  const extra = txt(f, "extra", 20)!, on = f.get("on") === "1";
  const c = await cookies();
  const s = new Set((c.get(COOKIE_EXTRAS)?.value ?? "").split(",").filter(Boolean));
  if (on) s.add(extra); else s.delete(extra);
  c.set(COOKIE_EXTRAS, [...s].join(","), { path: "/", sameSite: "lax", httpOnly: true });
  return listo(on ? "Extra activado en la demo." : "Extra quitado en la demo: vuelve a aparecer con candado.");
}

export async function marcarAvisoVisto(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const { sb } = await miDespacho();
  await sb.rpc("marcar_aviso_uso_visto", { p_mes: txt(f, "mes", 10), p_umbral: Number(f.get("umbral")) });
  return listo("Aviso marcado como visto.");
}

// ---------- Ajustes ----------
export async function aceptarArt28(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  if (f.get("art28") !== "on") return { ok: false, mensaje: "Marca la casilla para aceptar el contrato." };
  const { sb } = await miDespacho();
  const { error } = await sb.rpc("aceptar_art28", { p_version: VERSION_ART28 });
  return error ? fallo(error) : listo("Contrato de encargo aceptado.");
}

export async function ajustarDespacho(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const email = txt(f, "email_respuesta");
  if (email && !EMAIL.test(email)) return { ok: false, mensaje: "Revisa el email de respuesta." };
  const { sb } = await miDespacho();
  const { error } = await sb.rpc("ajustar_despacho", { p_firma: txt(f, "firma", 300) ?? "", p_email_respuesta: email ?? "" });
  return error ? fallo(error) : listo("Ajustes guardados.");
}

export async function cambiarRol(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const { sb } = await miDespacho();
  const { error } = await sb.rpc("cambiar_rol", { p_usuario: txt(f, "usuario", 40), p_rol: txt(f, "rol", 20) });
  return error ? fallo(error) : listo("Rol cambiado.");
}

async function urlApp() {
  if (APP_URL) return APP_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : "";
}

async function equipo(ruta: string, cuerpo: Record<string, unknown>): Promise<Resultado> {
  const sb = await supabaseServidor();
  const { data } = await sb.auth.getSession();
  if (!data.session) return { ok: false, mensaje: "Inicia sesión de nuevo." };
  const r = await fetch(`${SUPABASE_URL}/functions/v1/equipo/${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ ...cuerpo, app: await urlApp() }),
  }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  if (!r || !r.ok) return { ok: false, mensaje: j.error ?? "No se ha podido completar." };
  return listo(ruta === "invitar" ? "Invitación enviada por correo." : ruta === "desactivar" ? "Acceso desactivado." : "Acceso reactivado.");
}
export async function invitar(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  const email = txt(f, "email");
  if (!email || !EMAIL.test(email)) return { ok: false, mensaje: "Escribe un email válido." };
  return equipo("invitar", { email, nombre: txt(f, "nombre", 120), rol: txt(f, "rol", 20) ?? "abogado" });
}
export async function desactivar(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return DEMO;
  return equipo(f.get("reactivar") === "1" ? "reactivar" : "desactivar", { usuario: txt(f, "usuario", 40) });
}
