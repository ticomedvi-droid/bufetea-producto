"use client";
import { useState, useTransition } from "react";
import type { Resultado } from "@/components/Envio";

type Accion = (prev: Resultado, f: FormData) => Promise<Resultado>;

/** Lanza una acción de servidor con los datos que se le pasen y enseña el resultado como en producto.html. */
export function useAccion() {
  const [pendiente, empezar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; t: string } | null>(null);
  const ejecutar = (accion: Accion, datos: Record<string, string | null | undefined>) =>
    new Promise<Resultado>((fin) =>
      empezar(async () => {
        const f = new FormData();
        for (const [k, v] of Object.entries(datos)) if (v != null) f.append(k, v);
        const r = await accion(null, f);
        if (r?.ok && r.ir) { window.location.assign(r.ir); return fin(r); }
        if (r) {
          setAviso({ ok: r.ok, t: r.mensaje });
          setTimeout(() => setAviso(null), 4200);
        }
        fin(r);
      }));
  const toast = aviso ? <div className="toast" role="status" style={{ background: aviso.ok ? "var(--night)" : "var(--green-ink)" }}>{aviso.t}</div> : null;
  return { ejecutar, pendiente, toast };
}
