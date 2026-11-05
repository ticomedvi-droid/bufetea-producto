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
