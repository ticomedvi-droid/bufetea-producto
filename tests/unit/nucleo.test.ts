import { describe, expect, it } from "vitest";
import { clasificar, extraerCodigo, textoSeguro, LIMITES_IA } from "../../supabase/functions/_shared/limites.ts";
import { decidir, type Entrada } from "../../supabase/functions/_shared/conversacion.ts";
import { procedimientos, organo, tipoResolucion, plazo, senalamiento, fechaResolucion, extracto } from "../../supabase/functions/_shared/lexnet.ts";
import { finDePlazo, esHabil } from "../../supabase/functions/_shared/plazos.ts";
import { normalizarTelefono, ultimas9 } from "../../supabase/functions/_shared/telefono.ts";
import { textos } from "../../supabase/functions/_shared/textos.ts";

const DECRETO = `JUZGADO DE PRIMERA INSTANCIA Nº 4 DE VALENCIA
Procedimiento: Juicio Ordinario 412/2026
N.I.G.: 46250 42 1 2026 0012345
DECRETO
En Valencia, a 3 de noviembre de 2026.
PARTE DISPOSITIVA: Se admite a trámite la demanda presentada por Dña. Lucía Martín Sáez. Dese traslado a la parte demandada,
emplazándola para que la conteste en el plazo de veinte días hábiles.`;

const CITACION = `JUZGADO DE LO SOCIAL Nº 2 DE VALENCIA. Despido 233/2026. DILIGENCIA DE ORDENACIÓN. Se señala para el acto de conciliación
y, en su caso, juicio el día 14 de enero de 2027, a las 10:20 horas, en la Sala 3.`;

describe("lectura de notificaciones (LexNET)", () => {
  it("encuentra el número de procedimiento, el órgano y el tipo de resolución", () => {
    expect(procedimientos(DECRETO)[0]).toBe("412/2026");
    expect(organo(DECRETO)).toMatch(/JUZGADO DE PRIMERA INSTANCIA Nº 4/);
    expect(tipoResolucion(DECRETO)).toBe("Decreto");
    expect(fechaResolucion(DECRETO)).toBe("2026-11-03");
    expect(extracto(DECRETO)).toMatch(/^PARTE DISPOSITIVA: Se admite a trámite/);
  });
  it("detecta el plazo en días hábiles", () => expect(plazo(DECRETO)).toMatchObject({ dias: 20, habiles: true }));
  it("no confunde la fecha de la resolución con un señalamiento", () => expect(senalamiento(DECRETO)).toBeNull());
  it("detecta el señalamiento con su hora", () => {
    expect(procedimientos(CITACION)[0]).toBe("233/2026");
    expect(senalamiento(CITACION)).toEqual({ fecha: "2027-01-14", hora: "10:20" });
  });
});

describe("cómputo orientativo de plazos", () => {
  it("salta fines de semana y festivos nacionales", () => {
    expect(esHabil(new Date("2026-12-08T00:00:00Z"))).toBe(false);
    expect(esHabil(new Date("2026-12-24T00:00:00Z"))).toBe(false);
    // Notificado el 3/11/2026: 20 días hábiles terminan el 1/12/2026.
    expect(finDePlazo("2026-11-03", 20)).toBe("2026-12-01");
  });
  it("agosto es inhábil (salvo penal)", () => {
    expect(finDePlazo("2026-07-30", 3)).toBe("2026-09-02");
    expect(finDePlazo("2026-07-30", 3, true)).toBe("2026-08-04");
  });
});

describe("teléfonos", () => {
  it("normaliza a formato internacional", () => {
    expect(normalizarTelefono("600 111 222")).toBe("34600111222");
    expect(normalizarTelefono("+40 712 345 678")).toBe("40712345678");
    expect(ultimas9("+34 600-111-222")).toBe("600111222");
  });
});

describe("límites de la IA (prueba 8)", () => {
  it("reconoce peticiones de pronóstico y de asesoramiento", () => {
    for (const t of ["¿Vamos a ganar el juicio?", "¿Qué posibilidades tengo?", "¿Cuánto voy a cobrar?", "Will we win?"]) expect(clasificar(t)).toBe("pronostico");
    for (const t of ["¿Qué me aconseja hacer?", "¿Debo firmar el acuerdo?", "¿Es legal lo que hace mi jefe?", "What should I do?"]) expect(clasificar(t)).toBe("consejo");
  });
  it("reconoce el «¿cómo va lo mío?» y los códigos", () => {
    for (const t of ["Hola, ¿cómo va lo mío?", "¿Hay alguna novedad de mi asunto?", "¿En qué fase está mi demanda?"]) expect(clasificar(t)).toBe("estado");
    expect(clasificar("418302")).toBe("codigo");
    expect(extraerCodigo("mi código es 418 302")).toBe("418302");
  });
  it("el prompt del sistema incluye los límites", () => {
    expect(LIMITES_IA).toMatch(/Nunca das asesoramiento jurídico/);
    expect(LIMITES_IA).toMatch(/Nunca pronosticas/);
    expect(LIMITES_IA).toMatch(/confirmado su código/);
  });
  it("la red de seguridad rechaza textos que aconsejan o pronostican", () => {
    expect(textoSeguro("Le recomiendo que firme el acuerdo.")).toBe(false);
    expect(textoSeguro("Seguro que gana el juicio.")).toBe(false);
    expect(textoSeguro("El juzgado ha admitido su demanda. Usted no tiene que hacer nada.")).toBe(true);
  });
});

const base: Entrada = { texto: "", clienteId: "c1", verificado: false, codigoRecienValidado: false, codigoRecienFallido: false, bloqueado: false, reglas: [], preguntaPendiente: false };

describe("«¿Cómo va lo mío?» por WhatsApp (pruebas 6, 7 y 8)", () => {
  it("sin código verificado no se da información: se pide el código", () => {
    const d = decidir({ ...base, texto: "¿Cómo va lo mío?", reglas: ["respuesta_codigo"] });
    expect(d.accion).toBe("pedir_codigo");
  });
  it("un número desconocido nunca recibe información de un asunto, aunque escriba un código", () => {
    for (const texto of ["¿Cómo va lo mío?", "418302"]) {
      const d = decidir({ ...base, clienteId: null, texto, reglas: ["respuesta_codigo", "consultas_nuevas"] });
      expect(["acuse_consulta", "proponer"]).toContain(d.accion);
    }
  });
  it("con número y código correctos responde con lo aprobado y, si la regla está activa, sale solo con su regla", () => {
    const d = decidir({ ...base, texto: "418302", codigoRecienValidado: true, reglas: ["respuesta_codigo"] });
    expect(d).toMatchObject({ accion: "responder_estado", auto: true, regla: "respuesta_codigo" });
  });
  it("sin la regla activa, la respuesta no sale sola: la envía una persona", () => {
    const d = decidir({ ...base, texto: "¿Cómo va lo mío?", verificado: true, reglas: [] });
    expect(d).toMatchObject({ accion: "responder_estado", auto: false, regla: null });
  });
  it("pronósticos y asesoramiento se derivan al abogado, aunque esté verificado", () => {
    expect(decidir({ ...base, texto: "¿Vamos a ganar?", verificado: true, reglas: ["respuesta_codigo"] }).accion).toBe("derivar_abogado");
    expect(decidir({ ...base, texto: "¿Qué me recomienda hacer?", verificado: true }).accion).toBe("derivar_abogado");
  });
  it("tras demasiados intentos, bloquea", () => expect(decidir({ ...base, texto: "123456", bloqueado: true }).accion).toBe("bloqueado"));
  it("cualquier otra cosa la propone la IA y la envía una persona", () => {
    const d = decidir({ ...base, texto: "Les mando la foto del burofax", verificado: true, reglas: ["respuesta_codigo"] });
    expect(d).toMatchObject({ accion: "proponer", auto: false });
  });
});

describe("textos al cliente", () => {
  it("se identifican como IA y dicen quién aprobó el mensaje", () => {
    expect(textos("es").pieAprobado("Elena Ortega", "Ortega & Ruiz")).toMatch(/ayuda de IA y aprobado por Elena Ortega/);
    expect(textos("en").soyIA("Ortega & Ruiz")).toMatch(/virtual assistant \(AI\)/);
    expect(textos("xx").pedirCodigo).toMatch(/código de 6 cifras/);
  });
});
