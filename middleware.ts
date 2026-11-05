import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MODO_DEMO, SUPABASE_KEY, SUPABASE_URL } from "@/lib/config";

const PUBLICAS = ["/entrar", "/recuperar", "/nueva-contrasena", "/auth", "/contrato-encargo"];

// Renueva la sesión en cada petición (sesión persistente) y manda a «Entrar» a quien no la tiene.
export async function middleware(req: NextRequest) {
  if (MODO_DEMO) return NextResponse.next();
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  const ruta = req.nextUrl.pathname;
  if (!data.user && !PUBLICAS.some((p) => ruta === p || ruta.startsWith(p + "/"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = ruta && ruta !== "/" ? `?vuelta=${encodeURIComponent(ruta)}` : "";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|svg|ico|webp)$).*)"] };
