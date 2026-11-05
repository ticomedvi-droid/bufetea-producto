import type { Metadata } from "next";
import Link from "next/link";
import { FormAccion } from "@/components/Envio";
import { recuperar } from "../acciones";
import { PanelMarca } from "../PanelMarca";

export const metadata: Metadata = { title: "Recuperar la contraseña" };

export default function Recuperar() {
  return (
    <div className="login" role="main">
      <PanelMarca />
      <div className="lr">
        <FormAccion accion={recuperar} className="card">
          <div><h1>¿Has olvidado la contraseña?</h1><p className="mute" style={{ marginTop: 6 }}>Te enviamos un enlace al correo para elegir una nueva.</p></div>
          <div className="fld"><label htmlFor="r-email">Correo electrónico</label><input id="r-email" name="email" type="email" autoComplete="username" required /></div>
          <button className="btn primary" type="submit">Enviarme el enlace</button>
          <p className="mute" style={{ fontSize: ".9rem" }}><Link href="/entrar">Volver a entrar</Link></p>
        </FormAccion>
      </div>
    </div>
  );
}
