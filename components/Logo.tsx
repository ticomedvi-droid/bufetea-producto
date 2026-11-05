// El logo de las tres columnas, idéntico al de la web (sin la animación al pasar el cursor, que es solo de la web).
export function LogoSvg({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 34 34" width={size} height={size} aria-hidden="true">
      <g className="col"><rect x="4" y="17" width="6" height="13" rx="1" /><rect x="2.5" y="14.6" width="9" height="2.6" rx="1.2" className="cap" /><rect className="win" x="6" y="20" width="2" height="6" rx="1" /></g>
      <g className="col"><rect x="14" y="11" width="6" height="19" rx="1" /><rect x="12.5" y="8.6" width="9" height="2.6" rx="1.2" className="cap" /><rect className="win" x="16" y="14" width="2" height="9" rx="1" /></g>
      <g className="col"><rect x="24" y="5" width="6" height="25" rx="1" /><rect x="22.5" y="2.6" width="9" height="2.6" rx="1.2" className="cap" /><rect className="win" x="26" y="8" width="2" height="12" rx="1" /></g>
      <rect className="base" x="1" y="30.4" width="32" height="2.8" rx="1.4" />
    </svg>
  );
}

export function Logo({ href = "/hoy" }: { href?: string }) {
  return (
    <a className="logo" href={href} aria-label="Bufetea, ir a Hoy">
      <LogoSvg />
      <span className="word">Bufete<b>a</b></span>
    </a>
  );
}

export function Candado({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
