import type { Metadata } from "next";
import { PaginaExtra } from "@/components/PaginaExtra";
import { llamadas } from "@/lib/datos";

export const metadata: Metadata = { title: "Centralita con IA" };
const TIPO: Record<string, string> = { cliente: "Cliente", tercero: "Alguien que no es el cliente", consulta_nueva: "Cliente nuevo", urgencia: "Urgencia", otro: "Otra" };

export default function Voice() {
  return (
    <PaginaExtra id="voice">
      {async () => {
        const ls = await llamadas();
        return (
          <div className="panel">
            <h2>Llamadas de la centralita</h2>
            {ls.length === 0 ? <div className="vacio">Aún no hay llamadas registradas.</div> : (
              <div className="tablewrap" style={{ border: 0, boxShadow: "none" }}>
                <table>
                  <thead><tr><th>Cuándo</th><th>Quién</th><th>Tipo</th><th>Resumen</th><th>Estado</th></tr></thead>
                  <tbody>{ls.map((l) => (
                    <tr key={l.id}>
                      <td>{new Date(l.creado_en).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}</td>
                      <td><b>{l.nombre ?? "Sin identificar"}</b><br /><span className="note">{l.telefono ?? ""}</span></td>
                      <td>{TIPO[l.tipo] ?? l.tipo}{l.urgente && <> <span className="tag warn">Urgente</span></>}{l.verificado && <> <span className="tag green">Código verificado</span></>}</td>
                      <td>{l.resumen}</td>
                      <td>{l.atendida ? <span className="tag green">Atendida</span> : <span className="tag">Pendiente</span>}</td>
                    </tr>))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="cuerpo"><p className="note">La grabación, la transcripción y el contador de minutos llegan con la siguiente actualización de la centralita.</p></div>
          </div>
        );
      }}
    </PaginaExtra>
  );
}
