import type { Metadata } from "next";
import { FormCliente } from "@/components/FormCliente";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default function Nuevo() {
  return (
    <div className="panel">
      <h2>Nuevo cliente</h2>
      <div className="cuerpo">
        <p className="note">Al darlo de alta, Bufetea le asigna un código de verificación. Sin ese código no se le da información de su asunto por ningún canal.</p>
        <FormCliente />
      </div>
    </div>
  );
}
