import type { Metadata } from "next";
import { Importador } from "./Importador";

export const metadata: Metadata = { title: "Importar clientes y asuntos" };

export default function Importar() {
  return (
    <div className="panel">
      <h2>Importar clientes y asuntos</h2>
      <div className="cuerpo">
        <p className="mute">Sube una hoja de cálculo (CSV o Excel) con una fila por asunto, o por cliente si aún no tiene asuntos. Bufetea reconoce los clientes que ya tienes (por DNI, email, móvil o nombre) y los asuntos (por número o procedimiento): no duplica nada, completa lo que falta.</p>
        <Importador />
      </div>
    </div>
  );
}
