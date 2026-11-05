import "server-only";
import { cookies } from "next/headers";
import { calcularImporte, type Facturacion } from "@/lib/precio";
import type {
  Asunto, Aviso, AvisoUso, Cliente, Conversacion, EstimacionMes, ExtraEstado, IdExtra, Indicadores, Indice, Integracion, Llamada, Mensaje,
  MensajeWA, Miembro, Notificacion, PlanCompleto, ReglaId, ResumenHoy, Sesion, SinNoticias,
} from "@/lib/tipos";
import { COMERCIAL_DEMO } from "./comercial-demo";

// Modo demostración: los mismos datos ficticios que enseña la web (producto.html). No se guarda nada en ninguna base de datos.
// El plan y los extras de la demo se recuerdan en cookies para poder probar los candados.
export const COOKIE_PLAN = "bufetea_demo_plan";
export const COOKIE_EXTRAS = "bufetea_demo_extras";
export const COOKIE_SOLICITUDES = "bufetea_demo_solicitudes";
export const COOKIE_INTEGRADO = "bufetea_demo_integrado";
export const COOKIE_REGLAS = "bufetea_demo_reglas";
export const COOKIE_RESUELTAS = "bufetea_demo_resueltas";

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
const HOY = "2026-11-05";
const N = (id: string, hora: string, asunto: string, doc: string, texto: string, resumen: string, borrador: string, plazo: [string | null, string | null, number | null], fase: string,
  extra: Partial<Notificacion> = {}): Notificacion => {
  const a = ASUNTOS.find((x) => x.id === asunto)!;
  const c = CLIENTES.find((x) => x.id === a.cliente_id)!;
  return {
    id, asunto_id: a.id, origen: "buzon", archivo_nombre: `${doc} ${a.numero}.pdf`, estado: "lista", error: null, tipo_resolucion: doc, organo: a.juzgado,
    procedimiento: a.numero, lo_que_dice: texto, resumen, plazo_tipo: plazo[0], plazo_descripcion: plazo[0], plazo_dias: plazo[2], plazo_fecha: plazo[1],
    senalamiento_en: null, cliente_debe_actuar: false, accion_cliente: null, fase_sugerida: fase, ia: "claude-opus-5-5", creada_en: `${HOY}T${hora}:00+01:00`,
    asunto: { id: a.id, numero: a.numero, descripcion: a.descripcion, informar: a.informar, abogado: a.abogado, area: a.area },
    cliente: { id: c.id, nombre: c.nombre, idioma: c.idioma, canal: c.canal },
    mensaje: borrador ? { id: `m-${id}`, asunto_id: a.id, cliente_id: c.id, tipo: "novedad", canal: c.canal, titulo: fase, cuerpo: borrador, cuerpo_es: borrador,
      idioma: c.idioma, destinatario: c.telefono ?? c.email, aprobado_por: null, estado: "borrador", creado_en: `${HOY}T${hora}:00+01:00`, enviado_en: null, programado_para: null, auto: false } : null,
    ...extra,
  };
};

const NOTIFICACIONES: Notificacion[] = [
  N("n1", "09:14", "a1", "Decreto",
    "Se admite a trámite la demanda presentada por el procurador Sr. Gálvez en nombre de D.ª Lucía Martín Sáez frente a Construcciones Levante, S.L. Dese traslado de la misma a la parte demandada, emplazándola para que la conteste en el plazo de veinte días hábiles, con los apercibimientos legales.",
    "Demanda admitida. Emplazada la demandada para contestar en 20 días hábiles. El cliente no tiene que hacer nada.",
    "Hola, Lucía. El juzgado ha admitido su demanda. Ahora la constructora tiene 20 días hábiles para contestar. Usted no tiene que hacer nada: le avisaremos en cuanto haya novedades.\n\nUn saludo,\nOrtega & Ruiz Abogados",
    ["Contestación de la demandada", "2026-12-01", 20], "Demanda admitida"),
  N("n2", "09:31", "a2", "Diligencia de ordenación",
    "Se señala para la celebración de los actos de conciliación y, en su caso, juicio el día 14 de enero de 2027, a las 10:20 horas, en la Sala de Vistas n.º 3 de este Juzgado de lo Social n.º 2. Cítese a las partes, con la advertencia de que la incomparecencia injustificada del demandante supondrá tenerle por desistido de su demanda.",
    "Conciliación y juicio el 14/01/2027 a las 10:20, sala 3. Advertencia de desistimiento si no comparece el actor.",
    "Hola, Andrés. Ya hay fecha para su juicio: el 14 de enero a las 10:20, en el Juzgado de lo Social n.º 2, sala 3. Es importante que venga ese día. Javier le llamará antes para preparar juntos el juicio.\n\nUn saludo,\nOrtega & Ruiz Abogados",
    [null, null, null], "Juicio señalado", { senalamiento_en: "2027-01-14T10:20:00+01:00" }),
  N("n3", "10:02", "a3", "Diligencia de ordenación",
    "No constando que la parte demandada haya desalojado voluntariamente el inmueble, se mantiene la fecha señalada para la práctica de la diligencia de lanzamiento el día 2 de diciembre de 2026, a las 11:00 horas, debiendo la parte actora facilitar los medios necesarios para su práctica.",
    "Se mantiene el lanzamiento: 02/12/2026 a las 11:00. La actora debe facilitar medios (cerrajero).",
    "Hola, Rosa. Se mantiene el lanzamiento: el 2 de diciembre a las 11:00 recuperará la vivienda. Ese día hará falta un cerrajero; Marta le llamará esta semana para organizarlo todo.\n\nUn saludo,\nOrtega & Ruiz Abogados",
    [null, null, null], "Lanzamiento señalado", { senalamiento_en: "2026-12-02T11:00:00+01:00" }),
  N("n4", "10:47", "a8", "Auto",
    "Se acuerda recibir declaración en calidad de investigado a D. Tomás Alcaraz Vidal, citándole para el día 27 de noviembre de 2026 a las 9:30 horas, debiendo comparecer asistido de letrado.",
    "Citación como investigado el 27/11/2026 a las 9:30, con letrado.", "", [null, null, null], "Citado a declarar", { senalamiento_en: "2026-11-27T09:30:00+01:00" }),
];

async function estadoExtra() {
  const c = await cookies();
  const reglas = c.get(COOKIE_REGLAS)?.value;
  return {
    integrado: c.get(COOKIE_INTEGRADO)?.value === "1",
    reglas: (reglas == null ? ["recordatorio_semana", "recordatorio_vispera", "respuesta_codigo"] : reglas.split(",").filter(Boolean)) as ReglaId[],
    resueltas: (c.get(COOKIE_RESUELTAS)?.value ?? "").split(",").filter(Boolean),
  };
}

export async function integracion(): Promise<Integracion> {
  const e = await estadoExtra();
  return e.integrado ? { conectada: true, ultimaSync: new Date(Date.now() - 7 * 60e3).toISOString(), error: null } : { conectada: false, ultimaSync: null, error: null };
}
export async function indice(): Promise<Indice> {
  return { porcentaje: 92, clientes: 142, informados: 131, asuntos: 142, sello: true, sin_datos: false };
}
export async function indicadores(): Promise<Indicadores> {
  return { minutos_medios_notificacion: 200, como_va_lo_mio: 9, asuntos_excluidos: 2 };
}
export async function historicoIndice() {
  return [{ mes: "2026-10-01", porcentaje: 89, sello: true }, { mes: "2026-09-01", porcentaje: 84, sello: false }, { mes: "2026-08-01", porcentaje: 81, sello: false }];
}
export async function notificaciones(filtro: "pendientes" | "todas" = "pendientes"): Promise<Notificacion[]> {
  const e = await estadoExtra();
  const lista = NOTIFICACIONES.map((n) => (e.resueltas.includes(n.id) ? { ...n, estado: "enviada" as const } : n));
  return filtro === "pendientes" ? lista.filter((n) => n.estado === "lista") : lista;
}
export async function reglas(): Promise<ReglaId[]> {
  return (await estadoExtra()).reglas;
}
export async function avisos(): Promise<Aviso[]> {
  const r = await reglas();
  const A = (id: string, tipo: string, cliente: string, asunto: string, cuando: string, cuerpo: string): Aviso => {
    const auto = r.includes(tipo as ReglaId);
    return { id, asunto_id: null, cliente_id: null, tipo, canal: "whatsapp", titulo: tipo, cuerpo, estado: auto ? "programado" : "borrador", creado_en: `${HOY}T08:00:00+01:00`,
      enviado_en: null, programado_para: cuando, auto, cliente, asunto, regla_auto: auto ? tipo : null };
  };
  return [
    A("r1", "recordatorio_semana", "Pedro Navarro Ruiz", "301/2026 · Reclamación por accidente de tráfico", "2026-11-11T10:00:00+01:00",
      "Hola, Pedro. Le recordamos que el 18 de noviembre a las 16:00 tiene la reunión con el perito en el despacho. Si tiene cualquier duda, responda a este mensaje."),
    A("r2", "recordatorio_vispera", "Tomás Alcaraz Vidal", "610/2026 · Diligencias previas", "2026-11-26T10:00:00+01:00",
      "Hola, Tomás. Le recordamos que mañana, a las 9:30, tiene la declaración en el juzgado. Traiga su DNI. Javier estará con usted."),
    A("a3", "cierre", "Pedro Navarro Ruiz", "198/2025 · Reclamación a la comunidad de propietarios", "2026-11-06T10:00:00+01:00",
      "Hola, Pedro. Su asunto ha terminado. Ha sido un placer ayudarle. Si está contento con nuestro trabajo, nos ayudaría mucho que nos dejara una valoración en Google."),
  ];
}
const CONVERSACIONES: (Conversacion & { msgs: MensajeWA[] })[] = (() => {
  const W = (id: string, dir: "entrada" | "salida", texto: string, hora: string, extra: Partial<MensajeWA> = {}): MensajeWA =>
    ({ id, direccion: dir, tipo: "texto", texto, transcripcion: null, media_path: null, estado: dir === "entrada" ? "recibido" : "leido", auto: false, regla_auto: null, creado_en: `${HOY}T${hora}:00+01:00`, enviado_por_nombre: null, ...extra });
  return [
    { id: "w1", telefono: "34600000101", nombre_perfil: "Lucía", cliente_id: "c1", cliente: "Lucía Martín Sáez", ultimo_entrante_en: `${HOY}T07:47:00+01:00`, ultimo_mensaje_en: `${HOY}T07:47:00+01:00`,
      no_leidos: 2, verificada: false, ultimo_texto: "Dicen que no van a pagar las facturas de octubre…",
      propuesta: "Buenos días, Lucía. Recibido el burofax. Elena lo revisa hoy y le llamamos antes de las 13:00 para contarle cómo afecta a su demanda.",
      propuesta_motivo: "Envía un documento y una nota de voz: acuse de recibo y llamada del abogado.",
      msgs: [W("w1a", "entrada", "Buenos días. Me ha llegado esto de la constructora por burofax.", "07:45"),
        W("w1b", "entrada", "Burofax_Construcciones_Levante.jpg", "07:45", { tipo: "imagen", media_path: "demo/burofax.jpg" }),
        W("w1c", "entrada", null as unknown as string, "07:47", { tipo: "audio", transcripcion: "Dicen que no van a pagar las facturas de octubre y que reclame si quiero." })] },
    { id: "w0", telefono: "34600000103", nombre_perfil: "Rosa", cliente_id: "c3", cliente: "Rosa Jiménez Llamas", ultimo_entrante_en: `${HOY}T08:05:00+01:00`, ultimo_mensaje_en: `${HOY}T08:05:00+01:00`,
      no_leidos: 0, verificada: true, ultimo_texto: "Genial, muchas gracias 🙏", propuesta: null, propuesta_motivo: null,
      msgs: [W("w0a", "entrada", "Hola, ¿cómo va lo mío? ¿Hay fecha ya?", "08:03"),
        W("w0b", "salida", "Para hablar de su asunto necesitamos confirmar que es usted. Escriba, por favor, el código de 6 cifras que le dio el despacho.\n\n— Le atiende el asistente virtual (IA) de Ortega & Ruiz Abogados.", "08:03", { auto: true, regla_auto: "respuesta_codigo" }),
        W("w0c", "entrada", "204611", "08:04"),
        W("w0d", "salida", "Sobre «Desahucio por impago de rentas»: ahora está en la fase «Lanzamiento señalado».\n\nÚltima novedad: se mantiene el lanzamiento el 2 de diciembre a las 11:00 y ese día recuperará su vivienda.\n\n— Le atiende el asistente virtual (IA) de Ortega & Ruiz Abogados.", "08:04", { auto: true, regla_auto: "respuesta_codigo" }),
        W("w0e", "entrada", "Genial, muchas gracias 🙏", "08:05")] },
    { id: "w2", telefono: "34600999902", nombre_perfil: null, cliente_id: null, cliente: null, ultimo_entrante_en: `${HOY}T08:12:00+01:00`, ultimo_mensaje_en: `${HOY}T08:12:00+01:00`,
      no_leidos: 1, verificada: false, ultimo_texto: "Hola, ¿lleváis temas de alquileres?…",
      propuesta: "Hola. Sí, llevamos asuntos de arrendamiento. ¿Nos dice su nombre y le damos cita para una primera consulta esta semana?",
      propuesta_motivo: "Número desconocido: consulta nueva, sin dar información de ningún asunto.",
      msgs: [W("w2a", "entrada", "Hola, ¿lleváis temas de alquileres? El casero no me devuelve la fianza.", "08:12")] },
  ];
})();
export async function conversaciones(): Promise<Conversacion[]> {
  return CONVERSACIONES.map(({ msgs: _m, ...c }) => c);
}
export async function mensajesWA(id: string): Promise<MensajeWA[]> {
  return CONVERSACIONES.find((c) => c.id === id)?.msgs ?? [];
}
export async function numeroWhatsApp() {
  return { numero: "+34 960 000 000", modo: "pruebas" as const };
}
export async function sinNoticias(): Promise<SinNoticias[]> {
  return [
    { asunto_id: "a4", numero: "517/2025", descripcion: "Recurso de apelación", cliente_id: "c4", cliente: "Grupo Huertas, S.L.", dias: 41, borrador: null },
    { asunto_id: "a5", numero: "377/2026", descripcion: "Herencia y partición", cliente_id: "c5", cliente: "Inmaculada Ferrer Gil", dias: 35, borrador: null },
  ];
}

export async function hoy(): Promise<ResumenHoy> {
  const nots = await notificaciones("pendientes");
  return {
    porRevisar: nots.length,
    asuntosActivos: ASUNTOS_ACTIVOS_DEMO,
    informados: 92,
    novedades: [
      ...nots.map((n) => ({ id: n.id, hora: new Date(n.creada_en).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }),
        cliente: n.cliente?.nombre ?? "Sin asignar", texto: `${n.tipo_resolucion} · ${n.fase_sugerida}`,
        estado: (n.mensaje ? "Borrador listo" : "Nueva") as ResumenHoy["novedades"][number]["estado"], href: `/notificaciones?n=${n.id}` })),
      { id: "sn-a4", hora: "41 d", cliente: "Grupo Huertas, S.L.", texto: "Recurso de apelación · sin noticias", estado: "Contarle algo", href: "/sin-noticias" },
    ],
  };
}
