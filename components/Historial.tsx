import type { Mensaje } from "@/lib/tipos";

const TIPO: Record<string, string> = {
  manual: "Mensaje", novedad: "Notificación explicada", recordatorio_semana: "Recordatorio · una semana antes",
  recordatorio_vispera: "Recordatorio · la víspera", cierre: "Cierre con reseña", cobro: "Cobro",
};
const ESTADO: Record<string, [string, string]> = {
  borrador: ["Por aprobar", "tag"], programado: ["Programado", "tag green"], enviando: ["Enviando", "tag"],
  enviado: ["Enviado", "tag green"], error: ["Error", "tag red"], cancelado: ["No se contó", "tag"],
};
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : "—");

/** Historial completo de comunicaciones de un cliente o de un asunto. */
export function Historial({ mensajes }: { mensajes: Mensaje[] }) {
  return (
    <div className="panel">
      <h2>Historial de comunicaciones <span className="note">{mensajes.length}</span></h2>
      {mensajes.length === 0 ? <p className="vacio">Todavía no hay comunicaciones.</p> : mensajes.map((m) => {
        const [et, cls] = ESTADO[m.estado] ?? [m.estado, "tag"];
        return (
          <div className="row" key={m.id} style={{ cursor: "default", alignItems: "start" }}>
            <span className="t">{fecha(m.enviado_en ?? m.programado_para ?? m.creado_en)}</span>
            <span>
              <b>{m.titulo || TIPO[m.tipo] || "Mensaje"}</b>
              <span className="note">{TIPO[m.tipo] ?? m.tipo} · {m.canal === "whatsapp" ? "WhatsApp" : "Email"}{m.auto ? " · automático" : ""}</span>
              <span style={{ display: "block", whiteSpace: "pre-line", fontSize: ".9rem", marginTop: 4 }}>{m.cuerpo}</span>
            </span>
            <span className={cls}>{et}</span>
          </div>
        );
      })}
    </div>
  );
}
