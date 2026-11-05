import { execFileSync } from "node:child_process";
import type { Extra, Plan } from "@/lib/precio";

/** Lee docs/comercial.py con Python, igual que el script que carga la base de datos. */
export function leerComercial(): { planes: Plan[]; extras: Extra[] } {
  const py = `
import importlib.util, json
s = importlib.util.spec_from_file_location("c", "docs/comercial.py"); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
C = m.COMERCIAL
print(json.dumps({"planes": [{"id": p["id"], "nombre": p["name"], "precio_mes": p["mes"], "precio_anio": p["anio"], "asuntos_incluidos": p["incl"], "exceso_asunto": p["exceso"], "incluye": p["incluye"]} for p in C["plans"]],
                  "extras": [{"id": e["id"], "nombre": e["name"], "subtitulo": e["sub"], "precio_mes": e["precio"], "desde": e["desde"]} for e in C["extras"]]}))
`;
  return JSON.parse(execFileSync("python3", ["-I", "-B", "-c", py], { encoding: "utf8" }));
}
