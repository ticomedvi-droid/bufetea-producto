import type { Metadata } from "next";
import { EnPreparacion } from "@/components/BloqueoExtra";

export const metadata: Metadata = { title: "Índice y sello" };

export default function Pagina() {
  return <EnPreparacion titulo="Índice y sello" texto="Aquí verás cada mes el porcentaje de clientes con noticias en los últimos 30 días. A partir del 85 %, tu despacho consigue el sello «Despacho que informa»." />;
}
