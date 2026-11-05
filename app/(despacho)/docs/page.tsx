import type { Metadata } from "next";
import { EnPreparacion } from "@/components/BloqueoExtra";
import { PaginaExtra } from "@/components/PaginaExtra";

export const metadata: Metadata = { title: "Documentos y firma" };

export default function Pagina() {
  return (
    <PaginaExtra id="docs">
      {() => <EnPreparacion titulo="Documentos y firma" texto="Aquí pedirás documentos por WhatsApp con su lista por tipo de asunto, verás lo recibido y lo pendiente, y enviarás la hoja de encargo para firmar con un prestador cualificado." />}
    </PaginaExtra>
  );
}
