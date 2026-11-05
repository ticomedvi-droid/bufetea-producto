import type { Metadata } from "next";
import Link from "next/link";
import { FormAccion } from "@/components/Envio";
import { MODO_DEMO } from "@/lib/config";
import { entrar } from "../acciones";
import { PanelMarca } from "../PanelMarca";

export const metadata: Metadata = { title: "Entrar" };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ vuelta?: string }> }) {
  const { vuelta } = await searchParams;
  return (
    <div className="login" role="main">
      <PanelMarca />
      <div className="lr">
        <FormAccion accion={entrar} className="card">
          <div><h1 id="l-tit">Bienvenido de nuevo</h1><p className="mute" style={{ marginTop: 6 }}>Accede a tu despacho.</p></div>
          <input type="hidden" name="vuelta" value={vuelta ?? "/hoy"} />
          <div className="fld"><label htmlFor="l-email">Correo electrónico</label>
            <input id="l-email" name="email" type="email" autoComplete="username" required defaultValue={MODO_DEMO ? "elena@ortegaruiz.es" : undefined} /></div>
          <div className="fld"><label htmlFor="l-pass">Contraseña <Link href="/recuperar">¿La has olvidado?</Link></label>
            <input id="l-pass" name="clave" type="password" autoComplete="current-password" required defaultValue={MODO_DEMO ? "bufetea-demo" : undefined} /></div>
          <button className="btn primary" type="submit">Entrar</button>
          {MODO_DEMO && <p className="demohint"><b>Ejemplo de demostración con datos ficticios.</b> El acceso ya está relleno: pulsa «Entrar».</p>}
        </FormAccion>
      </div>
    </div>
  );
}
