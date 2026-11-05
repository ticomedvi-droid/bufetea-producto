import Link from "next/link";
import { FormAccion } from "@/components/Envio";
import { hace } from "@/lib/fechas";
import type { Integracion } from "@/lib/tipos";
import { demoIntegrado, pedirComprobarPrograma } from "@/app/(despacho)/acciones-nucleo";

/** Cabecera de Clientes y Asuntos: modo integrado (sincroniza solo) o independiente (importación y alta manual). */
export function Sincronizacion({ i, que, demo }: { i: Integracion; que: "clientes" | "asuntos"; demo: boolean }) {
  const alta = que === "clientes" ? "/clientes/nuevo" : "/asuntos/nuevo";
  if (i.conectada) {
    return (
      <div className="toolbar" style={{ justifyContent: "space-between" }} data-modo="integrado">
        <span className="tag green" title="Bufetea lee tu programa en modo de solo lectura y nunca escribe en él">
          Sincronizado con tu programa de gestión · última actualización {hace(i.ultimaSync)}
        </span>
        {i.error && <span className="tag warn">La última sincronización dio un error: lo estamos revisando</span>}
        <span className="actions">
          <Link className="btn link" href={alta}>{que === "clientes" ? "Añadir un cliente que no está en tu programa" : "Añadir un asunto que no está en tu programa"}</Link>
          {demo && <FormAccion accion={demoIntegrado}><input type="hidden" name="on" value="0" /><button className="btn link" type="submit">Ver sin conexión (demo)</button></FormAccion>}
        </span>
      </div>
    );
  }
  return (
    <div className="grid2" data-modo="independiente">
      <div className="panel">
        <h2>{que === "clientes" ? "Trae tus clientes y asuntos" : "Trae tus asuntos"}</h2>
        <div className="cuerpo">
          <p className="mute">Sube una hoja de cálculo (CSV o Excel) exportada de tu programa o de tu agenda. Bufetea no duplica nada: completa lo que ya tienes.</p>
          <div className="actions">
            <Link className="btn primary sm" href="/clientes/importar">Importar CSV o Excel</Link>
            <Link className="btn ghost sm" href={alta}>{que === "clientes" ? "Nuevo cliente" : "Nuevo asunto"}</Link>
          </div>
        </div>
      </div>
      <FormAccion accion={pedirComprobarPrograma} className="panel">
        <h2>¿Tu programa de gestión se puede conectar?</h2>
        <div className="cuerpo">
          <p className="mute">Si se puede, tus clientes, asuntos y agenda se sincronizan solos, en modo de solo lectura. Dinos cuál usáis y lo comprobamos.</p>
          <div className="toolbar">
            <div className="fld" style={{ flex: "1 1 200px" }}><label htmlFor="cp-prog" className="sr">Programa de gestión</label>
              <input id="cp-prog" name="programa" placeholder="El programa que usáis" maxLength={80} required /></div>
            <button className="btn ghost sm" type="submit">Comprobarlo</button>
          </div>
        </div>
      </FormAccion>
      {demo && (
        <FormAccion accion={demoIntegrado} className="note">
          <input type="hidden" name="on" value="1" />Demo: <button className="btn link" type="submit">ver cómo es con el programa conectado</button>
        </FormAccion>
      )}
    </div>
  );
}
