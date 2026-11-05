"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Candado, Logo } from "@/components/Logo";
import { MENU, tituloDe } from "@/lib/menu";
import type { IdExtra } from "@/lib/tipos";
import { salir } from "@/app/(acceso)/acciones";
import { AnimacionEntrada } from "@/components/AnimacionEntrada";

type Props = {
  children: React.ReactNode;
  nombre: string;
  despacho: string;
  rolTexto: string;
  plan: string;
  extrasActivos: IdExtra[];
  porRevisar: number;
  noLeidos: number;
  demo: boolean;
};

const iniciales = (n: string) =>
  n.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";

export function Armazon({ children, nombre, despacho, rolTexto, plan, extrasActivos, porRevisar, noLeidos, demo }: Props) {
  const ruta = usePathname();
  const n = extrasActivos.length;
  return (
    <>
      <a className="sr" href="#contenido">Saltar al contenido</a>
      <AnimacionEntrada />
      {demo && (
        <div className="demo-bar" role="note">
          <span><b>Ejemplo de demostración con datos ficticios.</b> No se envía nada a nadie.</span>
        </div>
      )}
      <div className="app">
        <aside className="side">
          <Logo />
          <nav className="menu" aria-label="Secciones">
            {MENU.map((g) => (
              <div key={g.grupo ?? "inicio"} style={{ display: "contents" }}>
                {g.grupo && <span className="msep">{g.grupo}</span>}
                {g.entradas.map((e) => {
                  const actual = ruta === e.ruta || ruta.startsWith(e.ruta + "/");
                  const bloqueado = !!e.extra && !extrasActivos.includes(e.extra);
                  return (
                    <Link key={e.ruta} href={e.ruta} aria-current={actual ? "page" : undefined} className={bloqueado ? "locked" : undefined}
                      data-extra={e.extra} data-bloqueado={bloqueado ? "1" : undefined}>
                      <span className="mtxt">{e.texto}{e.sub && <small className="msub">{e.sub}</small>}</span>
                      {e.contador === "revisar" && porRevisar > 0 && <span className="count">{porRevisar}</span>}
                      {e.contador === "whatsapp" && noLeidos > 0 && <span className="count">{noLeidos}</span>}
                      {bloqueado && <span className="lock" title="Extra no incluido en tu plan"><Candado /><span className="sr"> (no incluido en tu plan)</span></span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="foot">
            {demo ? <span className="tag warn">Demo</span> : null}
            <span>{despacho}</span>
            <span>Datos alojados y procesados en la Unión Europea</span>
          </div>
        </aside>
        <div className="main">
          <header className="bar">
            <h1>{tituloDe(ruta)}</h1>
            <div className="who">
              <Link className="plan-badge" href="/plan"><i /><span>{plan}{n ? ` + ${n} ${n === 1 ? "extra" : "extras"}` : ""}</span></Link>
              <span className="note" style={{ fontSize: ".85rem" }}>{nombre} · {rolTexto}</span>
              <span className="avatar" aria-hidden="true">{iniciales(nombre)}</span>
              <form action={salir}><button className="btn ghost sm salir" type="submit">Salir</button></form>
            </div>
          </header>
          <main className="view" id="contenido">{children}</main>
        </div>
      </div>
    </>
  );
}
