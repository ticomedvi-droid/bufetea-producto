import { expect, test, type Page } from "@playwright/test";
import { calcularImporte } from "@/lib/precio";
import { leerComercial } from "../unit/comercial";

const { planes } = leerComercial();
const P = (id: string) => planes.find((p) => p.id === id)!;
const euros = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/^(\d)(\d{3}),/, "$1.$2,") + " €";
const ASUNTOS_DEMO = 142; // asuntos activos del despacho ficticio de la demo

async function vigilarConsola(page: Page) {
  const errores: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  page.on("pageerror", (e) => errores.push(e.message));
  return errores;
}

async function ponerPlan(page: Page, plan: string, facturacion: "mensual" | "anual" = "mensual") {
  await page.context().addCookies([{ name: "bufetea_demo_plan", value: `${plan}:${facturacion}`, url: "http://localhost:3100" }]);
}

test.beforeEach(async ({ page }) => { await page.context().clearCookies(); });

test("entrar con el diseño de producto.html y llegar a Hoy, sin errores de consola (prueba 10)", async ({ page }) => {
  const errores = await vigilarConsola(page);
  await page.goto("/entrar");
  await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
  await expect(page.getByText("Tus clientes, siempre informados.")).toBeVisible();
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoy$/);
  await expect(page.getByText("Novedades por revisar")).toBeVisible();
  await expect(page.getByText("Ejemplo de demostración con datos ficticios.").first()).toBeVisible();
  for (const ruta of ["/plan", "/clientes", "/clientes/c1", "/asuntos", "/asuntos/a1", "/clientes/importar", "/ajustes", "/portal", "/pay", "/voice", "/docs"]) {
    await page.goto(ruta);
    await expect(page.locator("main#contenido")).toBeVisible();
  }
  expect(errores).toEqual([]);
});

test("menú por pilares con el grupo «Amplía» y sin nombres de programas de gestión", async ({ page }) => {
  await page.goto("/hoy");
  const menu = page.getByRole("navigation", { name: "Secciones" });
  for (const g of ["Informa", "Atiende", "Acompaña", "Amplía"]) await expect(menu.getByText(g, { exact: true })).toBeAttached();
  const texto = (await page.locator("body").innerText()).toLowerCase();
  for (const nombre of ["clio", "aranzadi", "infolex", "lexnet manager", "kleos"]) expect(texto).not.toContain(nombre);
});

test("Starter no puede usar Portal ni Pay (prueba 2)", async ({ page }) => {
  await ponerPlan(page, "starter");
  await page.goto("/hoy");
  const menu = page.getByRole("navigation", { name: "Secciones" });
  await expect(menu.locator('a[data-extra="portal"]')).toHaveAttribute("data-bloqueado", "1");
  await expect(menu.locator('a[data-extra="pay"]')).toHaveAttribute("data-bloqueado", "1");
  for (const x of ["portal", "pay"]) {
    await page.goto(`/${x}`);
    await expect(page.locator(`[data-bloqueo="${x}"]`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Solicitar activación" })).toBeVisible();
    await expect(page.locator(`[data-extra-activo="${x}"]`)).toHaveCount(0);
  }
});

test("Professional usa Portal pero no Pay; Business usa los dos (prueba 2)", async ({ page }) => {
  await ponerPlan(page, "professional");
  await page.goto("/portal");
  await expect(page.locator('[data-extra-activo="portal"]')).toBeVisible();
  await expect(page.locator('[data-extra-activo="portal"]').getByText("Incluido en tu plan")).toBeVisible();
  await page.goto("/pay");
  await expect(page.locator('[data-bloqueo="pay"]')).toBeVisible();

  await ponerPlan(page, "business");
  await page.goto("/portal");
  await expect(page.locator('[data-extra-activo="portal"]')).toBeVisible();
  await page.goto("/pay");
  await expect(page.locator('[data-extra-activo="pay"]')).toBeVisible();
});

test("al cambiar de plan, los incluidos se activan y bloquean solos y lo contratado se conserva (prueba 3)", async ({ page }) => {
  await ponerPlan(page, "starter");
  await page.goto("/plan");
  // El equipo de Bufetea activa Docs (en la demo, con el botón de simulación).
  await page.locator('.xcard[data-extra="docs"]').getByRole("button", { name: "Activar en la demo" }).click();
  await expect(page.locator('.xcard[data-extra="docs"]')).toHaveAttribute("data-estado", "contratado");

  await page.locator('[data-plan="business"]').getByRole("button", { name: "Cambiar a Business" }).click();
  await expect(page.locator("[data-plan-actual]")).toHaveAttribute("data-plan-actual", "business");
  await expect(page.locator('.xcard[data-extra="portal"]')).toHaveAttribute("data-estado", "incluido");
  await expect(page.locator('.xcard[data-extra="pay"]')).toHaveAttribute("data-estado", "incluido");
  await expect(page.locator('.xcard[data-extra="docs"]')).toHaveAttribute("data-estado", "contratado");

  await page.locator('[data-plan="starter"]').getByRole("button", { name: "Cambiar a Starter" }).click();
  await expect(page.locator("[data-plan-actual]")).toHaveAttribute("data-plan-actual", "starter");
  await expect(page.locator('.xcard[data-extra="portal"]')).toHaveAttribute("data-estado", "bloqueado");
  await expect(page.locator('.xcard[data-extra="pay"]')).toHaveAttribute("data-estado", "bloqueado");
  await expect(page.locator('.xcard[data-extra="docs"]')).toHaveAttribute("data-estado", "contratado");
});

test("«Solicitar activación» deja la solicitud enviada y no activa el extra", async ({ page }) => {
  await ponerPlan(page, "starter");
  await page.goto("/pay");
  await page.getByRole("button", { name: "Solicitar activación" }).click();
  await expect(page.getByText("Solicitud enviada")).toBeVisible();
  await expect(page.locator('[data-bloqueo="pay"]')).toBeVisible();
});

test("«Tu plan» calcula el total como la calculadora de la web (prueba 4)", async ({ page }) => {
  const casos: [string, "mensual" | "anual"][] = [["starter", "mensual"], ["professional", "mensual"], ["business", "mensual"], ["professional", "anual"]];
  for (const [plan, fact] of casos) {
    await ponerPlan(page, plan, fact);
    await page.goto("/plan");
    const esperado = calcularImporte(P(plan), fact, ASUNTOS_DEMO).total;
    await expect(page.locator('[data-prueba="total"]')).toHaveText(euros(esperado));
    await expect(page.locator('[data-prueba="usados"]')).toHaveText(String(ASUNTOS_DEMO));
  }
  // Starter con 142 asuntos: 49 € + 92 × 0,40 € = 85,80 €
  await ponerPlan(page, "starter");
  await page.goto("/plan");
  await expect(page.locator('[data-prueba="total"]')).toHaveText("85,80 €");
});

test("clientes, asuntos e importación se ven y responden", async ({ page }) => {
  await page.goto("/clientes");
  await expect(page.getByRole("link", { name: "Lucía Martín Sáez" })).toBeVisible();
  await page.getByRole("searchbox").or(page.getByPlaceholder("Buscar por nombre, email, móvil o DNI")).fill("Whitaker");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "James Whitaker" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lucía Martín Sáez" })).toHaveCount(0);
  await page.goto("/asuntos/a1");
  await expect(page.getByText("Historial de comunicaciones")).toBeVisible();
  await page.goto("/clientes/importar");
  await page.locator("#archivo").setInputFiles({
    name: "clientes.csv", mimeType: "text/csv",
    buffer: Buffer.from("Nombre;Email;Móvil;Procedimiento;Juzgado\nAna Prueba;ana@ejemplo.es;+34 600 111 222;77/2026;Juzgado n.º 1\n"),
  });
  await expect(page.getByRole("button", { name: "Importar 1 filas" })).toBeVisible();
  await expect(page.locator("#m-nombre")).toHaveValue("0");
  await expect(page.locator("#m-procedimiento")).toHaveValue("3");
  await expect(page.getByRole("cell", { name: "Ana Prueba" })).toBeVisible();
});

test("ajustes muestran el art. 28 y el dominio como pendiente mientras no lo haya", async ({ page }) => {
  await page.goto("/ajustes");
  await expect(page.getByRole("heading", { name: /Contrato de encargo del tratamiento/ })).toBeVisible();
  await expect(page.getByText("Pendiente de dominio").first()).toBeVisible();
  const html = await page.content();
  expect(html).not.toContain("iurisapp");
});
