import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServidor } from "@/lib/supabase/server";

// Vuelta de los enlaces de correo de Supabase (recuperación de contraseña, confirmación, invitación).
export async function GET(req: NextRequest) {
  const u = req.nextUrl;
  const sig = u.searchParams.get("next") ?? "/hoy";
  const destino = sig.startsWith("/") && !sig.startsWith("//") ? sig : "/hoy";
  const sb = await supabaseServidor();
  const code = u.searchParams.get("code");
  const tokenHash = u.searchParams.get("token_hash");
  const tipo = u.searchParams.get("type") as EmailOtpType | null;
  let ok = false;
  if (code) ok = !(await sb.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && tipo) ok = !(await sb.auth.verifyOtp({ token_hash: tokenHash, type: tipo })).error;
  const url = u.clone();
  url.search = "";
  url.pathname = ok ? destino : "/nueva-contrasena";
  return NextResponse.redirect(url);
}
