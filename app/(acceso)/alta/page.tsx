import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormAccion } from "@/components/Envio";
import { MODO_DEMO } from "@/lib/config";
import { sesion } from "@/lib/datos";
import { altaDespacho } from "../acciones";
import { PanelMarca } from "../PanelMarca";

export const metadata: Metadata = { title: "Alta del despacho" };

export default async function Alta() {
  const s = await sesion();
  if (MODO_DEMO || (s && s !== "sin-despacho")) redirect("/hoy");
  if (!s) redirect("/entrar");
  return (
    <div className="login" role="main">
      <PanelMarca />
      <div className="lr">
        <FormAccion accion={altaDespacho} className="card">
          <div><h1>Da de alta tu despacho</h1><p className="mute" style={{ marginTop: 6 }}>Serás la persona titular: podrás invitar al resto del equipo, sin pagar por usuario.</p></div>
          <div className="fld"><label htmlFor="a-n">Nombre del despacho</label><input id="a-n" name="nombre" required minLength={2} maxLength={160} autoComplete="organization" /></div>
          <div className="fld"><label htmlFor="a-y">Tu nombre</label><input id="a-y" name="mi_nombre" maxLength={120} autoComplete="name" /></div>
          <label className="check"><input type="checkbox" name="art28" required />
            <span>He leído y acepto el <Link href="/contrato-encargo" target="_blank" className="lnk">contrato de encargo del tratamiento (art. 28 del RGPD)</Link>. Mi despacho es el responsable de los datos y Bufetea, el encargado.</span></label>
          <button className="btn primary" type="submit">Crear el despacho</button>
        </FormAccion>
      </div>
    </div>
  );
}
