import type { Metadata } from "next";
import { PanelMarca } from "../PanelMarca";
import { NuevaContrasena } from "./NuevaContrasena";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function Pagina() {
  return (
    <div className="login" role="main">
      <PanelMarca />
      <div className="lr"><NuevaContrasena /></div>
    </div>
  );
}
