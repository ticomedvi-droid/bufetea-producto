import "server-only";
import { cache } from "react";
import { supabaseServidor } from "@/lib/supabase/server";
import type {
  Asunto, Aviso, AvisoUso, Cliente, Conversacion, Despacho, EstimacionMes, ExtraEstado, Indicadores, Indice, Integracion, Llamada, Mensaje,
  MensajeWA, Miembro, Notificacion, PlanCompleto, ReglaId, ResumenHoy, Sesion, SinNoticias,
} from "@/lib/tipos";

const CAMPOS_DESPACHO =
  "id, nombre, slug, plan_id, facturacion, estado, piloto_fin, fundador, precio_congelado_hasta, firma, email_respuesta, art28_aceptado_en, art28_version";
const CAMPOS_CLIENTE = "id, nombre, tipo, email, telefono, dni, idioma, canal, codigo, notas, origen, eliminado";
const CAMPOS_ASUNTO =
  "id, numero, procedimiento, juzgado, descripcion, area, tipo_procedimiento, abogado, abogado_id, fase_cliente, situacion, informar, fecha_apertura, cliente_id, duplicado_de, notas, origen, asunto_clientes(clientes(id, nombre))";

type FilaAsunto = Omit<Asunto, "clientes"> & { asunto_clientes?: { clientes: { id: string; nombre: string } | null }[] };
const aAsunto = (a: FilaAsunto): Asunto => {
  const { asunto_clientes, ...resto } = a;
  return { ...resto, clientes: (asunto_clientes ?? []).map((x) => x.clientes).filter((c): c is { id: string; nombre: string } => !!c) };
};

/** Sesión de quien navega. null si no ha entrado; despacho null si aún no tiene despacho. */
export const sesion = cache(async (): Promise<Sesion | null | "sin-despacho"> => {
  const sb = await supabaseServidor();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return null;
  const { data: p } = await sb.from("perfiles").select("despacho_id, rol, nombre, email, activo").eq("id", u.user.id).maybeSingle();
  if (!p || !p.activo) return "sin-despacho";
  const [{ data: d }, { data: adm }] = await Promise.all([
    sb.from("despachos").select(CAMPOS_DESPACHO).eq("id", p.despacho_id).single(),
    sb.rpc("es_bufetea_admin"),
  ]);
  return {
    usuarioId: u.user.id,
    email: u.user.email ?? p.email ?? "",
    nombre: p.nombre,
    rol: p.rol,
    despacho: d as Despacho,
    esBufeteaAdmin: !!adm,
    demo: false,
  };
});

export const planes = cache(async (): Promise<PlanCompleto[]> => {
  const sb = await supabaseServidor();
  const [{ data: ps, error }, { data: pe }] = await Promise.all([
    sb.from("planes").select("*").order("orden"),
    sb.from("plan_extras").select("plan_id, extra_id"),
  ]);
  if (error) throw error;
  return (ps ?? []).map((p) => ({
    ...p,
    precio_mes: Number(p.precio_mes),
    precio_anio: Number(p.precio_anio),
    exceso_asunto: Number(p.exceso_asunto),
    incluye: (pe ?? []).filter((x) => x.plan_id === p.id).map((x) => x.extra_id),
  }));
});

export const misExtras = cache(async (): Promise<ExtraEstado[]> => {
  const sb = await supabaseServidor();
  const { data, error } = await sb.rpc("mis_extras");
  if (error) throw error;
  return (data ?? []).map((e: ExtraEstado) => ({ ...e, precio_mes: Number(e.precio_mes), precio_pactado: e.precio_pactado == null ? null : Number(e.precio_pactado) }));
});

export const estimacion = cache(async (): Promise<EstimacionMes> => {
  const sb = await supabaseServidor();
  const { data, error } = await sb.rpc("mi_estimacion");
  if (error) throw error;
  return data as EstimacionMes;
});

export async function avisosUso(): Promise<AvisoUso[]> {
  const sb = await supabaseServidor();
  const { data: mes } = await sb.rpc("mes_actual");
  const { data } = await sb.from("avisos_uso").select("mes, umbral, asuntos_activos, incluidos, visto_en").eq("mes", mes).order("umbral", { ascending: false });
  return (data ?? []) as AvisoUso[];
}

export async function clientes(q = "", pagina = 0, porPagina = 50): Promise<{ filas: Cliente[]; total: number }> {
  const sb = await supabaseServidor();
  let consulta = sb.from("clientes").select(CAMPOS_CLIENTE, { count: "exact" }).eq("eliminado", false);
  const t = q.trim().replace(/[%,()]/g, " ");
  if (t) consulta = consulta.or(`nombre.ilike.%${t}%,email.ilike.%${t}%,telefono.ilike.%${t}%,dni.ilike.%${t}%`);
  const { data, count, error } = await consulta.order("nombre").range(pagina * porPagina, pagina * porPagina + porPagina - 1);
  if (error) throw error;
  return { filas: (data ?? []) as Cliente[], total: count ?? 0 };
}

export async function cliente(id: string): Promise<{ cliente: Cliente; asuntos: Asunto[]; mensajes: Mensaje[] } | null> {
  const sb = await supabaseServidor();
  const { data: c } = await sb.from("clientes").select(CAMPOS_CLIENTE).eq("id", id).maybeSingle();
  if (!c) return null;
  const { data: rel } = await sb.from("asunto_clientes").select("asunto_id").eq("cliente_id", id);
  const ids = (rel ?? []).map((r) => r.asunto_id);
  const [{ data: as }, { data: ms }] = await Promise.all([
    ids.length ? sb.from("asuntos").select(CAMPOS_ASUNTO).in("id", ids).eq("eliminado", false) : Promise.resolve({ data: [] }),
    sb.from("mensajes").select("*").eq("cliente_id", id).order("creado_en", { ascending: false }).limit(100),
  ]);
  return { cliente: c as Cliente, asuntos: ((as ?? []) as unknown as FilaAsunto[]).map(aAsunto), mensajes: (ms ?? []) as Mensaje[] };
}

export async function asuntos(filtro: { q?: string; situacion?: string; pagina?: number } = {}): Promise<{ filas: Asunto[]; total: number }> {
  const sb = await supabaseServidor();
  const porPagina = 50, pagina = filtro.pagina ?? 0;
  let consulta = sb.from("asuntos").select(CAMPOS_ASUNTO, { count: "exact" }).eq("eliminado", false);
  if (filtro.situacion && filtro.situacion !== "todos") consulta = consulta.eq("situacion", filtro.situacion);
  const t = (filtro.q ?? "").trim().replace(/[%,()]/g, " ");
  if (t) consulta = consulta.or(`numero.ilike.%${t}%,procedimiento.ilike.%${t}%,descripcion.ilike.%${t}%,juzgado.ilike.%${t}%`);
  const { data, count, error } = await consulta
    .order("fecha_apertura", { ascending: false, nullsFirst: false })
    .range(pagina * porPagina, pagina * porPagina + porPagina - 1);
  if (error) throw error;
  return { filas: ((data ?? []) as unknown as FilaAsunto[]).map(aAsunto), total: count ?? 0 };
}

export async function asunto(id: string): Promise<{ asunto: Asunto; mensajes: Mensaje[] } | null> {
  const sb = await supabaseServidor();
  const { data: a } = await sb.from("asuntos").select(CAMPOS_ASUNTO).eq("id", id).maybeSingle();
  if (!a) return null;
  const { data: ms } = await sb.from("mensajes").select("*").eq("asunto_id", id).order("creado_en", { ascending: false }).limit(200);
  return { asunto: aAsunto(a as unknown as FilaAsunto), mensajes: (ms ?? []) as Mensaje[] };
}

export async function equipo(): Promise<Miembro[]> {
  const sb = await supabaseServidor();
  const s = await sesion();
  if (!s || s === "sin-despacho") return [];
  const { data } = await sb.from("perfiles").select("id, nombre, email, rol, activo").eq("despacho_id", s.despacho.id).order("creado_en");
  return (data ?? []) as Miembro[];
}

export async function llamadas(): Promise<Llamada[]> {
  const sb = await supabaseServidor();
  const { data } = await sb.from("llamadas").select("id, nombre, telefono, tipo, urgente, tema, resumen, verificado, atendida, creado_en").order("creado_en", { ascending: false }).limit(100);
  return (data ?? []) as Llamada[];
}

const hora = (iso: string) => {
  const d = new Date(iso);
  const hoy = new Date();
  return d.toDateString() === hoy.toDateString()
    ? d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
    : d.toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });
};

export const integracion = cache(async (): Promise<Integracion> => {
  const sb = await supabaseServidor();
  const { data } = await sb.from("integraciones").select("estado, ultima_sync, ultimo_error").limit(1).maybeSingle();
  return { conectada: !!data && (data.estado === "conectada" || data.estado === "error"), ultimaSync: data?.ultima_sync ?? null, error: data?.estado === "error" ? data.ultimo_error : null };
});

export const indice = cache(async (): Promise<Indice> => {
  const sb = await supabaseServidor();
  const s = await sesion();
  if (!s || s === "sin-despacho") return { porcentaje: null, clientes: 0, informados: 0, asuntos: 0, sello: false, sin_datos: true };
  const { data } = await sb.rpc("indice_informado", { p_despacho: s.despacho.id });
  return data as Indice;
});

export async function indicadores(): Promise<Indicadores> {
  const sb = await supabaseServidor();
  const { data } = await sb.rpc("indicadores_mes");
  return (data ?? { minutos_medios_notificacion: null, como_va_lo_mio: 0, asuntos_excluidos: 0 }) as Indicadores;
}

export async function historicoIndice(): Promise<{ mes: string; porcentaje: number | null; sello: boolean }[]> {
  const sb = await supabaseServidor();
  const { data } = await sb.from("indice_mensual").select("mes, porcentaje, sello").order("mes", { ascending: false }).limit(12);
  return (data ?? []) as { mes: string; porcentaje: number | null; sello: boolean }[];
}

const CAMPOS_NOTIF = "id, asunto_id, origen, archivo_nombre, estado, error, tipo_resolucion, organo, procedimiento, lo_que_dice, resumen, plazo_tipo, plazo_descripcion, plazo_dias, plazo_fecha, senalamiento_en, cliente_debe_actuar, accion_cliente, fase_sugerida, ia, creada_en, asuntos(id, numero, descripcion, informar, abogado, area, clientes!asuntos_cliente_id_fkey(id, nombre, idioma, canal))";
type FilaNotif = Omit<Notificacion, "asunto" | "cliente" | "mensaje"> & { asuntos: (Notificacion["asunto"] & { clientes: Notificacion["cliente"] }) | null };

export async function notificaciones(filtro: "pendientes" | "todas" = "pendientes"): Promise<Notificacion[]> {
  const sb = await supabaseServidor();
  let q = sb.from("notificaciones").select(CAMPOS_NOTIF).order("creada_en", { ascending: false }).limit(200);
  if (filtro === "pendientes") q = q.in("estado", ["recibida", "interpretando", "lista", "error"]);
  const { data, error } = await q;
  if (error) throw error;
  const filas = (data ?? []) as unknown as FilaNotif[];
  const ids = filas.map((f) => f.id);
  const { data: ms } = ids.length ? await sb.from("mensajes").select("*").in("notificacion_id", ids).neq("estado", "cancelado") : { data: [] };
  return filas.map((f) => {
    const { asuntos, ...resto } = f;
    const { clientes, ...asunto } = asuntos ?? ({} as NonNullable<FilaNotif["asuntos"]>);
    return { ...resto, asunto: asuntos ? asunto : null, cliente: asuntos ? clientes : null,
      mensaje: ((ms ?? []) as Notificacion["mensaje"][]).find((m) => m && (m as unknown as { notificacion_id: string }).notificacion_id === f.id) ?? null } as Notificacion;
  });
}

export async function reglas(): Promise<ReglaId[]> {
  const s = await sesion();
  if (!s || s === "sin-despacho") return [];
  const sb = await supabaseServidor();
  const { data } = await sb.from("despachos").select("envio_auto").eq("id", s.despacho.id).single();
  return (data?.envio_auto ?? []) as ReglaId[];
}

export async function avisos(): Promise<Aviso[]> {
  const sb = await supabaseServidor();
  const { data } = await sb.from("mensajes").select("*, clientes(nombre), asuntos(numero, descripcion)")
    .in("tipo", ["recordatorio_semana", "recordatorio_vispera", "cierre", "sin_noticias", "manual"])
    .in("estado", ["borrador", "programado", "error"]).order("programado_para", { ascending: true, nullsFirst: false }).limit(100);
  type F = Aviso & { clientes: { nombre: string } | null; asuntos: { numero: string | null; descripcion: string | null } | null };
  return ((data ?? []) as unknown as F[]).map((m) => ({ ...m, cliente: m.clientes?.nombre ?? null, asunto: m.asuntos ? [m.asuntos.numero, m.asuntos.descripcion].filter(Boolean).join(" · ") : null }));
}

export async function conversaciones(): Promise<Conversacion[]> {
  const sb = await supabaseServidor();
  const { data } = await sb.from("wa_conversaciones").select("*, clientes!wa_conversaciones_cliente_id_fkey(nombre)").order("ultimo_mensaje_en", { ascending: false }).limit(200);
  const filas = (data ?? []) as unknown as (Conversacion & { clientes: { nombre: string } | null; verificada_hasta: string | null })[];
  const ids = filas.map((c) => c.id);
  const { data: ult } = ids.length ? await sb.from("wa_mensajes").select("conversacion_id, texto, transcripcion, creado_en").in("conversacion_id", ids).order("creado_en", { ascending: false }).limit(1000) : { data: [] };
  return filas.map((c) => ({
    ...c, cliente: c.clientes?.nombre ?? null, verificada: !!c.verificada_hasta && new Date(c.verificada_hasta) > new Date(),
    ultimo_texto: ((ult ?? []) as { conversacion_id: string; texto: string | null; transcripcion: string | null }[]).filter((m) => m.conversacion_id === c.id).map((m) => m.transcripcion ?? m.texto)[0] ?? null,
  }));
}

export async function mensajesWA(conversacion: string): Promise<MensajeWA[]> {
  const sb = await supabaseServidor();
  const { data } = await sb.from("wa_mensajes").select("id, direccion, tipo, texto, transcripcion, media_path, estado, auto, regla_auto, creado_en, enviado_por")
    .eq("conversacion_id", conversacion).order("creado_en").limit(500);
  const { data: eq } = await sb.from("perfiles").select("id, nombre, email");
  const nombres = new Map(((eq ?? []) as { id: string; nombre: string | null; email: string | null }[]).map((p) => [p.id, p.nombre ?? p.email]));
  return ((data ?? []) as (MensajeWA & { enviado_por: string | null })[]).map((m) => ({ ...m, enviado_por_nombre: m.enviado_por ? nombres.get(m.enviado_por) ?? null : null }));
}

export async function numeroWhatsApp(): Promise<{ numero: string; modo: "pruebas" | "produccion" } | null> {
  const sb = await supabaseServidor();
  const { data } = await sb.from("wa_numeros").select("numero, modo").eq("activo", true).maybeSingle();
  return (data as { numero: string; modo: "pruebas" | "produccion" } | null) ?? null;
}

export async function sinNoticias(): Promise<SinNoticias[]> {
  const sb = await supabaseServidor();
  const { data } = await sb.rpc("asuntos_sin_noticias", { p_dias: 30 });
  const filas = (data ?? []) as Omit<SinNoticias, "borrador">[];
  const ids = filas.map((f) => f.asunto_id);
  const { data: b } = ids.length ? await sb.from("mensajes").select("id, asunto_id").eq("tipo", "sin_noticias").eq("estado", "borrador").in("asunto_id", ids) : { data: [] };
  return filas.map((f) => ({ ...f, borrador: ((b ?? []) as { id: string; asunto_id: string }[]).find((x) => x.asunto_id === f.asunto_id)?.id ?? null }));
}

export async function hoy(): Promise<ResumenHoy> {
  const sb = await supabaseServidor();
  const s = await sesion();
  if (!s || s === "sin-despacho") return { porRevisar: 0, asuntosActivos: 0, informados: null, novedades: [] };
  const [nots, { data: activos }, ind, sin] = await Promise.all([
    notificaciones("pendientes"), sb.rpc("asuntos_activos_de", { p_despacho: s.despacho.id }), indice(), sinNoticias(),
  ]);
  const novedades: ResumenHoy["novedades"] = nots.slice(0, 8).map((n) => ({
    id: n.id, hora: hora(n.creada_en), cliente: n.cliente?.nombre ?? (n.asunto ? "Asunto sin cliente" : "Sin asignar"),
    texto: [n.tipo_resolucion ?? "Notificación", n.fase_sugerida ?? n.resumen ?? n.archivo_nombre].filter(Boolean).join(" · "),
    estado: n.estado === "lista" && n.mensaje ? "Borrador listo" : n.estado === "lista" ? "Por aprobar" : "Nueva",
    href: `/notificaciones?n=${n.id}`,
  }));
  const contar: ResumenHoy["novedades"] = sin.slice(0, 5).map((a) => ({
    id: `sn-${a.asunto_id}`, hora: `${a.dias} d`, cliente: a.cliente, texto: `${a.descripcion ?? a.numero ?? "Asunto"} · sin noticias`, estado: "Contarle algo", href: "/sin-noticias",
  }));
  return { porRevisar: nots.filter((n) => n.estado !== "interpretando").length, asuntosActivos: Number(activos ?? 0), informados: ind.porcentaje, novedades: [...novedades, ...contar] };
}
