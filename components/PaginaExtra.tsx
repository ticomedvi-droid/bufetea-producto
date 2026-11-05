import { notFound } from "next/navigation";
import { misExtras, planes, sesion } from "@/lib/datos";
import type { IdExtra } from "@/lib/tipos";
import { BloqueoExtra } from "@/components/BloqueoExtra";

// Muestras borrosas detrás del candado (como producto.html): datos ficticios, solo decorativos.
const MUESTRAS: Record<IdExtra, React.ReactNode> = {
  voice: (
    <div className="panel"><h2>Llamadas de la centralita</h2>
      {["21:42 · Raúl O. · Despido · urgente", "18:05 · Lucía M. · ¿Cómo va lo mío?", "12:30 · Número nuevo · Herencia"].map((t) => <div className="row" key={t}><span className="t">·</span><span>{t}</span><span className="tag">Resumen</span></div>)}
    </div>
  ),
  portal: (
    <div className="grid2"><div className="panel"><h2>Así ve tu cliente su asunto</h2><div className="cuerpo"><p>Demanda presentada · Demanda admitida · Ahora: la otra parte tiene 20 días para contestar</p></div></div>
      <div className="panel"><h2>Última novedad</h2><div className="cuerpo"><div className="bubble">El juzgado ha aceptado su demanda. No tiene que hacer nada.</div></div></div></div>
  ),
  docs: (
    <div className="grid2">{["DNI · recibido", "Carta de despido · recibida", "Últimas 3 nóminas · pendiente", "Hoja de encargo · firmada"].map((t) => <div className="panel" key={t}><h2>{t}</h2></div>)}</div>
  ),
  pay: (
    <div className="stats" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
      <div className="stat hl"><b>· · ·</b><span>Pendiente de cobro</span></div><div className="stat"><b>· · ·</b><span>Cobrado este mes</span></div><div className="stat"><b>· · ·</b><span>Tiempo medio de pago</span></div>
    </div>
  ),
};

/** Comprueba en el servidor si el extra está activo. Si no, enseña el candado y no carga nada del extra. */
export async function PaginaExtra({ id, children }: { id: IdExtra; children: () => Promise<React.ReactNode> | React.ReactNode }) {
  const [s, extras, ps] = await Promise.all([sesion(), misExtras(), planes()]);
  const e = extras.find((x) => x.extra_id === id);
  if (!e || !s || s === "sin-despacho") notFound();
  if (!e.activo) {
    const plan = ps.find((p) => p.id === s.despacho.plan_id)?.nombre ?? "";
    return <BloqueoExtra extra={e} plan={plan} muestra={MUESTRAS[id]} />;
  }
  return (
    <>
      <p className="note" style={{ margin: 0 }} data-extra-activo={id}>
        <span className="tag green">{e.origen === "incluido" ? "Incluido en tu plan" : "Contratado"}</span> {e.nombre} está activo en tu despacho.
      </p>
      {await children()}
    </>
  );
}
