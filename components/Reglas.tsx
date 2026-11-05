"use client";
import { useState } from "react";
import { useAccion } from "@/components/useAccion";
import { guardarReglas } from "@/app/(despacho)/acciones-nucleo";
import type { ReglaId } from "@/lib/tipos";

const AUTOMATICO: [ReglaId, string, string][] = [
  ["recordatorio_semana", "Recordatorio una semana antes de cada cita", "Sale solo a las 10:00, siete días antes."],
  ["recordatorio_vispera", "Recordatorio la víspera", "Sale solo a las 10:00 del día anterior."],
  ["respuesta_codigo", "Respuesta al «¿cómo va lo mío?»", "Con lo que ya aprobaste y tras verificar el número y el código del cliente."],
  ["consultas_nuevas", "Recogida de consultas nuevas", "Acuse de recibo a quien escribe por primera vez; el despacho le contesta después."],
  ["avisos_sin_noticias", "Avisos internos de clientes sin noticias", "Te avisa en Hoy de quién lleva más de 30 días sin saber nada."],
];
const REVISION = [
  "Explicación de cada notificación del juzgado",
  "Respuestas nuevas por WhatsApp que propone la IA",
  "Mensaje para los clientes sin noticias",
];
const LIMITES = [
  "Dar asesoramiento jurídico ni decir si un asunto se va a ganar",
  "Hablar de un asunto con quien no confirme su código",
  "Enviar nada fuera de las reglas de tu despacho",
  "Escribir en tu programa de gestión",
];

export function Reglas({ activas, puede }: { activas: ReglaId[]; puede: boolean }) {
  const [sel, setSel] = useState<Set<ReglaId>>(new Set(activas));
  const { ejecutar, pendiente, toast } = useAccion();
  const cambiar = (r: ReglaId, on: boolean) => {
    const n = new Set(sel);
    if (on) n.add(r); else n.delete(r);
    setSel(n);
    ejecutar(guardarReglas, Object.fromEntries([...n].map((x) => [x, "on"])));
  };
  const sw = (r: ReglaId, t: string, d: string) => (
    <label className="sw" key={r}>
      <span><b>{t}</b><small className="note">{d}</small></span>
      <input type="checkbox" checked={sel.has(r)} disabled={!puede || pendiente} onChange={(e) => cambiar(r, e.target.checked)} aria-label={t} data-regla={r} />
    </label>
  );
  return (
    <div className="panel" data-reglas>
      <h2>Tus reglas · qué sale solo y qué revisas <span className="tag green">Tú decides</span></h2>
      <div className="grid2" style={{ padding: 16, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <span className="lbl">A · Automático · rutinario, configurado y autorizado</span>
          {AUTOMATICO.map(([r, t, d]) => sw(r, t, d))}
        </div>
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <span className="lbl">B · Con revisión · preparado para que lo apruebes</span>
          {REVISION.map((t) => <div className="sw" key={t}><span><b>{t}</b><small className="note">Te espera escrito: lo envías con un toque.</small></span><span className="tag">Por aprobar</span></div>)}
          {sw("cierre", "Cierre con reseña", "Por defecto con revisión. Actívalo para que salga solo al cerrar el asunto.")}
        </div>
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <span className="lbl">C · Límites · nunca, aunque se pida</span>
          {LIMITES.map((t) => <div className="sw" key={t} data-limite><span><b>{t}</b><small className="note">Lo contesta siempre el abogado.</small></span><span className="tag red">Bloqueado</span></div>)}
        </div>
      </div>
      {!puede && <p className="note" style={{ padding: "0 16px 16px" }}>Solo la persona titular del despacho cambia las reglas.</p>}
      {toast}
    </div>
  );
}
