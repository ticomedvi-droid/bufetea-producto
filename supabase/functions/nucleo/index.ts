// Función «nucleo»: reúne en un solo despliegue las rutas de la Fase 3 (comparten mucho código).
//   /nucleo/notificaciones/*  ·  /nucleo/buzon  ·  /nucleo/mensajes/*  ·  /nucleo/whatsapp[/*]
// Cada parte vive en su carpeta y también puede desplegarse sola.
import { CORS, json } from "../_shared/bd.ts";
import { manejar as buzon } from "../buzon/index.ts";
import { manejar as mensajes } from "../mensajes/index.ts";
import { manejar as notificaciones } from "../notificaciones/index.ts";
import { manejar as whatsapp } from "../whatsapp/index.ts";

const RUTAS: Record<string, (req: Request) => Promise<Response>> = { notificaciones, buzon, mensajes, whatsapp };

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const partes = new URL(req.url).pathname.split("/").filter(Boolean);
  const parte = partes[partes.indexOf("nucleo") + 1] ?? "";
  const m = RUTAS[parte];
  return m ? m(req) : Promise.resolve(json({ error: "Ruta no encontrada" }, 404));
});
