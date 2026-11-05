import type { Metadata } from "next";
import { EnPreparacion } from "@/components/BloqueoExtra";

export const metadata: Metadata = { title: "Clientes sin noticias" };

export default function Pagina() {
  return <EnPreparacion titulo="Clientes sin noticias" texto="Aquí verás qué clientes llevan más de 30 días sin noticias de su asunto, con un mensaje propuesto para contarles cómo va." />;
}
