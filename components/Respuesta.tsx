"use client";
import { useEffect, useState } from "react";
import { useAccion } from "@/components/useAccion";
import { marcarLeida, proponerWhatsApp, responderWhatsApp } from "@/app/(despacho)/acciones-nucleo";

/** Caja de respuesta: la IA propone, una persona revisa y envía. */
export function Respuesta({ conversacion, propuesta, motivo, ventanaAbierta, conectado }: { conversacion: string; propuesta: string | null; motivo: string | null; ventanaAbierta: boolean; conectado: boolean }) {
  const [texto, setTexto] = useState(propuesta ?? "");
  const { ejecutar, pendiente, toast } = useAccion();
  useEffect(() => { setTexto(propuesta ?? ""); }, [propuesta]);
  useEffect(() => { marcarLeida(conversacion); }, [conversacion]);
  return (
    <div className="compose">
      <label className="lbl" htmlFor="wa-msg">{propuesta ? "Respuesta propuesta por la IA · revísala antes de enviar" : "Tu respuesta"}</label>
      {motivo && <span className="note">{motivo}</span>}
      <textarea id="wa-msg" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={4000} placeholder="Escribe la respuesta…" />
      <div className="actions">
        <button className="btn primary sm" type="button" disabled={pendiente || !texto.trim() || !ventanaAbierta || !conectado}
          onClick={async () => { const r = await ejecutar(responderWhatsApp, { conversacion, texto }); if (r?.ok) setTexto(""); }}>Enviar</button>
        <button className="btn ghost sm" type="button" disabled={pendiente} onClick={() => ejecutar(proponerWhatsApp, { conversacion })}>Proponer otra</button>
      </div>
      {!ventanaAbierta && <p className="note">Han pasado más de 24 horas desde su último mensaje: WhatsApp solo deja escribirle con un aviso aprobado.</p>}
      {toast}
    </div>
  );
}
