"use client";
import { useState } from "react";
import { IDIOMAS } from "@/lib/extras-info";
import { useAccion } from "@/components/useAccion";
import { aprobarYEnviar, guardarMensaje, noContar, traducirMensaje } from "@/app/(despacho)/acciones-nucleo";

type Props = {
  mensaje: { id: string; cuerpo: string; cuerpo_es: string | null; idioma: string; canal: string; destinatario: string | null };
  notificacionId: string;
  puedeAprobar: boolean;
  nombreCliente: string;
};

/** «Mensaje para el cliente»: borrador editable, idioma y canal, con «Aprobar y enviar», «Editar» y «No contárselo». */
export function EditorMensaje({ mensaje, notificacionId, puedeAprobar, nombreCliente }: Props) {
  const { ejecutar, pendiente, toast } = useAccion();
  const [editando, setEditando] = useState(false);
  const [cuerpo, setCuerpo] = useState(mensaje.cuerpo);
  const [cuerpoEs, setCuerpoEs] = useState(mensaje.cuerpo_es ?? mensaje.cuerpo);
  const traducido = mensaje.idioma !== "es";
  const canal = mensaje.canal === "whatsapp" ? "WhatsApp" : "email";
  const base = { mensaje_id: mensaje.id, notificacion_id: notificacionId };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <label className="lbl" htmlFor="msg">Mensaje para el cliente · {editando ? "editando" : "puedes editarlo"}</label>
      <div className="langs">
        <span className="note">Idioma del cliente:</span>
        <button type="button" aria-pressed="true" disabled>{IDIOMAS[mensaje.idioma] ?? mensaje.idioma}</button>
        <span className="note">· Canal: <b>{canal}</b>{mensaje.destinatario ? ` (${mensaje.destinatario})` : ""}{mensaje.canal === "whatsapp" ? " · si no lo usa, se envía por email" : ""}</span>
      </div>
      <textarea id="msg" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} readOnly={!editando} dir={mensaje.idioma === "ar" ? "rtl" : undefined}
        style={{ minHeight: 150, font: "inherit", padding: 12, borderRadius: 12, border: "1px solid var(--line)", background: editando ? "#fff" : "var(--court)", whiteSpace: "pre-wrap" }} />
      {traducido && (
        <details open={editando}>
          <summary className="note" style={{ cursor: "pointer" }}>Versión en español (la que revisas)</summary>
          <textarea value={cuerpoEs} onChange={(e) => setCuerpoEs(e.target.value)} readOnly={!editando}
            style={{ minHeight: 110, width: "100%", font: "inherit", padding: 12, borderRadius: 12, border: "1px solid var(--line)", marginTop: 8 }} />
          {editando && <button type="button" className="btn ghost sm" disabled={pendiente} style={{ marginTop: 8 }}
            onClick={() => ejecutar(traducirMensaje, { ...base, idioma: mensaje.idioma, cuerpo_es: cuerpoEs })}>Traducir de nuevo desde el español</button>}
        </details>
      )}
      <div className="actions">
        {puedeAprobar ? (
          <button type="button" className="btn primary sm" disabled={pendiente} data-accion="aprobar"
            onClick={() => ejecutar(aprobarYEnviar, { ...base, cuerpo, cuerpo_es: traducido ? cuerpoEs : cuerpo })}>
            {pendiente ? "Enviando…" : `Aprobar y enviar por ${canal}`}
          </button>
        ) : null}
        {editando ? (
          <button type="button" className="btn ghost sm" disabled={pendiente}
            onClick={async () => { const r = await ejecutar(guardarMensaje, { ...base, cuerpo, cuerpo_es: traducido ? cuerpoEs : cuerpo }); if (r?.ok) setEditando(false); }}>
            Guardar cambios
          </button>
        ) : (
          <button type="button" className="btn ghost sm" onClick={() => setEditando(true)}>Editar</button>
        )}
        <button type="button" className="btn link" disabled={pendiente} onClick={() => ejecutar(noContar, { id: notificacionId })}>No contárselo</button>
      </div>
      {!puedeAprobar && <p className="note">Como administración puedes preparar el mensaje. Lo que explica una novedad del juzgado lo aprueba un abogado.</p>}
      <p className="note">Se enviará con la nota «redactado con ayuda de IA y aprobado por» quien lo apruebe. Si {nombreCliente.split(" ")[0]} pregunta después por WhatsApp o por teléfono, se le contará esto.</p>
      {toast}
    </div>
  );
}
