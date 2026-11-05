import "server-only";
import { cookies } from "next/headers";
import { calcularImporte, type Facturacion } from "@/lib/precio";
import type {
  Asunto, AvisoUso, Cliente, EstimacionMes, ExtraEstado, IdExtra, Llamada, Mensaje, Miembro, PlanCompleto, ResumenHoy, Sesion,
} from "@/lib/tipos";
import { COMERCIAL_DEMO } from "./comercial-demo";

// Modo demostración: los mismos datos ficticios que enseña la web (producto.html). No se guarda nada en ninguna base de datos.
// El plan y los extras de la demo se recuerdan en cookies para poder probar los candados.
export const COOKIE_PLAN = "bufetea_demo_plan";
export const COOKIE_EXTRAS = "bufetea_demo_extras";
export const COOKIE_SOLICITUDES = "bufetea_demo_solicitudes";

async function estadoDemo() {
  const c = await cookies();
  const [plan, fact] = (c.get(COOKIE_PLAN)?.value ?? "professional:mensual").split(":");
  const ids = COMERCIAL_DEMO.extras.map((e) => e.id);
  const lista = (v?: string) => (v ?? "").split(",").filter((x) => ids.includes(x)) as IdExtra[];
  return {
    plan: COMERCIAL_DEMO.planes.some((p) => p.id === plan) ? plan : "starter",
    facturacion: (fact === "anual" ? "anual" : "mensual") as Facturacion,
    contratados: lista(c.get(COOKIE_EXTRAS)?.value),
    solicitudes: lista(c.get(COOKIE_SOLICITUDES)?.value),
  };
}

export async function sesion(): Promise<Sesion> {
  const e = await estadoDemo();
  return {
    usuarioId: "demo-elena",
    email: "elena@ortegaruiz.es",
    nombre: "Elena Ortega",
    rol: "admin",
    esBufeteaAdmin: false,
    demo: true,
    despacho: {
      id: "demo",
      nombre: "Ortega & Ruiz Abogados",
      slug: "ortega-ruiz-abogados",
      plan_id: e.plan,
      facturacion: e.facturacion,
      estado: "piloto",
      piloto_fin: "2026-12-05",
      fundador: true,
      precio_congelado_hasta: "2027-11-05",
      firma: "Elena Ortega · Ortega & Ruiz Abogados",
      email_respuesta: "despacho@ortegaruiz.es",
      art28_aceptado_en: "2026-11-05T10:00:00Z",
      art28_version: "v1",
    },
  };
}

export async function planes(): Promise<PlanCompleto[]> {
  return COMERCIAL_DEMO.planes;
}

export async function misExtras(): Promise<ExtraEstado[]> {
  const e = await estadoDemo();
  const plan = COMERCIAL_DEMO.planes.find((p) => p.id === e.plan)!;
  return COMERCIAL_DEMO.extras.map((x) => {
    const incluido = plan.incluye.includes(x.id);
    const contratado = e.contratados.includes(x.id as IdExtra);
    return {
      extra_id: x.id as IdExtra,
      nombre: x.nombre,
      subtitulo: x.subtitulo ?? null,
      precio_mes: x.precio_mes,
      desde: !!x.desde,
      caracteristicas: x.caracteristicas,
      nota: x.nota,
      activo: incluido || contratado,
      origen: incluido ? "incluido" : contratado ? "contratado" : null,
      precio_pactado: null,
      solicitud_abierta: e.solicitudes.includes(x.id as IdExtra) && !(incluido || contratado),
    };
  });
}

const ASUNTOS_ACTIVOS_DEMO = 142;

export async function estimacion(): Promise<EstimacionMes> {
  const e = await estadoDemo();
  const plan = COMERCIAL_DEMO.planes.find((p) => p.id === e.plan)!;
  const extras = COMERCIAL_DEMO.extras.filter((x) => e.contratados.includes(x.id as IdExtra));
  const r = calcularImporte(plan, e.facturacion, ASUNTOS_ACTIVOS_DEMO, extras);
  return { ...r, plan_nombre: plan.nombre, asuntos_activos_ahora: ASUNTOS_ACTIVOS_DEMO, maximo_mes: ASUNTOS_ACTIVOS_DEMO, mes: "2026-11-01" };
}

export async function avisosUso(): Promise<AvisoUso[]> {
  const e = await estadoDemo();
  const plan = COMERCIAL_DEMO.planes.find((p) => p.id === e.plan)!;
  const r: AvisoUso[] = [];
  if (ASUNTOS_ACTIVOS_DEMO >= plan.asuntos_incluidos) r.push({ mes: "2026-11-01", umbral: 100, asuntos_activos: ASUNTOS_ACTIVOS_DEMO, incluidos: plan.asuntos_incluidos, visto_en: null });
  else if (ASUNTOS_ACTIVOS_DEMO >= Math.ceil(plan.asuntos_incluidos * 0.8)) r.push({ mes: "2026-11-01", umbral: 80, asuntos_activos: ASUNTOS_ACTIVOS_DEMO, incluidos: plan.asuntos_incluidos, visto_en: null });
  return r;
}

const C = (id: string, nombre: string, extra: Partial<Cliente> = {}): Cliente => ({
  id, nombre, tipo: "Persona", email: null, telefono: null, dni: null, idioma: "es", canal: "whatsapp", codigo: "000000", notas: null, origen: "manual", eliminado: false, ...extra,
});
const CLIENTES: Cliente[] = [
  C("c1", "Lucía Martín Sáez", { email: "lucia.martin@ejemplo.es", telefono: "+34 600 000 101", codigo: "418302" }),
  C("c2", "Andrés Molina Paz", { telefono: "+34 600 000 102", codigo: "550917" }),
  C("c3", "Rosa Jiménez Llamas", { telefono: "+34 600 000 103", codigo: "204611" }),
  C("c4", "Grupo Huertas, S.L.", { tipo: "Empresa", email: "administracion@huertas.ejemplo", canal: "email", codigo: "771025" }),
  C("c5", "Inmaculada Ferrer Gil", { telefono: "+34 600 000 105", codigo: "390248" }),
  C("c6", "Pedro Navarro Ruiz", { telefono: "+34 600 000 106", codigo: "618374" }),
  C("c7", "Carmen Ibáñez Roca", { telefono: "+34 600 000 107", codigo: "802955" }),
  C("c8", "Tomás Alcaraz Vidal", { telefono: "+34 600 000 108", codigo: "137460" }),
  C("c9", "James Whitaker", { email: "james.whitaker@ejemplo.uk", idioma: "en", canal: "email", codigo: "925813" }),
];

const A = (id: string, numero: string, cliente: string, descripcion: string, area: string, abogado: string, fase: string, extra: Partial<Asunto> = {}): Asunto => {
  const c = CLIENTES.find((x) => x.id === cliente)!;
  return {
    id, numero, procedimiento: numero, juzgado: null, descripcion, area, tipo_procedimiento: null, abogado, abogado_id: null, fase_cliente: fase,
    situacion: "abierto", informar: true, fecha_apertura: "2026-09-28", cliente_id: cliente, duplicado_de: null, notas: null, origen: "manual",
    clientes: [{ id: c.id, nombre: c.nombre }], ...extra,
  };
};
const ASUNTOS: Asunto[] = [
  A("a1", "412/2026", "c1", "Reclamación de cantidad a Construcciones Levante", "Civil", "Elena Ortega", "Demanda admitida", { juzgado: "Juzgado de Primera Instancia n.º 4" }),
  A("a2", "233/2026", "c2", "Despido improcedente", "Laboral", "Javier Ruiz", "Juicio señalado", { juzgado: "Juzgado de lo Social n.º 2" }),
  A("a3", "145/2026", "c3", "Desahucio por impago de rentas", "Civil", "Marta Gil", "Lanzamiento señalado"),
  A("a4", "517/2025", "c4", "Recurso de apelación", "Civil", "Elena Ortega", "Esperando sentencia de la Audiencia", { fecha_apertura: "2025-06-10" }),
  A("a5", "377/2026", "c5", "Herencia y partición", "Civil", "Marta Gil", "Esperando certificado de últimas voluntades"),
  A("a6", "301/2026", "c6", "Reclamación por accidente de tráfico", "Civil", "Javier Ruiz", "Peritaje pendiente"),
  A("a7", "88/2026", "c7", "Divorcio de mutuo acuerdo", "Familia", "Marta Gil", "Pendiente de ratificación", { informar: false }),
  A("a8", "610/2026", "c8", "Diligencias previas", "Penal", "Javier Ruiz", "Instrucción", { informar: false }),
  A("a9", "198/2025", "c6", "Reclamación a la comunidad de propietarios", "Civil", "Elena Ortega", "Terminado", { situacion: "cerrado", fecha_apertura: "2025-03-02" }),
];

const MENSAJES: Mensaje[] = [
  { id: "m1", asunto_id: "a1", cliente_id: "c1", tipo: "novedad", canal: "whatsapp", titulo: "Demanda admitida",
    cuerpo: "Hola, Lucía. El juzgado ha admitido su demanda. Ahora la constructora tiene 20 días hábiles para contestar. Usted no tiene que hacer nada.",
    estado: "enviado", creado_en: "2026-11-03T09:14:00Z", enviado_en: "2026-11-03T09:16:00Z", programado_para: null, auto: false },
  { id: "m2", asunto_id: "a2", cliente_id: "c2", tipo: "recordatorio_semana", canal: "whatsapp", titulo: "Preparación del juicio",
    cuerpo: "Hola, Andrés. Le recordamos su juicio el 14 de enero a las 10:20 en el Juzgado de lo Social n.º 2 (sala 3). Traiga su DNI, la carta de despido y sus últimas nóminas.",
    estado: "borrador", creado_en: "2026-11-05T09:31:00Z", enviado_en: null, programado_para: "2027-01-07T09:00:00Z", auto: false },
];

const filtrar = (q: string, ...campos: (string | null | undefined)[]) => {
  const t = q.trim().toLowerCase();
  return !t || campos.some((c) => (c ?? "").toLowerCase().includes(t));
};

export async function clientes(q = ""): Promise<{ filas: Cliente[]; total: number }> {
  const filas = CLIENTES.filter((c) => filtrar(q, c.nombre, c.email, c.telefono, c.dni));
  return { filas, total: filas.length };
}
export async function cliente(id: string) {
  const c = CLIENTES.find((x) => x.id === id);
  if (!c) return null;
  return { cliente: c, asuntos: ASUNTOS.filter((a) => a.clientes.some((x) => x.id === id)), mensajes: MENSAJES.filter((m) => m.cliente_id === id) };
}
export async function asuntos(f: { q?: string; situacion?: string } = {}): Promise<{ filas: Asunto[]; total: number }> {
  const filas = ASUNTOS.filter((a) => (!f.situacion || f.situacion === "todos" || a.situacion === f.situacion) && filtrar(f.q ?? "", a.numero, a.descripcion, a.juzgado, a.procedimiento));
  return { filas, total: filas.length };
}
export async function asunto(id: string) {
  const a = ASUNTOS.find((x) => x.id === id);
  return a ? { asunto: a, mensajes: MENSAJES.filter((m) => m.asunto_id === id) } : null;
}
export async function equipo(): Promise<Miembro[]> {
  return [
    { id: "demo-elena", nombre: "Elena Ortega", email: "elena@ortegaruiz.es", rol: "admin", activo: true },
    { id: "demo-javier", nombre: "Javier Ruiz", email: "javier@ortegaruiz.es", rol: "abogado", activo: true },
    { id: "demo-marta", nombre: "Marta Gil", email: "marta@ortegaruiz.es", rol: "abogado", activo: true },
    { id: "demo-carmen", nombre: "Carmen", email: "carmen@ortegaruiz.es", rol: "administrativo", activo: true },
  ];
}
export async function llamadas(): Promise<Llamada[]> {
  return [
    { id: "l1", nombre: "Raúl Ortiz Campos", telefono: "+34 6·· ··· 311", tipo: "consulta_nueva", urgente: true, tema: "Despido",
      resumen: "Recibió la carta de despido el 28 de octubre. Plazo corto: marcado como urgente. Cita propuesta mañana a las 9:30 con Javier Ruiz.",
      verificado: false, atendida: false, creado_en: "2026-11-04T21:42:00Z" },
    { id: "l2", nombre: "Lucía Martín Sáez", telefono: "+34 600 000 101", tipo: "cliente", urgente: false, tema: "¿Cómo va lo mío?",
      resumen: "Confirmó su código. Se le contó la última novedad aprobada: demanda admitida; la constructora tiene 20 días hábiles para contestar.",
      verificado: true, atendida: true, creado_en: "2026-11-04T18:05:00Z" },
  ];
}
export async function hoy(): Promise<ResumenHoy> {
  return {
    porRevisar: 3,
    asuntosActivos: ASUNTOS_ACTIVOS_DEMO,
    informados: 92,
    novedades: [
      { id: "n1", hora: "09:14", cliente: "Lucía Martín Sáez", texto: "Decreto · Demanda admitida. Emplazada la demandada", estado: "Nueva", href: "/asuntos/a1" },
      { id: "n2", hora: "09:31", cliente: "Andrés Molina Paz", texto: "Diligencia · Juicio el 14 de enero a las 10:20", estado: "Borrador listo", href: "/asuntos/a2" },
      { id: "n3", hora: "41 d", cliente: "Grupo Huertas, S.L.", texto: "Recurso de apelación · sin noticias", estado: "Contarle algo", href: "/asuntos/a4" },
    ],
  };
}
