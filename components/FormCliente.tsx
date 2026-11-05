import { FormAccion } from "@/components/Envio";
import { IDIOMAS } from "@/lib/extras-info";
import type { Cliente } from "@/lib/tipos";
import { guardarCliente } from "@/app/(despacho)/acciones";

export function FormCliente({ c }: { c?: Cliente }) {
  const delPrograma = c && c.origen !== "manual" && c.origen !== "csv";
  return (
    <FormAccion accion={guardarCliente} className="form">
      {c && <input type="hidden" name="id" value={c.id} />}
      {delPrograma && <p className="note">Este cliente viene de tu programa de gestión: el nombre y los datos de contacto se cambian allí y se actualizan solos. Aquí puedes ajustar el idioma, el canal, el DNI y las notas.</p>}
      <div className="fila2">
        <div className="fld"><label htmlFor="c-nombre">Nombre y apellidos o razón social</label><input id="c-nombre" name="nombre" required minLength={2} maxLength={200} defaultValue={c?.nombre} readOnly={delPrograma} /></div>
        <div className="fld"><label htmlFor="c-tipo">Tipo</label>
          <select id="c-tipo" name="tipo" defaultValue={c?.tipo ?? "Persona"} disabled={delPrograma}><option value="Persona">Persona</option><option value="Empresa">Empresa</option></select></div>
      </div>
      <div className="fila3">
        <div className="fld"><label htmlFor="c-tel">Móvil</label><input id="c-tel" name="telefono" type="tel" autoComplete="off" maxLength={40} defaultValue={c?.telefono ?? ""} readOnly={delPrograma} /></div>
        <div className="fld"><label htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" autoComplete="off" maxLength={200} defaultValue={c?.email ?? ""} readOnly={delPrograma} /></div>
        <div className="fld"><label htmlFor="c-dni">DNI, NIE o NIF</label><input id="c-dni" name="dni" maxLength={20} defaultValue={c?.dni ?? ""} /><span className="ayuda">Para que entre en el portal, si lo tienes.</span></div>
      </div>
      <div className="fila2">
        <div className="fld"><label htmlFor="c-idioma">Idioma del cliente</label>
          <select id="c-idioma" name="idioma" defaultValue={c?.idioma ?? "es"}>{Object.entries(IDIOMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <span className="ayuda">Los mensajes aprobados le llegan en este idioma.</span></div>
        <div className="fld"><label htmlFor="c-canal">Canal preferido</label>
          <select id="c-canal" name="canal" defaultValue={c?.canal ?? "whatsapp"}><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select>
          <span className="ayuda">Si no usa WhatsApp, se le escribe por email.</span></div>
      </div>
      <div className="fld"><label htmlFor="c-notas">Notas internas</label><textarea id="c-notas" name="notas" maxLength={4000} defaultValue={c?.notas ?? ""} /><span className="ayuda">Solo las ve tu equipo. Nunca se envían al cliente.</span></div>
      <div className="actions"><button className="btn primary sm" type="submit">{c ? "Guardar cambios" : "Dar de alta"}</button></div>
    </FormAccion>
  );
}
