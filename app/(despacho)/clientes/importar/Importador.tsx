"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { importar, type FilaImportacion } from "../../acciones";

type Campo = { clave: string; texto: string; grupo: "cliente" | "asunto"; alias: string[] };
const CAMPOS: Campo[] = [
  { clave: "nombre", texto: "Nombre del cliente", grupo: "cliente", alias: ["nombre", "cliente", "nombre y apellidos", "razon social", "nombre cliente"] },
  { clave: "email", texto: "Email", grupo: "cliente", alias: ["email", "correo", "e-mail", "correo electronico"] },
  { clave: "telefono", texto: "Móvil", grupo: "cliente", alias: ["telefono", "movil", "tel", "celular", "whatsapp"] },
  { clave: "dni", texto: "DNI / NIE / NIF", grupo: "cliente", alias: ["dni", "nie", "nif", "cif", "documento"] },
  { clave: "idioma", texto: "Idioma (es, en, ro…)", grupo: "cliente", alias: ["idioma", "lengua"] },
  { clave: "canal", texto: "Canal (whatsapp o email)", grupo: "cliente", alias: ["canal", "canal preferido"] },
  { clave: "numero", texto: "Número de asunto", grupo: "asunto", alias: ["numero", "n asunto", "asunto", "expediente", "referencia", "n expediente"] },
  { clave: "procedimiento", texto: "Procedimiento", grupo: "asunto", alias: ["procedimiento", "autos", "n procedimiento", "numero procedimiento"] },
  { clave: "juzgado", texto: "Juzgado", grupo: "asunto", alias: ["juzgado", "organo", "tribunal"] },
  { clave: "descripcion", texto: "Descripción", grupo: "asunto", alias: ["descripcion", "materia", "objeto", "titulo"] },
  { clave: "area", texto: "Área", grupo: "asunto", alias: ["area", "jurisdiccion", "especialidad"] },
  { clave: "tipo_procedimiento", texto: "Tipo de procedimiento", grupo: "asunto", alias: ["tipo", "tipo procedimiento", "tipo de procedimiento"] },
  { clave: "abogado", texto: "Abogado", grupo: "asunto", alias: ["abogado", "letrado", "responsable", "abogada"] },
  { clave: "fase", texto: "Fase", grupo: "asunto", alias: ["fase", "estado procesal", "situacion procesal"] },
  { clave: "situacion", texto: "Estado (abierto, cerrado, archivado)", grupo: "asunto", alias: ["estado", "situacion"] },
];
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[º°.#]/g, "").replace(/\s+/g, " ").trim();
const LOTE = 1000;

type Resumen = { clientes_nuevos: number; clientes_actualizados: number; asuntos_nuevos: number; asuntos_actualizados: number; errores: { fila: number; error: string }[] };

export function Importador() {
  const [cabecera, setCabecera] = useState<string[]>([]);
  const [filas, setFilas] = useState<string[][]>([]);
  const [mapa, setMapa] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [res, setRes] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(false);

  async function leer(f: File) {
    setMsg(null); setRes(null);
    try {
      let datos: string[][];
      if (/\.xlsx$/i.test(f.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        const hoja = await readSheet(f);
        datos = hoja.map((r) => r.map((c) => (c == null ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c))));
      } else if (/\.(csv|txt)$/i.test(f.name)) {
        const texto = await f.text();
        datos = Papa.parse<string[]>(texto, { skipEmptyLines: "greedy" }).data;
      } else {
        setMsg({ ok: false, t: "Sube un archivo .csv o .xlsx. Si tienes un .xls antiguo, guárdalo como .xlsx." });
        return;
      }
      datos = datos.filter((r) => r.some((c) => String(c).trim()));
      if (datos.length < 2) { setMsg({ ok: false, t: "El archivo no tiene filas de datos." }); return; }
      const cab = datos[0].map((c) => String(c).trim());
      const auto: Record<string, number> = {};
      CAMPOS.forEach((campo) => {
        const i = cab.findIndex((c) => campo.alias.includes(norm(c)));
        if (i >= 0 && !Object.values(auto).includes(i)) auto[campo.clave] = i;
      });
      setCabecera(cab); setFilas(datos.slice(1)); setMapa(auto);
    } catch {
      setMsg({ ok: false, t: "No hemos podido leer el archivo. Comprueba que no esté protegido con contraseña." });
    }
  }

  const convertidas: FilaImportacion[] = useMemo(() => filas.map((r) => {
    const o: FilaImportacion = { cliente: {}, asunto: {} };
    CAMPOS.forEach((c) => { const i = mapa[c.clave]; if (i != null && i >= 0) o[c.grupo][c.clave] = String(r[i] ?? "").trim(); });
    return o;
  }), [filas, mapa]);

  async function subir() {
    if (mapa.nombre == null) { setMsg({ ok: false, t: "Indica qué columna tiene el nombre del cliente." }); return; }
    setCargando(true); setMsg(null);
    const total: Resumen = { clientes_nuevos: 0, clientes_actualizados: 0, asuntos_nuevos: 0, asuntos_actualizados: 0, errores: [] };
    for (let i = 0; i < convertidas.length; i += LOTE) {
      const r = await importar(convertidas.slice(i, i + LOTE));
      if (!r.ok) { setMsg({ ok: false, t: r.mensaje }); setCargando(false); return; }
      const d = r.detalle as unknown as Resumen;
      total.clientes_nuevos += d.clientes_nuevos; total.clientes_actualizados += d.clientes_actualizados;
      total.asuntos_nuevos += d.asuntos_nuevos; total.asuntos_actualizados += d.asuntos_actualizados;
      total.errores.push(...d.errores.map((e) => ({ ...e, fila: e.fila + i })));
    }
    setRes(total); setCargando(false);
  }

  function plantilla() {
    const csv = "Nombre;Email;Móvil;DNI;Idioma;Canal;Número de asunto;Procedimiento;Juzgado;Descripción;Área;Abogado;Fase;Estado\n" +
      "Lucía Martín Sáez;lucia@ejemplo.es;+34 600 000 000;12345678Z;es;whatsapp;2026/041;412/2026;Juzgado de Primera Instancia n.º 4;Reclamación de cantidad;Civil;Elena Ortega;Demanda admitida;abierto\n";
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "plantilla-bufetea.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="form">
      <div className="toolbar">
        <div className="fld" style={{ flex: "1 1 280px" }}>
          <label htmlFor="archivo">Archivo CSV o Excel (.xlsx)</label>
          <input id="archivo" type="file" accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) leer(f); }} />
        </div>
        <button type="button" className="btn ghost sm" onClick={plantilla}>Descargar plantilla</button>
      </div>
      {msg && <p role="status" className={`aviso ${msg.ok ? "ok" : "err"}`}>{msg.t}</p>}
      {cabecera.length > 0 && !res && (
        <>
          <div className="panel">
            <h2>Columnas <span className="note">{filas.length} filas</span></h2>
            <div className="cuerpo">
              <p className="note">Revisa qué columna de tu archivo corresponde a cada dato. Lo que no tengas, déjalo en «No importar».</p>
              <div className="fila3">
                {CAMPOS.map((c) => (
                  <div className="fld" key={c.clave}>
                    <label htmlFor={`m-${c.clave}`}>{c.texto}{c.clave === "nombre" ? " *" : ""}</label>
                    <select id={`m-${c.clave}`} value={mapa[c.clave] ?? -1} onChange={(e) => setMapa({ ...mapa, [c.clave]: Number(e.target.value) })}>
                      <option value={-1}>No importar</option>
                      {cabecera.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="tablewrap">
            <table>
              <caption className="sr">Vista previa de las primeras filas</caption>
              <thead><tr><th>Cliente</th><th>Contacto</th><th>Asunto</th><th>Juzgado</th><th>Estado</th></tr></thead>
              <tbody>{convertidas.slice(0, 8).map((f, i) => (
                <tr key={i}><td>{f.cliente.nombre || <span className="tag red">Falta el nombre</span>}</td>
                  <td>{[f.cliente.telefono, f.cliente.email].filter(Boolean).join(" · ")}</td>
                  <td>{[f.asunto.numero, f.asunto.procedimiento, f.asunto.descripcion].filter(Boolean).join(" · ")}</td>
                  <td>{f.asunto.juzgado}</td><td>{f.asunto.situacion}</td></tr>))}
              </tbody>
            </table>
          </div>
          <div className="actions">
            <button type="button" className="btn primary sm" onClick={subir} disabled={cargando}>{cargando ? "Importando…" : `Importar ${filas.length} filas`}</button>
          </div>
        </>
      )}
      {res && (
        <div className="panel" role="status">
          <h2>Importación terminada</h2>
          <div className="cuerpo">
            <dl className="kv2">
              <dt>Clientes nuevos</dt><dd>{res.clientes_nuevos}</dd><dt>Clientes que ya tenías</dt><dd>{res.clientes_actualizados}</dd>
              <dt>Asuntos nuevos</dt><dd>{res.asuntos_nuevos}</dd><dt>Asuntos que ya tenías</dt><dd>{res.asuntos_actualizados}</dd>
              <dt>Filas con errores</dt><dd>{res.errores.length}</dd>
            </dl>
            {res.errores.length > 0 && <ul className="puntos" style={{ listStyle: "disc", paddingLeft: "1.2rem" }}>{res.errores.slice(0, 50).map((e) => <li key={e.fila}>Fila {e.fila + 1}: {e.error}</li>)}</ul>}
            <div className="actions"><Link className="btn ghost sm" href="/clientes">Ver clientes</Link><Link className="btn ghost sm" href="/asuntos">Ver asuntos</Link></div>
          </div>
        </div>
      )}
    </div>
  );
}
