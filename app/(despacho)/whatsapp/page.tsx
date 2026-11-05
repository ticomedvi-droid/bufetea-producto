import type { Metadata } from "next";
import Link from "next/link";
import { conversaciones, mensajesWA, numeroWhatsApp } from "@/lib/datos";
import { Respuesta } from "@/components/Respuesta";

export const metadata: Metadata = { title: "WhatsApp del despacho" };
const hora = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
    : d.toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });
};
const numero = (t: string) => `+${t.slice(0, 2)} ${t.slice(2, 5)} ${t.slice(5, 8)} ${t.slice(8)}`;

export default async function WhatsApp({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c: sel } = await searchParams;
  const [convs, num] = await Promise.all([conversaciones(), numeroWhatsApp()]);
  const c = convs.find((x) => x.id === sel) ?? convs[0] ?? null;
  const msgs = c ? await mensajesWA(c.id) : [];
  const ventana = !!c?.ultimo_entrante_en && Date.now() - new Date(c.ultimo_entrante_en).getTime() < 24 * 3600e3;
  return (
    <>
      {!num ? (
        <div className="aviso warn">El WhatsApp del despacho todavía no está conectado. Lo dejamos montado en la puesta en marcha, con el número que ya conocen tus clientes.</div>
      ) : num.modo === "pruebas" ? (
        <div className="aviso warn" data-modo-whatsapp="pruebas"><span><b>WhatsApp en modo de pruebas</b> ({num.numero}): solo se puede escribir a los números de prueba dados de alta en Meta. Pasa a producción cuando Meta verifique la empresa.</span></div>
      ) : null}
      {!c ? <div className="panel"><p className="vacio">Aún no hay conversaciones. Cuando un cliente escriba al WhatsApp del despacho, aparecerá aquí.</p></div> : (
        <div className="wa">
          <div className="panel" role="listbox" aria-label="Conversaciones">
            {convs.map((x) => (
              <Link key={x.id} className="row" role="option" aria-selected={x.id === c.id} href={`/whatsapp?c=${x.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <span className="t">{hora(x.ultimo_mensaje_en)}</span>
                <span><b>{x.cliente ?? x.nombre_perfil ?? numero(x.telefono)}</b><span className="d">{x.ultimo_texto ?? "Adjunto"}</span></span>
                {x.no_leidos ? <span className="count">{x.no_leidos}</span> : x.verificada ? <span className="tag auto-tag">Verificado</span> : x.cliente_id ? <span className="tag">Cliente</span> : <span className="tag warn">Sin ficha</span>}
              </Link>
            ))}
          </div>
          <div className="thread" data-conversacion={c.id}>
            <div className="th">
              <b>{c.cliente ?? c.nombre_perfil ?? numero(c.telefono)}</b>
              <span className="actions">
                {c.cliente_id ? <Link className="tag" href={`/clientes/${c.cliente_id}`}>Ficha del cliente</Link> : <span className="tag warn">Número desconocido · consulta nueva</span>}
                {c.verificada ? <span className="tag green">Código verificado</span> : c.cliente_id ? <span className="tag">Sin verificar</span> : null}
              </span>
            </div>
            <div className="msgs">
              {msgs.map((m) => (
                <div key={m.id} className={`mm${m.direccion === "salida" ? " o" : ""}`}>
                  {m.tipo === "audio" ? <span className="att">🎤 Nota de voz{m.transcripcion ? <> · «{m.transcripcion}»</> : " (sin transcribir)"}</span>
                    : m.tipo === "imagen" || m.tipo === "documento" ? <span className="att">📎 {m.texto ?? (m.tipo === "imagen" ? "Imagen" : "Documento")} · guardado en el asunto</span>
                    : <span style={{ whiteSpace: "pre-line" }}>{m.texto}</span>}
                  <small>{hora(m.creado_en)}{m.direccion === "salida" ? (m.auto ? " · respondido solo por Bufetea, con la regla «¿cómo va lo mío?»" : m.enviado_por_nombre ? ` · ${m.enviado_por_nombre}` : "") : ""}{m.estado === "fallido" ? " · no se ha podido enviar" : m.estado === "leido" ? " · ✓✓" : ""}</small>
                </div>
              ))}
            </div>
            <Respuesta conversacion={c.id} propuesta={c.propuesta} motivo={c.propuesta_motivo} ventanaAbierta={ventana} conectado={!!num} />
          </div>
        </div>
      )}
    </>
  );
}
