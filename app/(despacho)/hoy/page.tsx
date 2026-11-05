import type { Metadata } from "next";
import Link from "next/link";
import { avisosUso, estimacion, hoy, sesion } from "@/lib/datos";
import { FormAccion } from "@/components/Envio";
import { marcarAvisoVisto } from "../acciones";

export const metadata: Metadata = { title: "Hoy" };

const TAG: Record<string, string> = { Nueva: "tag red", "Borrador listo": "tag green", "Por aprobar": "tag green", "Contarle algo": "tag warn" };

function saludo() {
  const h = Number(new Date().toLocaleString("es-ES", { hour: "2-digit", hour12: false, timeZone: "Europe/Madrid" }));
  return h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";
}

export default async function Hoy() {
  const s = await sesion();
  if (!s || s === "sin-despacho") return null;
  const [h, est, avisos] = await Promise.all([hoy(), estimacion(), avisosUso()]);
  const nombre = (s.nombre ?? "").split(" ")[0];
  const aviso = s.rol === "admin" ? avisos.find((a) => !a.visto_en) : undefined;
  return (
    <>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: "1.5rem" }}>{saludo()}{nombre ? `, ${nombre}` : ""}</h2>
        {h.porRevisar > 0 && <span className="tag red">{h.porRevisar} por aprobar</span>}
      </div>
      {aviso && (
        <FormAccion accion={marcarAvisoVisto} className={`aviso ${aviso.umbral === 100 ? "err" : "warn"}`}>
          <span>
            <b>{aviso.umbral === 100 ? "Has superado los asuntos activos incluidos en tu plan." : "Estás cerca del límite de asuntos activos de tu plan."}</b>{" "}
            Llevas {aviso.asuntos_activos} de {aviso.incluidos} este mes. {aviso.umbral === 100 ? "Los adicionales se suman a la estimación del mes; no se bloquea nada." : ""}
          </span>
          <span className="actions">
            <Link className="btn ghost sm" href="/plan">Ver Tu plan</Link>
            <input type="hidden" name="mes" value={aviso.mes} /><input type="hidden" name="umbral" value={aviso.umbral} />
            <button className="btn link" type="submit">Entendido</button>
          </span>
        </FormAccion>
      )}
      <div className="stats" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div className="stat hl"><b>{h.porRevisar}</b><span>Novedades por revisar</span></div>
        <div className="stat"><b>{h.asuntosActivos}</b><span>Asuntos activos</span></div>
        <div className="stat" data-prueba="informados"><b>{h.informados == null ? "—" : `${h.informados} %`}</b><span>{h.informados == null ? "Clientes informados · Sin datos todavía" : "Clientes informados"}</span></div>
      </div>
      <div className="cols">
        <div className="panel">
          <h2>Para contar a tus clientes <Link href="/notificaciones">Ver todas</Link></h2>
          {h.novedades.length ? h.novedades.map((n) => (
            <Link key={n.id} className="row" href={n.href} style={{ textDecoration: "none", color: "inherit" }}>
              <span className="t">{n.hora}</span>
              <span><b>{n.cliente}</b><span className="d" style={{ display: "block" }}>{n.texto}</span></span>
              <span className={TAG[n.estado]}>{n.estado}</span>
            </Link>
          )) : <p className="vacio">Todo contado. No hay novedades pendientes.</p>}
        </div>
        <div style={{ display: "grid", gap: 18 }}>
          <div className="panel">
            <h2>Tu plan este mes <Link href="/plan">Ver detalle</Link></h2>
            <div className="cuerpo">
              <p><b>{est.maximo_mes}</b> de {est.incluidos} asuntos activos incluidos</p>
              <div className={`meter${est.maximo_mes > est.incluidos ? " sobre" : ""}`}><i style={{ width: `${Math.min(100, Math.round((100 * est.maximo_mes) / Math.max(1, est.incluidos)))}%` }} /></div>
              <p className="note">Total estimado del mes: <b>{est.total.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</b>, sin IVA.</p>
            </div>
          </div>
          <div className="panel">
            <h2>Clientes y asuntos</h2>
            <div className="cuerpo">
              <p className="mute">Da de alta tus clientes y asuntos a mano o impórtalos de una hoja de cálculo.</p>
              <div className="actions"><Link className="btn ghost sm" href="/clientes/nuevo">Nuevo cliente</Link><Link className="btn ghost sm" href="/clientes/importar">Importar CSV o Excel</Link></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
