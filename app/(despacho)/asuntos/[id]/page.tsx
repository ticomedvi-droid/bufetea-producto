import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asunto, clientes, equipo } from "@/lib/datos";
import { FormAsunto } from "@/components/FormAsunto";
import { Historial } from "@/components/Historial";
import { FormAccion } from "@/components/Envio";
import { SITUACIONES } from "@/lib/extras-info";
import { desvincularCliente, vincularCliente } from "../../acciones";

export const metadata: Metadata = { title: "Ficha de asunto" };

export default async function FichaAsunto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, eq, cs] = await Promise.all([asunto(id), equipo(), clientes("", 0, 1000)]);
  if (!d) notFound();
  const a = d.asunto;
  const libres = cs.filas.filter((c) => !a.clientes.some((x) => x.id === c.id));
  return (
    <>
      <div className="dhead" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div><span className="lbl">{[a.numero, a.procedimiento && a.procedimiento !== a.numero ? `Proc. ${a.procedimiento}` : null, a.juzgado].filter(Boolean).join(" · ") || "Ficha de asunto"}</span>
          <h2 style={{ fontSize: "1.5rem" }}>{a.descripcion ?? a.numero ?? "Asunto"}</h2></div>
        <span className={a.situacion === "abierto" ? "tag green" : "tag"}>{SITUACIONES[a.situacion]}</span>
      </div>
      <div className="cols">
        <div className="panel"><h2>Datos del asunto</h2><div className="cuerpo"><FormAsunto a={a} equipo={eq} /></div></div>
        <div style={{ display: "grid", gap: 18 }}>
          <div className="panel">
            <h2>Clientes del asunto</h2>
            {a.clientes.length === 0 && <p className="vacio">Sin clientes. Mientras no tenga ninguno, no cuenta como asunto activo.</p>}
            {a.clientes.map((c) => (
              <div className="row" key={c.id} style={{ cursor: "default" }}>
                <span className="t">{c.id === a.cliente_id ? "Principal" : ""}</span>
                <span><Link href={`/clientes/${c.id}`} style={{ fontWeight: 600 }}>{c.nombre}</Link></span>
                <FormAccion accion={desvincularCliente}>
                  <input type="hidden" name="asunto_id" value={a.id} /><input type="hidden" name="cliente_id" value={c.id} />
                  <button className="btn link" type="submit" aria-label={`Quitar a ${c.nombre} del asunto`}>Quitar</button>
                </FormAccion>
              </div>
            ))}
            {libres.length > 0 && (
              <FormAccion accion={vincularCliente} className="cuerpo">
                <input type="hidden" name="asunto_id" value={a.id} />
                <div className="fld"><label htmlFor="v-cli">Añadir un cliente</label>
                  <select id="v-cli" name="cliente_id" required defaultValue=""><option value="" disabled>Elige un cliente</option>{libres.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                <div className="actions"><button className="btn ghost sm" type="submit">Añadir</button></div>
              </FormAccion>
            )}
          </div>
          <div className="panel"><h2>Mapa del procedimiento</h2><div className="cuerpo">
            <p className="mute">Fase actual que ve el cliente: <b>{a.fase_cliente ?? "sin indicar"}</b>.</p>
            <p className="note">Las fases siguientes, explicadas sin tecnicismos, llegan con la próxima actualización.</p></div></div>
        </div>
      </div>
      <Historial mensajes={d.mensajes} />
    </>
  );
}
