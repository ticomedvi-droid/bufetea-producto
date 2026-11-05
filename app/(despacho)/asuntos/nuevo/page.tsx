import type { Metadata } from "next";
import { FormAsunto } from "@/components/FormAsunto";
import { clientes, equipo } from "@/lib/datos";

export const metadata: Metadata = { title: "Nuevo asunto" };

export default async function Nuevo({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const [eq, cs] = await Promise.all([equipo(), clientes("", 0, 1000)]);
  return (
    <div className="panel"><h2>Nuevo asunto</h2>
      <div className="cuerpo"><FormAsunto equipo={eq} clienteId={cliente} clientes={cs.filas.map((c) => ({ id: c.id, nombre: c.nombre }))} /></div>
    </div>
  );
}
