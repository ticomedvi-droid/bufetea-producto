import type { Metadata } from "next";
import { avisos, reglas, sesion } from "@/lib/datos";
import { Reglas } from "@/components/Reglas";
import { FormAccion } from "@/components/Envio";
import { fechaHora } from "@/lib/fechas";
import { aprobarYEnviar, cancelarMensaje } from "../acciones-nucleo";

export const metadata: Metadata = { title: "Avisos que salen solos" };

const TIPO: Record<string, string> = {
  recordatorio_semana: "Recordatorio · una semana antes", recordatorio_vispera: "Recordatorio · la víspera", cierre: "Cierre con reseña",
  sin_noticias: "Cliente sin noticias", manual: "Mensaje", preparacion: "Preparación del juicio",
};

export default async function Avisos() {
  const s = await sesion();
  if (!s || s === "sin-despacho") return null;
  const [r, lista] = await Promise.all([reglas(), avisos()]);
  const puedeAprobar = s.rol !== "administrativo";
  return (
    <>
      <Reglas activas={r} puede={s.rol === "admin"} />
      <p className="mute">Recordatorios de citas, mensajes a clientes sin noticias y cierres. Los que salen solos puedes cancelarlos hasta su fecha; los demás te esperan escritos.</p>
      {lista.length === 0 ? <div className="panel"><p className="vacio">No hay avisos pendientes ni programados.</p></div> : (
        <div className="grid2">
          {lista.map((a) => (
            <div className="panel" key={a.id} data-aviso={a.id}>
              <h2>{TIPO[a.tipo] ?? a.tipo}
                {a.estado === "programado" ? (a.auto ? <span className="tag auto-tag">Sale solo</span> : <span className="tag green">Programado</span>)
                  : a.estado === "error" ? <span className="tag red">No ha salido</span> : <span className="tag">Por aprobar</span>}
              </h2>
              <div style={{ padding: 16, display: "grid", gap: 10 }}>
                <b>{a.cliente ?? "Sin cliente"}{a.asunto ? ` · ${a.asunto}` : ""}</b>
                <span className="note">Se enviará: {a.programado_para ? fechaHora(a.programado_para) : "al aprobarlo"} · {a.canal === "whatsapp" ? "WhatsApp" : "email"}</span>
                <div className="bubble" style={{ whiteSpace: "pre-line" }}>{a.cuerpo}</div>
                {a.estado === "error" && <p className="note">{(a as unknown as { error?: string }).error}</p>}
                <div className="actions">
                  {a.estado !== "programado" && puedeAprobar && (
                    <FormAccion accion={aprobarYEnviar}>
                      <input type="hidden" name="mensaje_id" value={a.id} /><input type="hidden" name="ahora" value="0" />
                      <button className="btn primary sm" type="submit">Aprobar y programar · 1 toque</button>
                    </FormAccion>
                  )}
                  <FormAccion accion={cancelarMensaje}>
                    <input type="hidden" name="mensaje_id" value={a.id} />
                    <button className="btn link" type="submit">{a.estado === "programado" ? "Cancelar este aviso" : "No enviarlo"}</button>
                  </FormAccion>
                </div>
                {a.auto && a.estado === "programado" && <p className="note">No tienes que hacer nada: sale solo en su fecha por la regla «{TIPO[a.regla_auto ?? a.tipo] ?? a.regla_auto}».</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
