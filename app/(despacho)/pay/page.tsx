import type { Metadata } from "next";
import { EnPreparacion } from "@/components/BloqueoExtra";
import { PaginaExtra } from "@/components/PaginaExtra";

export const metadata: Metadata = { title: "Cobro de provisiones" };

export default function Pagina() {
  return (
    <PaginaExtra id="pay">
      {() => <EnPreparacion titulo="Cobro de provisiones" texto="Aquí pedirás provisiones y minutas con un enlace de pago seguro, con recordatorios y el panel de lo cobrado y lo pendiente. El dinero va directo a la cuenta del despacho." />}
    </PaginaExtra>
  );
}
