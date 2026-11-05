import "server-only";
import { cache } from "react";
import { supabaseServidor } from "@/lib/supabase/server";
import type {
  Asunto, AvisoUso, Cliente, Despacho, EstimacionMes, ExtraEstado, Llamada, Mensaje, Miembro, PlanCompleto, ResumenHoy, Sesion,
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

export async function hoy(): Promise<ResumenHoy> {
  const sb = await supabaseServidor();
  const s = await sesion();
  if (!s || s === "sin-despacho") return { porRevisar: 0, asuntosActivos: 0, informados: null, novedades: [] };
  const [{ data: borradores, count }, { data: activos }, { data: noticias }] = await Promise.all([
    sb.from("mensajes").select("id, titulo, tipo, creado_en, cliente_id, asunto_id, clientes(nombre)", { count: "exact" })
      .eq("estado", "borrador").order("creado_en", { ascending: false }).limit(8),
    sb.rpc("asuntos_activos_de", { p_despacho: s.despacho.id }),
    sb.from("asuntos_noticias").select("asunto_id, cliente, informar, ultimo_aviso, fecha_apertura, descripcion, estado").eq("informar", true).limit(5000),
  ]);
  const abiertos = (noticias ?? []).filter((a) => !/closed|cerrado/i.test(a.estado ?? "") && a.cliente);
  const dias = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 864e5 : Infinity);
  const informados = abiertos.length ? Math.round((100 * abiertos.filter((a) => dias(a.ultimo_aviso) < 30).length) / abiertos.length) : null;
  type Borrador = { id: string; titulo: string; tipo: string; creado_en: string; asunto_id: string | null; clientes: { nombre: string } | null };
  const novedades: ResumenHoy["novedades"] = ((borradores ?? []) as unknown as Borrador[]).map((m) => ({
    id: m.id,
    hora: hora(m.creado_en),
    cliente: m.clientes?.nombre ?? "Sin cliente",
    texto: m.titulo || "Mensaje para el cliente",
    estado: m.tipo === "novedad" ? "Por aprobar" : "Borrador listo",
    href: m.asunto_id ? `/asuntos/${m.asunto_id}` : "/hoy",
  }));
  const sinNoticias = abiertos
    .filter((a) => dias(a.ultimo_aviso ?? a.fecha_apertura) > 30)
    .sort((a, b) => dias(b.ultimo_aviso ?? b.fecha_apertura) - dias(a.ultimo_aviso ?? a.fecha_apertura))
    .slice(0, 5)
    .map((a) => {
      const d = dias(a.ultimo_aviso ?? a.fecha_apertura);
      return {
        id: `sn-${a.asunto_id}`,
        hora: Number.isFinite(d) ? `${Math.floor(d)} d` : "—",
        cliente: a.cliente as string,
        texto: `${a.descripcion ?? "Asunto"} · sin noticias`,
        estado: "Contarle algo" as const,
        href: `/asuntos/${a.asunto_id}`,
      };
    });
  return { porRevisar: count ?? 0, asuntosActivos: Number(activos ?? 0), informados, novedades: [...novedades, ...sinNoticias] };
}
