import { FormAccion } from "@/components/Envio";
import type { Asunto, Miembro } from "@/lib/tipos";
import { guardarAsunto } from "@/app/(despacho)/acciones";

export function FormAsunto({ a, equipo, clienteId, clientes }: { a?: Asunto; equipo: Miembro[]; clienteId?: string; clientes?: { id: string; nombre: string }[] }) {
  const delPrograma = a && a.origen !== "manual" && a.origen !== "csv";
  const abogados = equipo.filter((m) => m.activo && m.rol !== "administrativo");
  return (
    <FormAccion accion={guardarAsunto} className="form">
      {a && <input type="hidden" name="id" value={a.id} />}
      {delPrograma && <p className="note">Este asunto viene de tu programa de gestión: el número, la descripción, el área, el abogado y el estado se cambian allí y se actualizan solos. Bufetea nunca escribe en tu programa.</p>}
      {!a && clientes && (
        <div className="fld"><label htmlFor="s-cli">Cliente</label>
          <select id="s-cli" name="cliente_id" defaultValue={clienteId ?? ""}><option value="">Sin cliente todavía</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
          <span className="ayuda">Un asunto solo cuenta como activo si tiene al menos un cliente.</span></div>
      )}
      <div className="fila3">
        <div className="fld"><label htmlFor="s-num">Número de asunto</label><input id="s-num" name="numero" maxLength={80} defaultValue={a?.numero ?? ""} placeholder="Tu referencia interna" readOnly={delPrograma} /></div>
        <div className="fld"><label htmlFor="s-proc">Procedimiento</label><input id="s-proc" name="procedimiento" maxLength={80} defaultValue={a?.procedimiento ?? ""} placeholder="412/2026" />
          <span className="ayuda">Con él se asocian las notificaciones que reenvíes.</span></div>
        <div className="fld"><label htmlFor="s-tipo">Tipo de procedimiento</label><input id="s-tipo" name="tipo_procedimiento" maxLength={80} defaultValue={a?.tipo_procedimiento ?? ""} placeholder="Juicio ordinario" /></div>
      </div>
      <div className="fld"><label htmlFor="s-desc">Descripción</label><input id="s-desc" name="descripcion" maxLength={500} defaultValue={a?.descripcion ?? ""} placeholder="Reclamación de cantidad a Construcciones Levante" readOnly={delPrograma} /></div>
      <div className="fila2">
        <div className="fld"><label htmlFor="s-juz">Juzgado</label><input id="s-juz" name="juzgado" maxLength={200} defaultValue={a?.juzgado ?? ""} /></div>
        <div className="fld"><label htmlFor="s-area">Área</label><input id="s-area" name="area" maxLength={80} defaultValue={a?.area ?? ""} placeholder="Civil, Laboral, Familia…" readOnly={delPrograma} /></div>
      </div>
      <div className="fila3">
        <div className="fld"><label htmlFor="s-abo">Abogado responsable</label>
          <select id="s-abo" name="abogado_id" defaultValue={a?.abogado_id ?? ""}><option value="">{a?.abogado ? `${a.abogado} (de tu programa)` : "Sin asignar"}</option>
            {abogados.map((m) => <option key={m.id} value={m.id}>{m.nombre ?? m.email}</option>)}</select></div>
        <div className="fld"><label htmlFor="s-sit">Estado</label>
          <select id="s-sit" name="situacion" defaultValue={a?.situacion ?? "abierto"} disabled={delPrograma}><option value="abierto">Abierto</option><option value="cerrado">Cerrado</option><option value="archivado">Archivado</option></select></div>
        <div className="fld"><label htmlFor="s-dup">Duplicado de</label><input id="s-dup" name="duplicado_de" maxLength={80} placeholder="Número del asunto original" defaultValue="" />
          <span className="ayuda">Los duplicados no cuentan como asuntos activos.</span></div>
      </div>
      <div className="fld"><label htmlFor="s-fase">Fase que ve el cliente</label><input id="s-fase" name="fase_cliente" maxLength={200} defaultValue={a?.fase_cliente ?? ""} placeholder="Demanda admitida" />
        <span className="ayuda">Es lo que se le cuenta si pregunta «¿cómo va lo mío?».</span></div>
      <label className="check"><input type="checkbox" name="informar" defaultChecked={a?.informar ?? true} />
        <span>Informar al cliente de este asunto. Desmárcalo para asuntos que prefieres contar en persona (por ejemplo, penal o familia).</span></label>
      <div className="fld"><label htmlFor="s-notas">Notas internas</label><textarea id="s-notas" name="notas" maxLength={4000} defaultValue={a?.notas ?? ""} /><span className="ayuda">Nunca se envían al cliente.</span></div>
      <div className="actions"><button className="btn primary sm" type="submit">{a ? "Guardar cambios" : "Dar de alta"}</button></div>
    </FormAccion>
  );
}
