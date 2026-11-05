import type { Metadata } from "next";
import Link from "next/link";
import { asuntos, notificaciones, sesion } from "@/lib/datos";
import { direcciones } from "@/lib/config";
import { FormAccion } from "@/components/Envio";
import { EditorMensaje } from "@/components/EditorMensaje";
import { ElegirPdf } from "@/components/ElegirPdf";
import { fechaLarga } from "@/lib/fechas";
import type { Notificacion } from "@/lib/tipos";
import { asignarNotificacion, noContar, reprocesar, subirNotificacion } from "../acciones-nucleo";

export const metadata: Metadata = { title: "Notificaciones explicadas" };

const hora = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
    : d.toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });
};

function Etiqueta({ n }: { n: Notificacion }) {
  if (n.estado === "enviada") return <span className="tag green">Enviada</span>;
  if (n.estado === "no_contar" || n.estado === "revisada") return <span className="tag">Revisada</span>;
  if (n.estado === "interpretando" || n.estado === "recibida") return <span className="tag">Leyendo…</span>;
  if (n.estado === "error") return <span className="tag red">Revisar</span>;
  if (!n.asunto) return <span className="tag warn">Sin asignar</span>;
  if (!n.asunto.informar) return <span className="tag warn">{n.asunto.area ?? "No se informa"}</span>;
  return n.mensaje ? <span className="tag green">Por aprobar</span> : <span className="tag">Nueva</span>;
}

export default async function Notificaciones({ searchParams }: { searchParams: Promise<{ n?: string; ver?: string }> }) {
  const { n: sel, ver } = await searchParams;
  const s = await sesion();
  if (!s || s === "sin-despacho") return null;
  const lista = await notificaciones(ver === "todas" ? "todas" : "pendientes");
  const n = lista.find((x) => x.id === sel) ?? lista[0] ?? null;
  const puedeAprobar = s.rol !== "administrativo";
  const buzon = direcciones(s.despacho.slug).buzon;
  const abiertos = n && !n.asunto ? (await asuntos({ situacion: "abierto" })).filas : [];

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <FormAccion accion={subirNotificacion} className="toolbar">
          <ElegirPdf />
          <button className="btn primary sm" type="submit">Subir notificación</button>
        </FormAccion>
        <span className="note">
          {buzon ? <>O reenvía el correo de LexNET a <code style={{ fontFamily: "var(--mono)" }}>{buzon}</code></> : "El buzón para reenviar desde LexNET se activa cuando Bufetea tenga su dominio."}
        </span>
        <span className="billing" role="group" aria-label="Mostrar">
          <Link href="/notificaciones" style={{ padding: "7px 14px", borderRadius: 999, textDecoration: "none", fontSize: ".86rem", background: ver !== "todas" ? "var(--ink)" : "transparent", color: ver !== "todas" ? "#fff" : "var(--ink-2)" }}>Pendientes</Link>
          <Link href="/notificaciones?ver=todas" style={{ padding: "7px 14px", borderRadius: 999, textDecoration: "none", fontSize: ".86rem", background: ver === "todas" ? "var(--ink)" : "transparent", color: ver === "todas" ? "#fff" : "var(--ink-2)" }}>Todas</Link>
        </span>
      </div>

      {!n ? (
        <div className="panel"><p className="vacio">Todo contado. No hay notificaciones pendientes.<br />Cuando llegue una, Bufetea la explica y te deja el mensaje para tu cliente listo para aprobar.</p></div>
      ) : (
        <div className="split">
          <div className="panel" role="listbox" aria-label="Notificaciones">
            {lista.map((x) => (
              <Link key={x.id} className="row" role="option" aria-selected={x.id === n.id} href={`/notificaciones?n=${x.id}${ver === "todas" ? "&ver=todas" : ""}`} style={{ textDecoration: "none", color: "inherit" }}>
                <span className="t">{hora(x.creada_en)}</span>
                <span><b>{x.cliente?.nombre ?? (x.asunto ? "Asunto sin cliente" : "Sin asignar")}</b><span className="d">{x.tipo_resolucion ?? "Notificación"} · {x.procedimiento ?? x.archivo_nombre ?? ""}</span></span>
                <Etiqueta n={x} />
              </Link>
            ))}
          </div>

          <div className="detail" data-notificacion={n.id}>
            <div className="dhead" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div>
                <span className="lbl">{[n.tipo_resolucion ?? "Notificación", n.procedimiento, n.asunto?.abogado].filter(Boolean).join(" · ")}</span>
                <h2>{n.cliente?.nombre ?? (n.asunto ? "Asunto sin cliente" : "Sin asignar")}</h2>
                <p className="mute">{n.asunto?.descripcion ?? n.organo ?? ""}</p>
              </div>
              {n.asunto?.area && <span className="tag">{n.asunto.area}</span>}
            </div>

            {n.estado === "error" && (
              <div className="excluded"><b>No se ha podido leer bien.</b> {n.error}
                <FormAccion accion={reprocesar} className="actions" ><input type="hidden" name="id" value={n.id} /><button className="btn ghost sm" type="submit">Intentarlo de nuevo</button></FormAccion>
              </div>
            )}
            {n.error && n.estado !== "error" && <p className="note">{n.error}</p>}

            {!n.asunto && n.estado === "lista" && (
              <FormAccion accion={asignarNotificacion} className="excluded">
                <b>No hemos encontrado su asunto{n.procedimiento ? ` (procedimiento ${n.procedimiento})` : ""}.</b> Elige a qué asunto pertenece y preparamos el mensaje para el cliente.
                <input type="hidden" name="id" value={n.id} />
                <div className="toolbar" style={{ marginTop: 10 }}>
                  <label className="sr" htmlFor="asig">Asunto</label>
                  <select id="asig" name="asunto_id" required defaultValue="" style={{ font: "inherit", padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line)", flex: "1 1 240px" }}>
                    <option value="" disabled>Elige el asunto</option>
                    {abiertos.map((a) => <option key={a.id} value={a.id}>{[a.numero, a.procedimiento !== a.numero ? a.procedimiento : null, a.descripcion, a.clientes[0]?.nombre].filter(Boolean).join(" · ")}</option>)}
                  </select>
                  <button className="btn primary sm" type="submit">Asignar</button>
                </div>
              </FormAccion>
            )}

            <div className={n.mensaje && n.estado === "lista" ? "two" : undefined} style={n.mensaje && n.estado === "lista" ? undefined : { display: "grid", gap: 16 }}>
              <div><span className="lbl">Lo que dice el juzgado</span><div className="court">{n.lo_que_dice ?? "—"}</div></div>
              {n.mensaje && n.estado === "lista" && (
                <EditorMensaje mensaje={{ id: n.mensaje.id, cuerpo: n.mensaje.cuerpo, cuerpo_es: n.mensaje.cuerpo_es, idioma: n.mensaje.idioma, canal: n.mensaje.canal, destinatario: n.mensaje.destinatario }}
                  notificacionId={n.id} puedeAprobar={puedeAprobar} nombreCliente={n.cliente?.nombre ?? ""} />
              )}
            </div>

            <div><span className="lbl">Resumen para ti</span><p>{n.resumen ?? "—"}</p>{n.ia === "sin IA" && <p className="note">Resumen automático sin IA: revísalo con el documento.</p>}</div>

            {n.plazo_fecha && (
              <div className="plazo" data-plazo>
                <span><b>Plazo</b> · {n.plazo_tipo ?? n.plazo_descripcion} · {fechaLarga(n.plazo_fecha)}{n.plazo_dias ? ` (${n.plazo_dias} días)` : ""}</span>
                <span className="tag warn">se valida en tu programa</span>
              </div>
            )}
            {n.senalamiento_en && (
              <div className="plazo"><span><b>Preparación del juicio:</b> {new Date(n.senalamiento_en).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" })}. Al aprobar, queda en la agenda del asunto y salen los avisos de la semana antes y la víspera según tus reglas.</span></div>
            )}
            {n.cliente_debe_actuar && n.accion_cliente && <div className="plazo"><span><b>El cliente tiene que hacer algo:</b> {n.accion_cliente}</span></div>}

            {n.asunto && !n.asunto.informar && n.estado === "lista" && (
              <>
                <div className="excluded"><b>Este asunto está marcado para no informar al cliente de forma automática.</b> Bufetea no prepara mensaje ni lo cuenta por WhatsApp o teléfono. Cuéntaselo tú directamente.</div>
                <FormAccion accion={noContar} className="actions"><input type="hidden" name="id" value={n.id} /><button className="btn ghost sm" type="submit">Marcar como revisada</button></FormAccion>
              </>
            )}
            {n.asunto && n.asunto.informar && !n.cliente && n.estado === "lista" && (
              <div className="excluded">El asunto no tiene cliente asociado. Añádelo en la <Link href={`/asuntos/${n.asunto.id}`} className="lnk">ficha del asunto</Link> y vuelve a interpretar la notificación.</div>
            )}
            {n.estado === "enviada" && <div className="done">Enviada al cliente. Si pregunta por WhatsApp o por teléfono, Bufetea le contará esto.</div>}
            {n.estado === "no_contar" && <div className="done">Has decidido no contárselo al cliente.</div>}
            <p className="note">{n.origen === "buzon" ? "Llegó por el buzón del despacho" : n.origen === "subida" ? "Subida desde Bufetea" : "Llegó desde tu programa de gestión"} · {n.archivo_nombre ?? ""}</p>
          </div>
        </div>
      )}
    </>
  );
}
