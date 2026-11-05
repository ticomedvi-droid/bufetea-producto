import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cliente } from "@/lib/datos";
import { FormCliente } from "@/components/FormCliente";
import { Historial } from "@/components/Historial";
import { FormAccion } from "@/components/Envio";
import { SITUACIONES } from "@/lib/extras-info";
import { eliminarCliente } from "../../acciones";

export const metadata: Metadata = { title: "Ficha de cliente" };

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await cliente(id);
  if (!d || d.cliente.eliminado) notFound();
  const c = d.cliente;
  return (
    <>
      <div className="dhead" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div><span className="lbl">Ficha de cliente</span><h2 style={{ fontSize: "1.5rem" }}>{c.nombre}</h2></div>
        <div className="seal" title="Se lo pedimos antes de hablar de su asunto por WhatsApp, teléfono o portal">
          <span><small className="note">Código de verificación</small><b style={{ fontFamily: "var(--mono)", letterSpacing: ".12em" }}>{c.codigo ?? "—"}</b></span>
        </div>
      </div>
      <div className="cols">
        <div className="panel"><h2>Datos del cliente</h2><div className="cuerpo"><FormCliente c={c} /></div></div>
        <div style={{ display: "grid", gap: 18 }}>
          <div className="panel">
            <h2>Asuntos <Link href={`/asuntos/nuevo?cliente=${c.id}`}>Nuevo asunto</Link></h2>
            {d.asuntos.length === 0 ? <p className="vacio">Sin asuntos todavía.</p> : d.asuntos.map((a) => (
              <Link key={a.id} className="row" href={`/asuntos/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <span className="t">{a.numero ?? a.procedimiento ?? "—"}</span>
                <span><b>{a.descripcion ?? "Asunto"}</b><span className="d">{a.fase_cliente ?? "Sin fase indicada"}</span></span>
                <span className={a.situacion === "abierto" ? "tag green" : "tag"}>{SITUACIONES[a.situacion]}</span>
              </Link>
            ))}
          </div>
          <FormAccion accion={eliminarCliente} className="panel">
            <h2>Eliminar de Bufetea</h2>
            <div className="cuerpo">
              <p className="note">Deja de aparecer y deja de recibir avisos. No se borra de tu programa de gestión. Su historial se conserva hasta que el despacho pida el borrado.</p>
              <input type="hidden" name="id" value={c.id} />
              <label className="check"><input type="checkbox" name="confirma" required /><span>Sí, quiero eliminar a {c.nombre} de Bufetea.</span></label>
              <div className="actions"><button className="btn ghost sm" type="submit">Eliminar cliente</button></div>
            </div>
          </FormAccion>
        </div>
      </div>
      <Historial mensajes={d.mensajes} />
    </>
  );
}
