"use client";
import { useEffect, useRef, useState } from "react";

// Transición de bienvenida al iniciar sesión (solo entonces: la activa «?bienvenida=1» en la URL).
// Las tres columnas suben en cascada, se encienden las ventanas, salta la «a» y el logo vuela a su sitio en el menú
// mientras aparece Hoy. Se inclina hacia el cursor y se salta con un clic o una tecla. Con «reducir movimiento», un fundido.
const DURACION_ENTRADA = 1150; // columnas, ventanas y salto
const DURACION_VUELO = 650;

export function AnimacionEntrada() {
  const [activa, setActiva] = useState(false);
  const capa = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const terminada = useRef(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("bienvenida") !== "1") return;
    url.searchParams.delete("bienvenida");
    history.replaceState(null, "", url.pathname + (url.search || "") + url.hash);
    setActiva(true);
  }, []);

  useEffect(() => {
    if (!activa || !capa.current || !logo.current) return;
    const c = capa.current, l = logo.current;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];

    const cerrar = (rapido = false) => {
      if (terminada.current) return;
      terminada.current = true;
      timers.forEach(clearTimeout);
      const fuera = c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: rapido ? 160 : reducir ? 420 : 380, easing: "ease-out", fill: "forwards" });
      fuera.onfinish = () => setActiva(false);
    };

    if (reducir) {
      c.classList.add("quieta");
      timers.push(window.setTimeout(() => cerrar(), 650));
    } else {
      // Inclinación hacia el cursor.
      const mover = (e: PointerEvent) => {
        const r = l.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        l.style.setProperty("--rx", `${(-dy * 28).toFixed(2)}deg`);
        l.style.setProperty("--ry", `${(dx * 34).toFixed(2)}deg`);
        l.style.setProperty("--tx", `${(dx * 18).toFixed(1)}px`);
        l.style.setProperty("--ty", `${(dy * 14).toFixed(1)}px`);
      };
      window.addEventListener("pointermove", mover);
      timers.push(window.setTimeout(() => {
        // Vuelo hasta el logo del menú lateral.
        const destino = document.querySelector(".side .logo svg")?.getBoundingClientRect();
        const origen = l.querySelector("svg")?.getBoundingClientRect();
        window.removeEventListener("pointermove", mover);
        if (!destino || !origen) return cerrar();
        const dx = destino.left + destino.width / 2 - (origen.left + origen.width / 2);
        const dy = destino.top + destino.height / 2 - (origen.top + origen.height / 2);
        const escala = destino.width / origen.width;
        l.classList.add("volando");
        l.animate(
          [{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${dx}px, ${dy}px) scale(${escala})` }],
          { duration: DURACION_VUELO, easing: "cubic-bezier(.65,0,.25,1)", fill: "forwards" },
        );
        c.classList.add("abriendo");
        timers.push(window.setTimeout(() => cerrar(), DURACION_VUELO - 120));
      }, DURACION_ENTRADA));
      timers.push(window.setTimeout(() => window.removeEventListener("pointermove", mover), DURACION_ENTRADA + 10));
    }

    const saltar = () => cerrar(true);
    window.addEventListener("keydown", saltar);
    c.addEventListener("click", saltar);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", saltar);
      c.removeEventListener("click", saltar);
    };
  }, [activa]);

  if (!activa) return null;
  return (
    <div ref={capa} className="bienvenida" data-bienvenida aria-hidden="true">
      <div ref={logo} className="bv-logo">
        <svg viewBox="0 0 34 34" width="148" height="148">
          <g className="col c1"><rect x="4" y="17" width="6" height="13" rx="1" /><rect x="2.5" y="14.6" width="9" height="2.6" rx="1.2" /><rect className="win" x="6" y="20" width="2" height="6" rx="1" /></g>
          <g className="col c2"><rect x="14" y="11" width="6" height="19" rx="1" /><rect x="12.5" y="8.6" width="9" height="2.6" rx="1.2" /><rect className="win" x="16" y="14" width="2" height="9" rx="1" /></g>
          <g className="col c3"><rect x="24" y="5" width="6" height="25" rx="1" /><rect x="22.5" y="2.6" width="9" height="2.6" rx="1.2" /><rect className="win" x="26" y="8" width="2" height="12" rx="1" /></g>
          <rect className="base" x="1" y="30.4" width="32" height="2.8" rx="1.4" />
        </svg>
        <span className="bv-palabra">Bufete<b>a</b></span>
      </div>
      <span className="bv-saltar">Pulsa cualquier tecla para saltar</span>
    </div>
  );
}
