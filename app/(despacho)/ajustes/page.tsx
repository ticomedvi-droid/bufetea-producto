import type { Metadata } from "next";
import Link from "next/link";
import { equipo, numeroWhatsApp, sesion } from "@/lib/datos";
import { FormAccion } from "@/components/Envio";
import { direcciones, VERSION_ART28 } from "@/lib/config";
import { ROLES } from "@/lib/extras-info";
import { aceptarArt28, ajustarDespacho, cambiarRol, desactivar, invitar } from "../acciones";

export const metadata: Metadata = { title: "Ajustes" };

const PENDIENTE = <span className="note">Pendiente de dominio: se activa cuando Bufetea tenga su dominio propio.</span>;

export default async function Ajustes() {
  const s = await sesion();
  if (!s || s === "sin-despacho") return null;
  const d = s.despacho;
  const admin = s.rol === "admin";
  const [eq, wa] = await Promise.all([equipo(), numeroWhatsApp()]);
  const dir = direcciones(d.slug);
  return (
    <>
      <div className="grid2">
        <div className="panel">
          <h2>Tu despacho</h2>
          <div className="cuerpo">
            <dl className="kv2">
              <dt>Nombre</dt><dd>{d.nombre}</dd>
              <dt>Identificador</dt><dd><code style={{ fontFamily: "var(--mono)" }}>{d.slug ?? "—"}</code></dd>
              <dt>Buzón para LexNET</dt><dd>{dir.buzon ? <code style={{ fontFamily: "var(--mono)" }}>{dir.buzon}</code> : PENDIENTE}</dd>
              <dt>Remitente de los emails</dt><dd>{dir.remitente ?? PENDIENTE}</dd>
              <dt>Portal del cliente</dt><dd>{dir.portal ?? PENDIENTE}</dd>
              <dt>WhatsApp del despacho</dt><dd>{wa ? <>{wa.numero} {wa.modo === "pruebas" ? <span className="tag warn">Modo de pruebas de Meta</span> : <span className="tag green">Conectado</span>}</> : <span className="note">Sin conectar: lo dejamos montado en la puesta en marcha.</span>}</dd>
            </dl>
            <p className="note">Reenvía a tu buzón los PDF de las notificaciones de LexNET y Bufetea los asociará a su asunto por el número de procedimiento.</p>
          </div>
        </div>
        <FormAccion accion={ajustarDespacho} className="panel">
          <h2>Firma y respuestas</h2>
          <div className="cuerpo">
            <div className="fld"><label htmlFor="a-firma">Firma de los mensajes</label>
              <textarea id="a-firma" name="firma" maxLength={300} defaultValue={d.firma ?? ""} disabled={!admin} style={{ minHeight: 70 }} /></div>
            <div className="fld"><label htmlFor="a-resp">Email donde recibir las respuestas de los clientes</label>
              <input id="a-resp" name="email_respuesta" type="email" maxLength={200} defaultValue={d.email_respuesta ?? ""} disabled={!admin} /></div>
            {admin ? <div className="actions"><button className="btn primary sm" type="submit">Guardar</button></div> : <p className="note">Solo la persona titular puede cambiarlo.</p>}
          </div>
        </FormAccion>
      </div>

      <div className="panel" id="art28">
        <h2>Contrato de encargo del tratamiento (art. 28 RGPD) {d.art28_aceptado_en ? <span className="tag green">Aceptado</span> : <span className="tag warn">Pendiente</span>}</h2>
        <div className="cuerpo">
          <p className="mute">Tu despacho es el responsable de los datos de sus clientes y Bufetea, el encargado del tratamiento. Este contrato fija qué hace Bufetea con esos datos: solo lo necesario para el servicio, en la Unión Europea, sin entrenar modelos de IA y devolviéndolos y borrándolos si os vais.</p>
          <p><Link className="lnk" href="/contrato-encargo" target="_blank">Leer el contrato (versión {VERSION_ART28})</Link></p>
          {d.art28_aceptado_en ? (
            <p className="note">Aceptado el {new Date(d.art28_aceptado_en).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" })} · versión {d.art28_version ?? VERSION_ART28}.</p>
          ) : admin ? (
            <FormAccion accion={aceptarArt28} className="form">
              <label className="check"><input type="checkbox" name="art28" required /><span>He leído y acepto el contrato de encargo del tratamiento en nombre de {d.nombre}.</span></label>
              <div className="actions"><button className="btn primary sm" type="submit">Aceptar el contrato</button></div>
            </FormAccion>
          ) : <p className="note">Lo tiene que aceptar la persona titular del despacho.</p>}
        </div>
      </div>

      <div className="panel">
        <h2>Equipo <span className="note">Usuarios ilimitados en todos los planes</span></h2>
        <div className="tablewrap" style={{ border: 0, boxShadow: "none", borderRadius: 0 }}>
          <table>
            <caption className="sr">Personas del despacho</caption>
            <thead><tr><th>Persona</th><th>Rol</th><th>Acceso</th></tr></thead>
            <tbody>{eq.map((m) => (
              <tr key={m.id}>
                <td><b>{m.nombre ?? m.email}</b>{m.nombre && <><br /><span className="note">{m.email}</span></>}</td>
                <td>{admin && m.id !== s.usuarioId ? (
                  <FormAccion accion={cambiarRol} className="toolbar">
                    <input type="hidden" name="usuario" value={m.id} />
                    <label className="sr" htmlFor={`rol-${m.id}`}>Rol de {m.nombre ?? m.email}</label>
                    <select id={`rol-${m.id}`} name="rol" defaultValue={m.rol} style={{ font: "inherit", padding: "6px 10px", borderRadius: 10, border: "1px solid var(--line)" }}>
                      {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button className="btn link" type="submit">Cambiar</button>
                  </FormAccion>
                ) : ROLES[m.rol]}</td>
                <td>{m.activo ? <span className="tag green">Activo</span> : <span className="tag">Desactivado</span>}
                  {admin && m.id !== s.usuarioId && (
                    <FormAccion accion={desactivar}>
                      <input type="hidden" name="usuario" value={m.id} /><input type="hidden" name="reactivar" value={m.activo ? "0" : "1"} />
                      <button className="btn link" type="submit">{m.activo ? "Desactivar" : "Reactivar"}</button>
                    </FormAccion>
                  )}
                </td>
              </tr>))}
            </tbody>
          </table>
        </div>
        <div className="cuerpo">
          <p className="note">Titular: gestiona el plan, el equipo y los ajustes. Abogado/a: aprueba lo que sale a los clientes. Administración: prepara mensajes de trámite; lo jurídico lo aprueba un abogado.</p>
          {admin && (
            <FormAccion accion={invitar} className="form">
              <div className="fila3">
                <div className="fld"><label htmlFor="i-email">Email</label><input id="i-email" name="email" type="email" required maxLength={200} /></div>
                <div className="fld"><label htmlFor="i-nombre">Nombre</label><input id="i-nombre" name="nombre" maxLength={120} /></div>
                <div className="fld"><label htmlFor="i-rol">Rol</label>
                  <select id="i-rol" name="rol" defaultValue="abogado">{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div className="actions"><button className="btn primary sm" type="submit">Invitar por correo</button></div>
            </FormAccion>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Tus datos</h2>
        <div className="cuerpo">
          <p className="mute">Puedes pedir en cualquier momento una exportación completa de los datos de tu despacho o su borrado seguro al darte de baja. Escríbenos y lo tramitamos dentro del plazo legal.</p>
        </div>
      </div>
    </>
  );
}
