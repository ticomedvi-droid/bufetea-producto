import Link from "next/link";
import { Candado } from "@/components/Logo";
import { FormAccion } from "@/components/Envio";
import { INFO_EXTRA } from "@/lib/extras-info";
import { precioExtra } from "@/lib/precio";
import type { ExtraEstado } from "@/lib/tipos";
import { solicitarActivacion } from "@/app/(despacho)/acciones";

/** Pantalla de un extra no activo: se ve qué hace y su precio orientativo, con «Solicitar activación». No se puede usar.
 *  Se decide en el servidor (mis_extras / extra_activo): el contenido real del extra ni siquiera se carga. */
export function BloqueoExtra({ extra, plan, muestra }: { extra: ExtraEstado; plan: string; muestra: React.ReactNode }) {
  const info = INFO_EXTRA[extra.extra_id];
  return (
    <div className="lockwrap" data-bloqueo={extra.extra_id}>
      <div className="behind" aria-hidden="true" inert>{muestra}</div>
      <div className="lockcard">
        <div className="lc" role="region" aria-labelledby={`lc-${extra.extra_id}`}>
          <span className="ic"><Candado size={24} /></span>
          <span className="tag warn" style={{ justifySelf: "start" }}>Extra · no incluido en tu plan</span>
          <h2 id={`lc-${extra.extra_id}`}>{extra.nombre} · {info.menu}</h2>
          <p className="mute">{info.d}</p>
          <ul>{info.b.map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="price">{precioExtra(extra)} · precio orientativo, sin IVA. Se añade a tu plan {plan}; te lo confirmamos antes de activarlo.{extra.nota ? ` ${extra.nota}` : ""}</p>
          {extra.solicitud_abierta ? (
            <div className="actions"><span className="tag green">Solicitud enviada</span><Link className="btn ghost sm" href="/plan">Ver Tu plan</Link></div>
          ) : (
            <FormAccion accion={solicitarActivacion} className="actions">
              <input type="hidden" name="extra" value={extra.extra_id} />
              <button className="btn primary sm" type="submit">Solicitar activación</button>
              <Link className="btn ghost sm" href="/plan">Ver Tu plan</Link>
            </FormAccion>
          )}
        </div>
      </div>
    </div>
  );
}

export function EnPreparacion({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="panel">
      <h2>{titulo} <span className="tag">En preparación</span></h2>
      <div className="cuerpo"><p className="mute">{texto}</p></div>
    </div>
  );
}
