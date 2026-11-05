import { LogoSvg } from "@/components/Logo";

// Panel de la marca del acceso, igual que producto.html.
export function PanelMarca() {
  return (
    <aside className="lb">
      <div>
        <span className="logo"><LogoSvg /><span className="word">Bufete<b>a</b></span></span>
      </div>
      <div>
        <h2 className="big2">Tus clientes, siempre informados. <em>Tú, sin interrupciones.</em></h2>
        <p>Conecta Bufetea a tu programa de gestión y deja que el trabajo se haga solo: los avisos de rutina salen solos, cada novedad llega explicada y el «¿cómo va lo mío?» se responde sin que levantes el teléfono.</p>
        <div className="pills"><span>Notificaciones explicadas</span><span>WhatsApp del despacho</span><span>Avisos que salen solos</span></div>
      </div>
      <p className="lf">© Bufetea · Datos alojados y procesados en la Unión Europea</p>
    </aside>
  );
}
