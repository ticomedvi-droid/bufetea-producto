import datos from "./comercial-demo.json";
import type { PlanCompleto } from "@/lib/tipos";

// Solo para el modo demostración. Generado desde docs/comercial.py (npm run comercial).
export const COMERCIAL_DEMO = datos as unknown as {
  planes: PlanCompleto[];
  extras: { id: string; nombre: string; subtitulo: string | null; precio_mes: number; desde: boolean; caracteristicas: string[]; nota: string | null }[];
};
