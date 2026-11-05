import type { Metadata } from "next";
import { EnPreparacion } from "@/components/BloqueoExtra";

export const metadata: Metadata = { title: "Notificaciones explicadas" };

export default function Pagina() {
  return <EnPreparacion titulo="Notificaciones explicadas" texto="Aquí llegarán las notificaciones que reenvíes desde LexNET: lo que dice el juzgado, el resumen para ti, el plazo detectado y el mensaje para tu cliente, listo para aprobar y enviar." />;
}
