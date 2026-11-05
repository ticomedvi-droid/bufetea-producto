import type { Metadata } from "next";
import { EnPreparacion } from "@/components/BloqueoExtra";
import { PaginaExtra } from "@/components/PaginaExtra";

export const metadata: Metadata = { title: "Portal del cliente" };

export default function Pagina() {
  return (
    <PaginaExtra id="portal">
      {() => <EnPreparacion titulo="Portal del cliente" texto="Aquí configurarás la marca de tu despacho y verás qué clientes han entrado. Cada cliente entra con su DNI y un código que le llega al correo de su ficha, y ve solo lo que aprobaste." />}
    </PaginaExtra>
  );
}
