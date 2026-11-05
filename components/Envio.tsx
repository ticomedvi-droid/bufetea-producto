"use client";
import { useActionState, useEffect, useState } from "react";

export type Resultado = { ok: boolean; mensaje: string; ir?: string } | null;

/** Formulario con acción de servidor: muestra el resultado en un aviso emergente, como los toasts de producto.html. */
export function FormAccion({
  accion, children, className, id,
}: { accion: (prev: Resultado, f: FormData) => Promise<Resultado>; children: React.ReactNode; className?: string; id?: string }) {
  const [estado, ejecutar, enviando] = useActionState(accion, null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!estado) return;
    if (estado.ok && estado.ir) { window.location.assign(estado.ir); return; }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4200);
    return () => clearTimeout(t);
  }, [estado]);
  return (
    <form action={ejecutar} className={className} id={id} aria-busy={enviando}>
      <fieldset disabled={enviando} style={{ border: 0, padding: 0, margin: 0, display: "contents" }}>{children}</fieldset>
      {estado && visible && (
        <div className="toast" role="status" style={{ background: estado.ok ? "var(--night)" : "var(--green-ink)" }}>{estado.mensaje}</div>
      )}
    </form>
  );
}
