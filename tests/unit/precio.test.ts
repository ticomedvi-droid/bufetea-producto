import { describe, expect, it } from "vitest";
import { calcularImporte, eur, type Plan, type Extra } from "@/lib/precio";
import { leerComercial } from "./comercial";

// Los planes se leen de docs/comercial.py (la misma fuente que la base de datos), no se escriben aquí.
const { planes, extras } = leerComercial();
const P = (id: string): Plan => planes.find((p) => p.id === id)!;
const X = (...ids: string[]): Extra[] => extras.filter((e) => ids.includes(e.id));

describe("«Tu plan» = calculadora de la web (sección 10, prueba 4)", () => {
  it("Professional con 180 asuntos: 99,50 €/mes", () => expect(calcularImporte(P("professional"), "mensual", 180).total).toBe(99.5));
  it("Starter con 120 asuntos: 77 €", () => expect(calcularImporte(P("starter"), "mensual", 120).total).toBe(77));
  it("Business con 500 asuntos: 179 €", () => expect(calcularImporte(P("business"), "mensual", 500).total).toBe(179));
  it("Professional anual con 180 asuntos: 84,67 €/mes", () => expect(calcularImporte(P("professional"), "anual", 180).total).toBe(84.67));
  it("dentro de lo incluido no hay exceso", () => expect(calcularImporte(P("professional"), "mensual", 120).adicionales).toBe(0));
  it("los extras incluidos en el plan no se cobran", () => {
    expect(calcularImporte(P("starter"), "mensual", 50, X("portal")).total).toBe(68);
    expect(calcularImporte(P("professional"), "mensual", 150, X("portal", "pay")).total).toBe(108);
    expect(calcularImporte(P("business"), "mensual", 400, X("portal", "pay", "voice")).total).toBe(188);
  });
  it("un precio pactado sustituye al orientativo", () => expect(calcularImporte(P("starter"), "mensual", 10, X("voice"), { voice: 45 }).total).toBe(94));
});

describe("formato de importes como la web", () => {
  it("formatea en español", () => {
    expect(eur(49)).toBe("49 €");
    expect(eur(0.4)).toBe("0,40 €");
    expect(eur(1490)).toBe("1.490 €");
    expect(eur(99.5)).toBe("99,50 €");
    expect(eur(84.67)).toBe("84,67 €");
    expect(eur(2850)).toBe("2.850 €");
  });
});
