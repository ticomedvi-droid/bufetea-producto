// Despliegue de «mensajes»: reenvía a «nucleo» para mantener las direcciones que ya usan el cron y la app anterior
// (/functions/v1/mensajes/aprobar y /functions/v1/mensajes/cron). Todo el código está en ../mensajes/index.ts.
Deno.serve(async (req) => {
  const u = new URL(req.url);
  const destino = `${(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "")}/functions/v1/nucleo${u.pathname.slice(u.pathname.indexOf("/mensajes"))}${u.search}`;
  const cabeceras = new Headers(req.headers);
  cabeceras.delete("host");
  return await fetch(destino, { method: req.method, headers: cabeceras, body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer() });
});
