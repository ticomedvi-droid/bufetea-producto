import "server-only";
import { MODO_DEMO } from "@/lib/config";
import * as demo from "./demo";
import * as real from "./supabase";

// Un único punto de acceso a los datos: Supabase (con RLS) o, en modo demostración, datos ficticios.
const fuente = MODO_DEMO ? demo : real;

export const sesion = fuente.sesion as () => Promise<Awaited<ReturnType<typeof real.sesion>>>;
export const planes = fuente.planes;
export const misExtras = fuente.misExtras;
export const estimacion = fuente.estimacion;
export const avisosUso = fuente.avisosUso;
export const clientes = fuente.clientes as typeof real.clientes;
export const cliente = fuente.cliente;
export const asuntos = fuente.asuntos as typeof real.asuntos;
export const asunto = fuente.asunto;
export const equipo = fuente.equipo;
export const llamadas = fuente.llamadas;
export const hoy = fuente.hoy;
export const integracion = fuente.integracion;
export const indice = fuente.indice;
export const indicadores = fuente.indicadores;
export const historicoIndice = fuente.historicoIndice;
export const notificaciones = fuente.notificaciones;
export const reglas = fuente.reglas;
export const avisos = fuente.avisos;
export const conversaciones = fuente.conversaciones;
export const mensajesWA = fuente.mensajesWA;
export const numeroWhatsApp = fuente.numeroWhatsApp;
export const sinNoticias = fuente.sinNoticias;
