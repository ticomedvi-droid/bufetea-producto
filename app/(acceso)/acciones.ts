"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APP_URL, MODO_DEMO, VERSION_ART28 } from "@/lib/config";
import { supabaseServidor } from "@/lib/supabase/server";
import type { Resultado } from "@/components/Envio";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const rutaSegura = (v: unknown) => {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/hoy";
};

async function origen() {
  if (APP_URL) return APP_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

export async function entrar(_: Resultado, f: FormData): Promise<Resultado> {
  const vuelta = rutaSegura(f.get("vuelta"));
  if (MODO_DEMO) return { ok: true, mensaje: "Hola, Elena.", ir: vuelta };
  const email = String(f.get("email") ?? "").trim();
  const clave = String(f.get("clave") ?? "");
  if (!EMAIL.test(email)) return { ok: false, mensaje: "Revisa el correo electrónico." };
  if (!clave) return { ok: false, mensaje: "Escribe tu contraseña." };
  const sb = await supabaseServidor();
  const { error } = await sb.auth.signInWithPassword({ email, password: clave });
  if (error) {
    return { ok: false, mensaje: /confirm/i.test(error.message) ? "Confirma primero tu correo con el enlace que te enviamos." : "El correo o la contraseña no son correctos." };
  }
  return { ok: true, mensaje: "Hola de nuevo.", ir: vuelta };
}

export async function recuperar(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return { ok: true, mensaje: "En tu despacho te llegaría un enlace al correo para elegir una contraseña nueva. En la demo no hace falta." };
  const email = String(f.get("email") ?? "").trim();
  if (!EMAIL.test(email)) return { ok: false, mensaje: "Revisa el correo electrónico." };
  const sb = await supabaseServidor();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${await origen()}/auth/confirm?next=/nueva-contrasena` });
  // Siempre el mismo mensaje, exista o no la cuenta, para no revelar quién usa Bufetea.
  return { ok: true, mensaje: "Si ese correo tiene cuenta, te hemos enviado un enlace para elegir una contraseña nueva." };
}

export async function salir() {
  if (!MODO_DEMO) {
    const sb = await supabaseServidor();
    await sb.auth.signOut();
  }
  redirect("/entrar");
}

export async function altaDespacho(_: Resultado, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return { ok: true, mensaje: "Despacho creado.", ir: "/hoy" };
  const nombre = String(f.get("nombre") ?? "").trim();
  const yo = String(f.get("mi_nombre") ?? "").trim();
  if (nombre.length < 2) return { ok: false, mensaje: "Escribe el nombre del despacho." };
  if (f.get("art28") !== "on") return { ok: false, mensaje: "Para continuar, acepta el contrato de encargo del tratamiento." };
  const sb = await supabaseServidor();
  const { error } = await sb.rpc("alta_despacho", { p_nombre: nombre, p_mi_nombre: yo || null, p_acepta_art28: true, p_version: VERSION_ART28 });
  if (error) return { ok: false, mensaje: error.message };
  return { ok: true, mensaje: "Despacho creado.", ir: "/hoy" };
}
