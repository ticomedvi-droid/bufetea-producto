import type { Metadata } from "next";
import Link from "next/link";
import { asuntos, integracion, sesion } from "@/lib/datos";
import { Sincronizacion } from "@/components/Sincronizacion";
import { SITUACIONES } from "@/lib/extras-info";

export const metadata: Metadata = { title: "Asuntos" };
const FILTROS = [["abierto", "Abiertos"], ["cerrado", "Cerrados"], ["archivado", "Archivados"], ["todos", "Todos"]];

export default async function Asuntos({ searchParams }: { searchParams: Promise<{ q?: string; s?: string; p?: string }> }) {
  const { q = "", s = "abierto", p = "0" } = await searchParams;
  const pagina = Math.max(0, Number(p) || 0);
  const [{ filas, total }, integ, ses] = await Promise.all([asuntos({ q, situacion: s, pagina }), integracion(), sesion()]);
  const paginas = Math.ceil(total / 50);
  const url = (extra: Record<string, string | number>) => `/asuntos?${new URLSearchParams({ q, s, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) })}`;
  return (
    <>
      <Sincronizacion i={integ} que="asuntos" demo={!!ses && ses !== "sin-despacho" && ses.demo} />
      <div className="toolbar">
        <form className="busca" role="search"><input type="hidden" name="s" value={s} /><label className="sr" htmlFor="q">Buscar asuntos</label>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar por número, procedimiento, juzgado o descripción" /></form>
        <div className="billing" role="group" aria-label="Estado">
          {FILTROS.map(([v, t]) => <Link key={v} href={url({ s: v, p: 0 })} aria-current={s === v ? "page" : undefined}
            style={{ padding: "7px 14px", borderRadius: 999, textDecoration: "none", fontSize: ".86rem", background: s === v ? "var(--ink)" : "transparent", color: s === v ? "#fff" : "var(--ink-2)" }}>{t}</Link>)}
        </div>
      </div>
      <div className="tablewrap">
        {filas.length === 0 ? <div className="vacio">No hay asuntos {s !== "todos" ? SITUACIONES[s]?.toLowerCase() + "s" : ""}{q ? ` que coincidan con «${q}»` : ""}.</div> : (
          <table>
            <caption className="sr">Asuntos del despacho</caption>
            <thead><tr><th>Asunto</th><th>Cliente</th><th>Juzgado</th><th>Abogado</th><th>Fase que ve el cliente</th><th>Estado</th></tr></thead>
            <tbody>{filas.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/asuntos/${a.id}`}>{a.numero ?? a.procedimiento ?? "Sin número"}</Link><br /><span className="note">{a.descripcion ?? ""}</span></td>
                <td>{a.clientes.length ? a.clientes.map((c) => c.nombre).join(", ") : <span className="tag warn">Sin cliente</span>}</td>
                <td>{a.juzgado ?? "—"}</td>
                <td>{a.abogado ?? "—"}</td>
                <td>{a.fase_cliente ?? "—"}{!a.informar && <><br /><span className="tag">No se informa</span></>}</td>
                <td><span className={a.situacion === "abierto" ? "tag green" : "tag"}>{SITUACIONES[a.situacion]}</span>{a.duplicado_de && <><br /><span className="tag">Duplicado</span></>}</td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>
      {paginas > 1 && (
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <span className="note">{total} asuntos · página {pagina + 1} de {paginas}</span>
          <span className="actions">
            {pagina > 0 && <Link className="btn ghost sm" href={url({ p: pagina - 1 })}>Anterior</Link>}
            {pagina + 1 < paginas && <Link className="btn ghost sm" href={url({ p: pagina + 1 })}>Siguiente</Link>}
          </span>
        </div>
      )}
    </>
  );
}
