"use client";
import { useState } from "react";

/** Selector de PDF con texto en español (el botón nativo del navegador sale en su idioma). */
export function ElegirPdf({ id = "pdf" }: { id?: string }) {
  const [nombre, setNombre] = useState<string | null>(null);
  return (
    <span className="toolbar" style={{ gap: 8 }}>
      <input id={id} name="archivo" type="file" accept="application/pdf,.pdf" required className="sr"
        onChange={(e) => setNombre(e.target.files?.[0]?.name ?? null)} />
      <label htmlFor={id} className="btn ghost sm" style={{ cursor: "pointer" }}>{nombre ? "Cambiar PDF" : "Elegir el PDF"}</label>
      <span className="note" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre ?? "Ningún archivo elegido"}</span>
    </span>
  );
}
