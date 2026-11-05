import type { Metadata } from "next";
import Link from "next/link";
import { estimacion, misExtras, planes, sesion } from "@/lib/datos";
import { FormAccion } from "@/components/Envio";
import { Candado } from "@/components/Logo";
import { FUNCIONES_INCLUIDAS, INFO_EXTRA } from "@/lib/extras-info";
import { eur, precioExtra } from "@/lib/precio";
import { CambiarPlan } from "./CambiarPlan";
import { demoExtra, solicitarActivacion } from "../acciones";

export const metadata: Metadata = { title: "Tu plan" };

const fechaLarga = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

export default async function TuPlan() {
  const s = await sesion();
  if (!s || s === "sin-despacho") return null;
  const [ps, extras, est] = await Promise.all([planes(), misExtras(), estimacion()]);
  const d = s.despacho;
  const p = ps.find((x) => x.id === d.plan_id)!;
  const anual = d.facturacion === "anual";
  const mesesGratis = Math.round(12 - p.precio_anio / p.precio_mes);
  const uso = Math.round((100 * est.maximo_mes) / Math.max(1, est.incluidos));
  const lineasExtras = est.extras;

  return (
    <>
      <div className="planhead" data-plan-actual={p.id}>
        <div>
          <small>Tu plan · {d.nombre}</small>
          <b>{p.nombre} · {anual ? eur(p.precio_anio) : eur(p.precio_mes)}</b>
          <small>{anual ? `al año (equivale a ${eur(p.precio_anio / 12, 2)}/mes)` : "al mes"} · pago {d.facturacion} · hasta {p.asuntos_incluidos} asuntos activos · {eur(p.exceso_asunto, 2)} por asunto activo más · todo el equipo incluido</small>
        </div>
        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          {d.fundador && d.precio_congelado_hasta && <span className="tag">Precio congelado hasta {fechaLarga(d.precio_congelado_hasta)}</span>}
          {d.estado === "piloto" && <span className="tag">{d.piloto_fin ? `En piloto hasta ${fechaLarga(d.piloto_fin)}` : "En piloto"}</span>}
          {d.estado === "cancelado" && <span className="tag">Dado de baja</span>}
        </div>
      </div>
      {d.estado === "piloto" && (
        <p className="note" style={{ margin: 0 }}>El piloto de 30 días es tu primer mes pagado. Si sigues, cuenta como tu primer mes; si no, no pagas nada más. Sin permanencia.</p>
      )}

      <div className="cols">
        <div style={{ display: "grid", gap: 18 }}>
          <div className="panel">
            <h2>Asuntos activos este mes</h2>
            <div className="cuerpo">
              <div className="stats" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                <div className={`stat${est.maximo_mes > est.incluidos ? " hl" : ""}`}><b data-prueba="usados">{est.maximo_mes}</b><span>usados (máximo del mes)</span></div>
                <div className="stat"><b>{est.incluidos}</b><span>incluidos en {p.nombre}</span></div>
                <div className="stat"><b>{est.adicionales}</b><span>adicionales · {eur(est.importe_adicional, 2)}</span></div>
              </div>
              <div className={`meter${uso > 100 ? " sobre" : ""}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(uso, 100)} aria-label="Uso de asuntos activos">
                <i style={{ width: `${Math.min(100, uso)}%` }} />
              </div>
              <p className="note">Ahora mismo tienes {est.asuntos_activos_ahora} asuntos activos. Se cuenta a diario y se factura el máximo del mes. Sin límite: al superar los incluidos, cada asunto adicional se suma a la estimación ({eur(p.exceso_asunto, 2)} al mes). Te avisamos al llegar al 80 % y al 100 %.</p>
              <details><summary className="note" style={{ cursor: "pointer" }}>¿Qué es un asunto activo?</summary>
                <p className="note" style={{ marginTop: 8 }}>Un expediente abierto de tu despacho con al menos un cliente asociado. No cuentan los expedientes cerrados o archivados ni los asuntos duplicados.</p></details>
            </div>
          </div>

          <div className="panel"><h2>Incluido de serie · {FUNCIONES_INCLUIDAS.length} funciones</h2>
            <ul className="incl10">
              {FUNCIONES_INCLUIDAS.map((t) => <li key={t}>{t}</li>)}
              <li>Usuarios ilimitados</li>
              {p.soporte_prioritario && <li>Soporte prioritario</li>}
              {p.acompanamiento && <li>Acompañamiento de puesta en marcha</li>}
            </ul>
          </div>
        </div>

        <aside className="panel ticket" aria-live="polite">
          <h2>Total estimado del mes</h2>
          <div className="cuerpo">
            <ul className="lines">
              <li><span>Plan {p.nombre} · {d.facturacion}</span><span>{eur(est.base, 2)}{anual ? "/mes" : ""}</span></li>
              <li><span>Asuntos adicionales · {est.adicionales} × {eur(p.exceso_asunto, 2)}</span><span>{eur(est.importe_adicional, 2)}</span></li>
              {lineasExtras.map((x) => <li key={x.extra}><span>{x.nombre}{x.incluido ? " · incluido en tu plan" : ""}</span><span>{eur(x.importe, 2)}</span></li>)}
            </ul>
            <div className="tot"><span>Total estimado al mes</span><b data-prueba="total">{eur(est.total, 2)}</b></div>
            <p className="note">{anual ? "Con pago anual, los asuntos adicionales y los extras se facturan cada mes. " : ""}Precios sin IVA · Sin permanencia · Sin cobro por usuario. Los precios de los extras son orientativos y se confirman antes de contratar.</p>
          </div>
        </aside>
      </div>

      <div>
        <span className="lbl">Extras · se añaden si los necesitas</span>
        <div className="xgrid">
          {extras.map((x) => (
            <div key={x.extra_id} className={`xcard${x.activo ? " on" : ""}`} data-extra={x.extra_id} data-estado={x.activo ? x.origen : "bloqueado"}>
              <div className="xh">
                <h3>{x.nombre} · {x.subtitulo}</h3>
                {x.origen === "incluido" ? <span className="tag green">Incluido en tu plan</span>
                  : x.origen === "contratado" ? <span className="tag green">Contratado</span>
                  : <span className="tag warn"><Candado /> Bloqueado</span>}
              </div>
              <p>{INFO_EXTRA[x.extra_id].d}</p>
              <p className="note">{x.origen === "incluido" ? `Valorado en ${precioExtra(x)}: no se cobra.` : `${precioExtra(x, x.precio_pactado)}${x.precio_pactado == null ? " · precio orientativo" : ""}`}{x.nota ? ` · ${x.nota}` : ""}</p>
              <div className="actions">
                {x.activo ? <Link className="btn ghost sm" href={INFO_EXTRA[x.extra_id].ruta}>Abrir</Link>
                  : x.solicitud_abierta ? <span className="tag green">Solicitud enviada</span>
                  : (
                    <FormAccion accion={solicitarActivacion} className="actions">
                      <input type="hidden" name="extra" value={x.extra_id} />
                      <button className="btn primary sm" type="submit">Solicitar activación</button>
                    </FormAccion>
                  )}
                {s.demo && x.origen !== "incluido" && (
                  <FormAccion accion={demoExtra} className="actions">
                    <input type="hidden" name="extra" value={x.extra_id} /><input type="hidden" name="on" value={x.activo ? "0" : "1"} />
                    <button className="btn link" type="submit">{x.activo ? "Quitar en la demo" : "Activar en la demo"}</button>
                  </FormAccion>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="note" style={{ marginTop: 10 }}>Se contratan con cualquier plan. Al pedir la activación, el equipo de Bufetea te confirma el precio antes de activarlo.</p>
      </div>

      <CambiarPlan planes={ps} actual={d.plan_id} facturacion={d.facturacion} puede={s.rol === "admin" && d.estado !== "cancelado"} mesesGratis={mesesGratis} />
    </>
  );
}
