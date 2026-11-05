import type { IdExtra } from "@/lib/tipos";

// Textos de las fichas de extras con candado, tal como los enseña la web (producto.html). Los precios NO van aquí: salen de la tabla extras.
export const INFO_EXTRA: Record<IdExtra, { menu: string; ruta: string; d: string; b: string[] }> = {
  voice: {
    menu: "Centralita con IA",
    ruta: "/voice",
    d: "Atiende el teléfono cuando no podéis o fuera de horario, reconoce al cliente, le pide su código y le cuenta solo lo que ya aprobaste.",
    b: ["Ninguna llamada perdida, ni en sala ni de noche", "Clientes nuevos con cita propuesta", "Cada llamada en su asunto, con resumen"],
  },
  portal: {
    menu: "Portal del cliente",
    ruta: "/portal",
    d: "Una web con la marca de tu despacho donde cada cliente ve en qué fase está su asunto y la última novedad aprobada.",
    b: ["Sin instalar nada ni contraseñas", "Mapa del procedimiento siempre al día", "Menos llamadas: lo puede mirar él"],
  },
  docs: {
    menu: "Documentos y firma",
    ruta: "/docs",
    d: "Pide por WhatsApp los documentos que faltan, recuerda lo pendiente y envía la hoja de encargo para firmar desde el móvil.",
    b: ["Lista de documentos por tipo de asunto", "Recordatorios que salen solos", "Firma electrónica cualificada"],
  },
  pay: {
    menu: "Cobro de provisiones",
    ruta: "/pay",
    d: "Recuerda a cada cliente lo que tiene pendiente, con un enlace de pago seguro. El dinero va directo a tu cuenta.",
    b: ["Recordatorios con enlace de pago", "Pendiente y cobrado de un vistazo", "Bufetea no toca tu dinero ni guarda tarjetas"],
  },
};

export const FUNCIONES_INCLUIDAS = [
  "Notificaciones explicadas", "WhatsApp del despacho", "«¿Cómo va lo mío?» con código", "Clientes nuevos", "En el idioma del cliente",
  "Preparación del juicio", "Clientes sin noticias", "Mapa del procedimiento", "Cierre con reseña", "Índice y sello",
];

export const IDIOMAS: Record<string, string> = {
  es: "Español", en: "Inglés", ro: "Rumano", fr: "Francés", ar: "Árabe", zh: "Chino", de: "Alemán", it: "Italiano", pt: "Portugués",
  ca: "Catalán", uk: "Ucraniano", ru: "Ruso", pl: "Polaco", bg: "Búlgaro", nl: "Neerlandés",
};

export const ROLES: Record<string, string> = { admin: "Titular", abogado: "Abogado/a", administrativo: "Administración" };
export const SITUACIONES: Record<string, string> = { abierto: "Abierto", cerrado: "Cerrado", archivado: "Archivado" };
