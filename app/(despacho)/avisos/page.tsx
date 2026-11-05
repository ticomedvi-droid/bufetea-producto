import type { Metadata } from "next";
import { EnPreparacion } from "@/components/BloqueoExtra";

export const metadata: Metadata = { title: "Avisos que salen solos" };

export default function Pagina() {
  return <EnPreparacion titulo="Avisos que salen solos" texto="Aquí elegirás qué avisos salen solos (recordatorios de cita la semana antes y la víspera, preparación del juicio, cierre con reseña) y cuáles te esperan para enviarlos con un toque." />;
}
