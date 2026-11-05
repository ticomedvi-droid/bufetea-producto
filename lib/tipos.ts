import type { Estimacion, Facturacion, Plan } from "@/lib/precio";

export type Rol = "admin" | "abogado" | "administrativo";
export type IdExtra = "voice" | "portal" | "docs" | "pay";
export type Situacion = "abierto" | "cerrado" | "archivado";
export type Canal = "whatsapp" | "email";

export type PlanCompleto = Plan & {
  para: string | null;
  recomendado: boolean;
  caracteristicas: string[];
  soporte_prioritario: boolean;
  acompanamiento: boolean;
};

export type Despacho = {
  id: string;
  nombre: string;
  slug: string | null;
  plan_id: string;
  facturacion: Facturacion;
  estado: "piloto" | "activo" | "cancelado";
  piloto_fin: string | null;
  fundador: boolean;
  precio_congelado_hasta: string | null;
  firma: string | null;
  email_respuesta: string | null;
  art28_aceptado_en: string | null;
  art28_version: string | null;
};

export type Sesion = {
  usuarioId: string;
  email: string;
  nombre: string | null;
  rol: Rol;
  despacho: Despacho;
  esBufeteaAdmin: boolean;
  demo: boolean;
};

export type ExtraEstado = {
  extra_id: IdExtra;
  nombre: string;
  subtitulo: string | null;
  precio_mes: number;
  desde: boolean;
  caracteristicas: string[];
  nota: string | null;
  activo: boolean;
  origen: "incluido" | "contratado" | null;
  precio_pactado: number | null;
  solicitud_abierta: boolean;
};

export type Cliente = {
  id: string;
  nombre: string;
  tipo: string | null;
  email: string | null;
  telefono: string | null;
  dni: string | null;
  idioma: string;
  canal: Canal;
  codigo: string | null;
  notas: string | null;
  origen: string;
  eliminado: boolean;
};

export type Asunto = {
  id: string;
  numero: string | null;
  procedimiento: string | null;
  juzgado: string | null;
  descripcion: string | null;
  area: string | null;
  tipo_procedimiento: string | null;
  abogado: string | null;
  abogado_id: string | null;
  fase_cliente: string | null;
  situacion: Situacion;
  informar: boolean;
  fecha_apertura: string | null;
  cliente_id: string | null;
  duplicado_de: string | null;
  notas: string | null;
  origen: string;
  clientes: { id: string; nombre: string }[];
};

export type Mensaje = {
  id: string;
  asunto_id: string | null;
  cliente_id: string | null;
  tipo: string;
  canal: string;
  titulo: string;
  cuerpo: string;
  estado: string;
  creado_en: string;
  enviado_en: string | null;
  programado_para: string | null;
  auto: boolean;
};

export type Miembro = { id: string; nombre: string | null; email: string | null; rol: Rol; activo: boolean };

export type AvisoUso = { mes: string; umbral: 80 | 100; asuntos_activos: number; incluidos: number; visto_en: string | null };

export type EstimacionMes = Estimacion & { asuntos_activos_ahora: number; maximo_mes: number; mes: string; plan_nombre?: string };

export type ResumenHoy = {
  porRevisar: number;
  asuntosActivos: number;
  informados: number | null; // porcentaje
  novedades: { id: string; hora: string; cliente: string; texto: string; estado: "Nueva" | "Borrador listo" | "Por aprobar" | "Contarle algo"; href: string }[];
};

export type Llamada = { id: string; nombre: string | null; telefono: string | null; tipo: string; urgente: boolean; tema: string | null; resumen: string; verificado: boolean; atendida: boolean; creado_en: string };

// ---------- Fase 3 ----------
export type Integracion = { conectada: boolean; ultimaSync: string | null; error: string | null };

export type Notificacion = {
  id: string;
  asunto_id: string | null;
  origen: "buzon" | "subida" | "conector";
  archivo_nombre: string | null;
  estado: "recibida" | "interpretando" | "lista" | "enviada" | "no_contar" | "revisada" | "error";
  error: string | null;
  tipo_resolucion: string | null;
  organo: string | null;
  procedimiento: string | null;
  lo_que_dice: string | null;
  resumen: string | null;
  plazo_tipo: string | null;
  plazo_descripcion: string | null;
  plazo_dias: number | null;
  plazo_fecha: string | null;
  senalamiento_en: string | null;
  cliente_debe_actuar: boolean | null;
  accion_cliente: string | null;
  fase_sugerida: string | null;
  ia: string | null;
  creada_en: string;
  asunto: { id: string; numero: string | null; descripcion: string | null; informar: boolean; abogado: string | null; area: string | null } | null;
  cliente: { id: string; nombre: string; idioma: string; canal: string } | null;
  mensaje: Mensaje & { cuerpo_es: string | null; idioma: string; destinatario: string | null; aprobado_por: string | null } | null;
};

export type ReglaId = "recordatorio_semana" | "recordatorio_vispera" | "respuesta_codigo" | "consultas_nuevas" | "avisos_sin_noticias" | "cierre";

export type Aviso = Mensaje & { cliente: string | null; asunto: string | null; regla_auto: string | null };

export type Conversacion = {
  id: string; telefono: string; nombre_perfil: string | null; cliente_id: string | null; cliente: string | null;
  ultimo_entrante_en: string | null; ultimo_mensaje_en: string; no_leidos: number; verificada: boolean;
  propuesta: string | null; propuesta_motivo: string | null; ultimo_texto: string | null;
};
export type MensajeWA = {
  id: string; direccion: "entrada" | "salida"; tipo: string; texto: string | null; transcripcion: string | null;
  media_path: string | null; estado: string; auto: boolean; regla_auto: string | null; creado_en: string; enviado_por_nombre: string | null;
};

export type SinNoticias = { asunto_id: string; numero: string | null; descripcion: string | null; cliente_id: string; cliente: string; dias: number; borrador: string | null };

export type Indice = { porcentaje: number | null; clientes: number; informados: number; asuntos: number; sello: boolean; sin_datos: boolean };
export type Indicadores = { minutos_medios_notificacion: number | null; como_va_lo_mio: number; asuntos_excluidos: number };
