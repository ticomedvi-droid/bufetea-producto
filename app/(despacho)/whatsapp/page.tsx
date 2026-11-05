import type { Metadata } from "next";
import { EnPreparacion } from "@/components/BloqueoExtra";

export const metadata: Metadata = { title: "WhatsApp del despacho" };

export default function Pagina() {
  return <EnPreparacion titulo="WhatsApp del despacho" texto="Aquí estará la bandeja de WhatsApp compartida por el equipo: quién escribe, de qué asunto, y la respuesta que propone la IA para que la envíe una persona." />;
}
