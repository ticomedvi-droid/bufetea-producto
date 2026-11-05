import type { Metadata } from "next";
import Link from "next/link";
import { clientes } from "@/lib/datos";
import { IDIOMAS } from "@/lib/extras-info";

export const metadata: Metadata = { title: "Clientes" };

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string; p?: string }> }) {
  const { q = "", p = "0" } = await searchParams;
  const pagina = Math.max(0, Number(p) || 0);
  const { filas, total } = await clientes(q, pagina);
  const paginas = Math.ceil(total / 50);
  return (
    <>
      <div className="toolbar">
        <form className="busca" role="search"><label className="sr" htmlFor="q">Buscar clientes</label>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar por nombre, email, móvil o DNI" /></form>
        <Link className="btn primary sm" href="/clientes/nuevo">Nuevo cliente</Link>
        <Link className="btn ghost sm" href="/clientes/importar">Importar CSV o Excel</Link>
      </div>
      <div className="tablewrap">
        {filas.length === 0 ? (
          <div className="vacio">
            {q ? <>No hay clientes que coincidan con «{q}».</> : <>Aún no hay clientes. Dalos de alta a mano o impórtalos de una hoja de cálculo.</>}
          </div>
        ) : (
          <table>
            <caption className="sr">Clientes del despacho</caption>
            <thead><tr><th>Cliente</th><th>Contacto</th><th>Idioma</th><th>Canal</th><th>Código</th></tr></thead>
            <tbody>
              {filas.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/clientes/${c.id}`}>{c.nombre}</Link>{c.tipo === "Empresa" && <span className="note"> · Empresa</span>}</td>
                  <td>{c.telefono ?? ""}{c.telefono && c.email ? <br /> : null}<span className="note">{c.email ?? ""}</span></td>
                  <td>{IDIOMAS[c.idioma] ?? c.idioma}</td>
                  <td>{c.canal === "email" ? "Email" : "WhatsApp"}</td>
                  <td><code style={{ fontFamily: "var(--mono)" }}>{c.codigo ?? "—"}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {paginas > 1 && (
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <span className="note">{total} clientes · página {pagina + 1} de {paginas}</span>
          <span className="actions">
            {pagina > 0 && <Link className="btn ghost sm" href={`/clientes?q=${encodeURIComponent(q)}&p=${pagina - 1}`}>Anterior</Link>}
            {pagina + 1 < paginas && <Link className="btn ghost sm" href={`/clientes?q=${encodeURIComponent(q)}&p=${pagina + 1}`}>Siguiente</Link>}
          </span>
        </div>
      )}
    </>
  );
}
