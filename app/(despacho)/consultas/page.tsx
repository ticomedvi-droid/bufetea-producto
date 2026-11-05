import type { Metadata } from "next";
import { EnPreparacion } from "@/components/BloqueoExtra";

export const metadata: Metadata = { title: "Clientes nuevos" };

export default function Pagina() {
  return <EnPreparacion titulo="Clientes nuevos" texto="Aquí verás las consultas de números desconocidos, recogidas a cualquier hora, con su resumen y la cita propuesta. Bufetea nunca da consejo jurídico." />;
}
