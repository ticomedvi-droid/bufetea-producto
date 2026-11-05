import type { IdExtra } from "@/lib/tipos";

// Menú lateral por pilares, como producto.html. Los extras van en el grupo «Amplía».
export type Entrada = { ruta: string; texto: string; sub?: string; extra?: IdExtra; contador?: "revisar" | "whatsapp" };
export const MENU: { grupo: string | null; entradas: Entrada[] }[] = [
  { grupo: null, entradas: [{ ruta: "/hoy", texto: "Hoy" }] },
  { grupo: "Informa", entradas: [{ ruta: "/notificaciones", texto: "Notificaciones explicadas", contador: "revisar" }, { ruta: "/avisos", texto: "Avisos que salen solos" }] },
  { grupo: "Atiende", entradas: [{ ruta: "/whatsapp", texto: "WhatsApp del despacho", contador: "whatsapp" }, { ruta: "/consultas", texto: "Clientes nuevos" }] },
  { grupo: "Acompaña", entradas: [{ ruta: "/sin-noticias", texto: "Clientes sin noticias" }, { ruta: "/indice", texto: "Índice y sello" }] },
  {
    grupo: "Amplía",
    entradas: [
      { ruta: "/voice", texto: "Bufetea Voice", sub: "Centralita con IA", extra: "voice" },
      { ruta: "/portal", texto: "Bufetea Portal", sub: "Portal del cliente", extra: "portal" },
      { ruta: "/docs", texto: "Bufetea Docs", sub: "Documentos y firma", extra: "docs" },
      { ruta: "/pay", texto: "Bufetea Pay", sub: "Cobro de provisiones", extra: "pay" },
    ],
  },
  {
    grupo: "Tu despacho",
    entradas: [{ ruta: "/clientes", texto: "Clientes" }, { ruta: "/asuntos", texto: "Asuntos" }, { ruta: "/plan", texto: "Tu plan" }, { ruta: "/ajustes", texto: "Ajustes" }],
  },
];

export function tituloDe(ruta: string) {
  for (const g of MENU) for (const e of g.entradas) if (ruta === e.ruta || ruta.startsWith(e.ruta + "/")) return e.texto;
  return "Bufetea";
}
