import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { VERSION_ART28 } from "@/lib/config";

export const metadata: Metadata = { title: "Contrato de encargo del tratamiento" };

// Texto del contrato del art. 28 RGPD que acepta el despacho al darse de alta.
// IMPORTANTE: borrador pendiente de revisión legal, igual que las páginas legales de la web.
export default function Contrato() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 64px", display: "grid", gap: 16, background: "#fff" }}>
      <Logo href="/entrar" />
      <h1 style={{ fontSize: "1.8rem" }}>Contrato de encargo del tratamiento</h1>
      <p className="tag warn" style={{ justifySelf: "start" }}>Versión {VERSION_ART28} · borrador pendiente de revisión legal</p>
      <p>Este contrato regula el tratamiento de datos personales que Bufetea realiza por cuenta del despacho, conforme al artículo 28 del Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD).</p>
      <h2 style={{ fontSize: "1.2rem" }}>1. Partes y papeles</h2>
      <p>El despacho es el responsable del tratamiento. Bufetea es el encargado del tratamiento y trata los datos solo para prestar el servicio contratado y siguiendo las instrucciones documentadas del despacho.</p>
      <h2 style={{ fontSize: "1.2rem" }}>2. Objeto y datos</h2>
      <p>Comunicación entre el despacho y sus clientes: notificaciones judiciales explicadas, mensajes por WhatsApp y email, respuestas a consultas con verificación de identidad y, si se contratan, centralita, portal, documentos y cobros. Datos tratados: identificativos y de contacto de clientes y personal del despacho, datos de los asuntos y el contenido de las comunicaciones.</p>
      <h2 style={{ fontSize: "1.2rem" }}>3. Obligaciones de Bufetea</h2>
      <ul className="puntos" style={{ listStyle: "disc", paddingLeft: "1.2rem", display: "grid", gap: 6 }}>
        <li>Tratar los datos solo siguiendo las instrucciones del despacho y no usarlos para fines propios ni para entrenar modelos de IA.</li>
        <li>Guardar confidencialidad y exigirla a todo el personal con acceso.</li>
        <li>Alojar y procesar los datos en la Unión Europea, con cada despacho aislado del resto.</li>
        <li>Aplicar medidas de seguridad adecuadas (art. 32 RGPD): cifrado, control de acceso por usuario y registro de los accesos de soporte.</li>
        <li>Recurrir a subencargados solo con contrato equivalente e informar al despacho de cualquier cambio.</li>
        <li>Ayudar al despacho a atender los derechos de los interesados y notificarle sin dilación cualquier brecha de seguridad.</li>
        <li>Al terminar el servicio, devolver los datos al despacho y después eliminarlos de forma segura, salvo obligación legal de conservarlos.</li>
      </ul>
      <h2 style={{ fontSize: "1.2rem" }}>4. Obligaciones del despacho</h2>
      <p>Disponer de base jurídica para los datos que trata, informar a sus clientes y configurar en Bufetea qué comunicaciones salen solas y cuáles revisa.</p>
      <h2 style={{ fontSize: "1.2rem" }}>5. Duración</h2>
      <p>Mientras dure la relación de servicio entre el despacho y Bufetea.</p>
    </main>
  );
}
