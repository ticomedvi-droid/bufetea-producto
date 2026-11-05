"use client";
import { useState } from "react";
import { FormAccion } from "@/components/Envio";
import { eur } from "@/lib/precio";
import type { PlanCompleto } from "@/lib/tipos";
import { cambiarPlan } from "../acciones";

export function CambiarPlan({ planes, actual, facturacion, puede, mesesGratis }: { planes: PlanCompleto[]; actual: string; facturacion: "mensual" | "anual"; puede: boolean; mesesGratis: number }) {
  const [bill, setBill] = useState(facturacion);
  return (
    <div className="panel" id="cambiar">
      <h2>Cambiar de plan
        <span className="billing" role="group" aria-label="Forma de pago">
          <button type="button" aria-pressed={bill === "mensual"} onClick={() => setBill("mensual")}>Mensual</button>
          <button type="button" aria-pressed={bill === "anual"} onClick={() => setBill("anual")}>Anual <span>{mesesGratis} meses gratis</span></button>
        </span>
      </h2>
      <div className="cuerpo">
        <div className="pgrid">
          {planes.map((p) => {
            const esActual = p.id === actual && bill === facturacion;
            return (
              <div key={p.id} className={`pcard${p.id === actual ? " actual" : ""}`} data-plan={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.1rem" }}>{p.nombre}</h3>
                  {p.id === actual ? <span className="tag green">Tu plan</span> : p.recomendado ? <span className="tag red">Recomendado</span> : null}
                </div>
                <p className="note">{p.para}</p>
                <div className="pr">{bill === "anual" ? eur(p.precio_anio) : eur(p.precio_mes)}<small>{bill === "anual" ? "/año" : "/mes"}</small></div>
                <p className="note">{bill === "anual" ? `Equivale a ${eur(p.precio_anio / 12, 2)}/mes · ahorras ${eur(p.precio_mes * 12 - p.precio_anio)}` : `o ${eur(p.precio_anio)} al año con pago anual`}</p>
                <p style={{ fontSize: ".9rem" }}><b>Hasta {p.asuntos_incluidos} asuntos activos</b><br /><span className="note">Después, {eur(p.exceso_asunto, 2)} por asunto activo adicional al mes</span></p>
                <ul>{p.caracteristicas.map((c) => <li key={c}>{c}</li>)}</ul>
                {puede && !esActual && (
                  <FormAccion accion={cambiarPlan} className="actions">
                    <input type="hidden" name="plan" value={p.id} /><input type="hidden" name="facturacion" value={bill} />
                    <button className={`btn ${p.recomendado ? "primary" : "ghost"} sm`} type="submit">
                      {p.id === actual ? `Pasar a pago ${bill}` : `Cambiar a ${p.nombre}`}
                    </button>
                  </FormAccion>
                )}
              </div>
            );
          })}
        </div>
        <p className="note">{puede ? "El cambio se aplica desde hoy: los extras incluidos en el plan se activan o se bloquean solos y lo que hayas contratado aparte se conserva." : "Solo la persona titular del despacho puede cambiar el plan."} Sin IVA · Sin permanencia · Sin cobro por usuario.</p>
      </div>
    </div>
  );
}
