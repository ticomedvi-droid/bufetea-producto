// Qué hace Bufetea cuando escribe alguien por WhatsApp. Pura lógica, sin red ni base de datos, para poder probarla.
import { clasificar, type Intencion } from "./limites.ts";

export type Entrada = {
  texto: string;
  clienteId: string | null;      // cliente identificado por el número de teléfono
  verificado: boolean;            // número + código confirmados en los últimos 30 minutos
  codigoRecienValidado: boolean;  // este mensaje traía un código correcto
  codigoRecienFallido: boolean;   // este mensaje traía un código incorrecto
  bloqueado: boolean;             // demasiados intentos fallidos
  reglas: string[];               // despachos.envio_auto
  preguntaPendiente: boolean;     // antes preguntó «¿cómo va lo mío?» y se le pidió el código
};

export type Decision =
  | { accion: "pedir_codigo" | "codigo_mal" | "bloqueado" | "responder_estado" | "derivar_abogado" | "acuse_consulta"; auto: boolean; regla: string | null; intencion: Intencion }
  | { accion: "proponer"; auto: false; regla: null; intencion: Intencion };

export function decidir(e: Entrada): Decision {
  const intencion = clasificar(e.texto);
  const reglaRespuesta = e.reglas.includes("respuesta_codigo");
  const auto = (accion: Exclude<Decision["accion"], "proponer">, regla: string): Decision =>
    ({ accion, auto: e.reglas.includes(regla), regla: e.reglas.includes(regla) ? regla : null, intencion });

  // Número desconocido: nunca se da información de ningún asunto. Se recoge como consulta nueva.
  if (!e.clienteId) {
    if (intencion === "codigo") return auto("acuse_consulta", "consultas_nuevas");
    return e.reglas.includes("consultas_nuevas") ? auto("acuse_consulta", "consultas_nuevas") : { accion: "proponer", auto: false, regla: null, intencion };
  }
  if (e.bloqueado) return auto("bloqueado", "respuesta_codigo");
  // Asesoramiento o pronósticos: lo contesta siempre el abogado.
  if (intencion === "consejo" || intencion === "pronostico") return auto("derivar_abogado", "respuesta_codigo");
  if (e.codigoRecienFallido) return auto("codigo_mal", "respuesta_codigo");
  if (e.codigoRecienValidado) return auto("responder_estado", "respuesta_codigo");
  if (intencion === "estado") return e.verificado ? auto("responder_estado", "respuesta_codigo") : auto("pedir_codigo", "respuesta_codigo");
  if (intencion === "codigo" && !e.verificado) return auto("pedir_codigo", "respuesta_codigo");
  void reglaRespuesta;
  // Todo lo demás: la IA propone una respuesta y la envía una persona.
  return { accion: "proponer", auto: false, regla: null, intencion };
}
