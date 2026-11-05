// Función «equipo» de Bufetea: invitar, desactivar y reactivar personas del despacho.
//   POST /equipo/invitar     {email, nombre?, rol}   (solo titular)
//   POST /equipo/desactivar  {usuario}               (solo titular; no a sí mismo)
//   POST /equipo/reactivar   {usuario}               (solo titular)
// Usa la clave de servicio que Supabase inyecta en las Edge Functions; nunca sale de aquí.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const ROLES = ["admin", "abogado", "administrativo"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const partes = new URL(req.url).pathname.split("/").filter(Boolean);
  const ruta = partes[partes.indexOf("equipo") + 1] ?? "";
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Inicia sesión para continuar." }, 401);
    const { data: yo } = await admin.from("perfiles").select("despacho_id, rol, activo").eq("id", u.user.id).maybeSingle();
    if (!yo || !yo.activo) return json({ error: "No perteneces a ningún despacho." }, 403);
    if (yo.rol !== "admin") return json({ error: "Solo la persona titular del despacho puede gestionar el equipo." }, 403);
    const b = await req.json().catch(() => ({}));

    if (ruta === "invitar") {
      const email = String(b.email ?? "").trim().toLowerCase();
      const nombre = String(b.nombre ?? "").trim().slice(0, 120) || null;
      const rol = String(b.rol ?? "abogado");
      if (!EMAIL.test(email)) return json({ error: "Escribe un email válido." }, 400);
      if (!ROLES.includes(rol)) return json({ error: "Rol desconocido." }, 400);
      // Vuelta del enlace del correo: la URL de la app que llama (Supabase solo acepta las de su lista de redirecciones).
      const pedida = typeof b.app === "string" && /^https?:\/\/[^\s/]+$/.test(b.app.replace(/\/$/, "")) ? b.app.replace(/\/$/, "") : "";
      const app = (Deno.env.get("BUFETEA_APP_URL") || pedida || req.headers.get("origin") || "").replace(/\/$/, "");
      const { data: inv, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: app ? `${app}/nueva-contrasena` : undefined,
        data: { nombre },
      });
      if (error || !inv?.user) {
        const ya = /already|registered|exists/i.test(error?.message ?? "");
        return json({ error: ya ? "Esa persona ya tiene cuenta en Bufetea. Escríbenos para unirla a tu despacho." : "No hemos podido enviar la invitación." }, ya ? 409 : 502);
      }
      const { data: otro } = await admin.from("perfiles").select("despacho_id").eq("id", inv.user.id).maybeSingle();
      if (otro && otro.despacho_id !== yo.despacho_id) return json({ error: "Esa persona ya pertenece a otro despacho." }, 409);
      const { error: e2 } = await admin.from("perfiles").upsert({ id: inv.user.id, despacho_id: yo.despacho_id, nombre, rol, email, activo: true });
      if (e2) throw e2;
      return json({ ok: true });
    }

    if (ruta === "desactivar" || ruta === "reactivar") {
      const usuario = String(b.usuario ?? "");
      if (!UUID.test(usuario)) return json({ error: "Usuario no válido." }, 400);
      if (usuario === u.user.id) return json({ error: "No puedes desactivar tu propia cuenta." }, 400);
      const { data: p } = await admin.from("perfiles").select("id").eq("id", usuario).eq("despacho_id", yo.despacho_id).maybeSingle();
      if (!p) return json({ error: "Usuario no encontrado." }, 404);
      const activo = ruta === "reactivar";
      const { error: e1 } = await admin.auth.admin.updateUserById(usuario, { ban_duration: activo ? "none" : "876000h" });
      if (e1) throw e1;
      const { error: e2 } = await admin.from("perfiles").update({ activo }).eq("id", usuario).eq("despacho_id", yo.despacho_id);
      if (e2) throw e2;
      return json({ ok: true });
    }
    return json({ error: "Ruta no encontrada" }, 404);
  } catch (e) {
    console.error("equipo", ruta, e);
    return json({ error: "Error interno. Inténtalo de nuevo en unos minutos." }, 500);
  }
});
