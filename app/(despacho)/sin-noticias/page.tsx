import type { Metadata } from "next";
import Link from "next/link";
import { reglas, sinNoticias } from "@/lib/datos";
import { FormAccion } from "@/components/Envio";
import { prepararSinNoticias } from "../acciones-nucleo";

export const metadata: Metadata = { title: "Clientes sin noticias" };

export default async function SinNoticias() {
  const [lista, r] = await Promise.all([sinNoticias(), reglas()]);
  return (
    <>
      <p className="mute">Clientes con un asunto abierto que llevan más de 30 días sin recibir noticias. Bufetea te propone un mensaje con lo que ya está aprobado; no inventa novedades.
        {r.includes("avisos_sin_noticias") ? " Te avisamos en Hoy cuando alguien pasa de 30 días." : ""}</p>
      <div className="panel">
        <h2>Clientes sin noticias <span className="note">{lista.length}</span></h2>
        {lista.length === 0 ? <p className="vacio">Todos tus clientes tienen noticias recientes.</p> : lista.map((a) => (
          <div className="row" key={a.asunto_id} style={{ cursor: "default" }} data-sin-noticias={a.asunto_id}>
            <span className="t late">{a.dias} d</span>
            <span><b>{a.cliente}</b><span className="d">{[a.numero, a.descripcion].filter(Boolean).join(" · ")}</span></span>
            {a.borrador ? <Link className="tag green" href="/avisos">Mensaje preparado · revisar</Link> : (
              <FormAccion accion={prepararSinNoticias}>
                <input type="hidden" name="asunto_id" value={a.asunto_id} />
                <button className="btn ghost sm" type="submit">Contarle algo</button>
              </FormAccion>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
