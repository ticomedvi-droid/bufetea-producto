"use client";
import { useEffect, useState } from "react";
import { MODO_DEMO } from "@/lib/config";
import { supabaseNavegador } from "@/lib/supabase/navegador";

// Sirve para el enlace de recuperación y para el de invitación al equipo.
export function NuevaContrasena() {
  const [listo, setListo] = useState(MODO_DEMO);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (MODO_DEMO) return;
    const sb = supabaseNavegador();
    (async () => {
      // Los enlaces de invitación llegan con la sesión en el fragmento (#access_token=…).
      const h = new URLSearchParams(window.location.hash.slice(1));
      const at = h.get("access_token"), rt = h.get("refresh_token");
      if (at && rt) {
        await sb.auth.setSession({ access_token: at, refresh_token: rt });
        history.replaceState(null, "", window.location.pathname);
      }
      const { data } = await sb.auth.getUser();
      if (data.user) setListo(true);
      else setMsg({ ok: false, t: "El enlace ha caducado o ya se ha usado. Pide otro desde «¿La has olvidado?»." });
    })();
  }, []);

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const a = String(f.get("clave") ?? ""), b = String(f.get("repite") ?? "");
    if (a.length < 10) return setMsg({ ok: false, t: "Usa al menos 10 caracteres." });
    if (a !== b) return setMsg({ ok: false, t: "Las dos contraseñas no coinciden." });
    if (MODO_DEMO) return setMsg({ ok: true, t: "En la demo no se cambia nada." });
    setEnviando(true);
    const { error } = await supabaseNavegador().auth.updateUser({ password: a });
    setEnviando(false);
    if (error) return setMsg({ ok: false, t: "No hemos podido guardarla. Prueba con otra contraseña." });
    window.location.assign("/hoy");
  }

  return (
    <form className="card" onSubmit={guardar}>
      <div><h1>Elige tu contraseña</h1><p className="mute" style={{ marginTop: 6 }}>Al menos 10 caracteres. Mejor una frase que solo tú recuerdes.</p></div>
      <div className="fld"><label htmlFor="n1">Contraseña nueva</label><input id="n1" name="clave" type="password" autoComplete="new-password" required minLength={10} disabled={!listo} /></div>
      <div className="fld"><label htmlFor="n2">Repítela</label><input id="n2" name="repite" type="password" autoComplete="new-password" required minLength={10} disabled={!listo} /></div>
      <button className="btn primary" type="submit" disabled={!listo || enviando}>{enviando ? "Guardando…" : "Guardar y entrar"}</button>
      {msg && <p role="status" className={`aviso ${msg.ok ? "ok" : "err"}`}>{msg.t}</p>}
    </form>
  );
}
