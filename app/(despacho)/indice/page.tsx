import type { Metadata } from "next";
import Link from "next/link";
import { historicoIndice, indicadores, indice, sesion } from "@/lib/datos";
import { LogoSvg } from "@/components/Logo";

export const metadata: Metadata = { title: "Índice y sello" };
const MES = (d: Date) => d.toLocaleDateString("es-ES", { month: "long", timeZone: "Europe/Madrid" });

export default async function Indice() {
  const s = await sesion();
  if (!s || s === "sin-despacho") return null;
  const [i, k, h] = await Promise.all([indice(), indicadores(), historicoIndice()]);
  const v = i.porcentaje;
  const min = k.minutos_medios_notificacion;
  return (
    <>
      <div className="grid2">
        <div className="panel" data-indice>
          <h2>Índice de cliente informado · {MES(new Date())}</h2>
          <div style={{ padding: 18, display: "grid", gap: 14 }}>
            <div className="big">{v == null ? "—" : `${v} %`}</div>
            {v == null ? <p className="mute">Sin datos todavía. El índice aparece cuando el despacho tiene al menos 5 asuntos activos que se informan y ha enviado algún mensaje.</p> : (
              <>
                <div className="meter"><i style={{ width: `${v}%` }} /></div>
                <p>{i.informados} de {i.clientes} clientes han tenido noticias en los últimos 30 días.</p>
              </>
            )}
            <dl className="kv">
              <dt>Tiempo medio de la notificación al cliente</dt><dd>{min == null ? "—" : min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`}</dd>
              <dt>«¿Cómo va lo mío?» este mes</dt><dd>{k.como_va_lo_mio} · respondidas por Bufetea</dd>
              <dt>Asuntos que se informan en persona</dt><dd>{k.asuntos_excluidos}</dd>
            </dl>
          </div>
        </div>
        <div className="panel">
          <h2>Sello «Despacho que informa»</h2>
          <div style={{ padding: 18, display: "grid", gap: 14 }}>
            <div className="seal" style={{ opacity: i.sello ? 1 : 0.45 }} data-sello={i.sello ? "si" : "no"}>
              <span style={{ display: "inline-flex" }} className="logo"><LogoSvg size={34} /></span>
              <span><b>Despacho que informa</b><small className="note">{s.despacho.nombre} · Bufetea</small></span>
            </div>
            <p>{i.sello ? "Cumples el requisito (85 % o más). Puedes mostrar el sello en tu web y al pie de tus mensajes."
              : v == null ? "El sello se activa con un índice del 85 % o más."
              : "Te falta poco: el sello se activa con un índice del 85 % o más. Escribe a los clientes sin noticias y lo conseguirás."}</p>
            <div className="actions"><Link className="btn ghost sm" href="/sin-noticias">Ver clientes sin noticias</Link></div>
          </div>
        </div>
      </div>
      {h.length > 0 && (
        <div className="panel">
          <h2>Meses anteriores</h2>
          {h.map((m) => (
            <div className="row" key={m.mes} style={{ cursor: "default" }}>
              <span className="t">{MES(new Date(m.mes + "T12:00:00"))}</span>
              <span><b>{m.porcentaje == null ? "Sin datos" : `${m.porcentaje} %`}</b></span>
              {m.sello ? <span className="tag green">Sello</span> : <span className="tag">—</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
