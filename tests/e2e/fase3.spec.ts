import { expect, test } from "@playwright/test";

const URL_BASE = "http://localhost:3100";
test.beforeEach(async ({ page }) => { await page.context().clearCookies(); });

test("menú: extras con el nombre de precios y su descripción debajo", async ({ page }) => {
  await page.goto("/hoy");
  const menu = page.getByRole("navigation", { name: "Secciones" });
  for (const [n, d] of [["Bufetea Voice", "Centralita con IA"], ["Bufetea Portal", "Portal del cliente"], ["Bufetea Docs", "Documentos y firma"], ["Bufetea Pay", "Cobro de provisiones"]]) {
    const enlace = menu.getByRole("link", { name: new RegExp(n) });
    await expect(enlace).toContainText(n);
    await expect(enlace).toContainText(d);
  }
});

test("Hoy: «Asuntos activos» y cabecera limpia, sin desenfoque", async ({ page }) => {
  await page.goto("/hoy");
  await expect(page.getByText("Asuntos activos", { exact: true })).toBeVisible();
  await expect(page.getByText("Asuntos en curso")).toHaveCount(0);
  for (const ruta of ["/plan", "/notificaciones", "/whatsapp"]) {
    await page.goto(ruta);
    const estilo = await page.locator("header.bar").evaluate((e) => { const s = getComputedStyle(e); return { fondo: s.backgroundColor, filtro: s.backdropFilter }; });
    expect(estilo.fondo).toBe("rgb(255, 255, 255)");
    expect(["none", ""]).toContain(estilo.filtro);
  }
});

test("notificación explicada: lo que dice el juzgado, resumen, plazo y mensaje con sus tres botones (pantallas 2 y 3)", async ({ page }) => {
  await page.goto("/notificaciones");
  await expect(page.getByText("Lo que dice el juzgado")).toBeVisible();
  await expect(page.getByText("Resumen para ti")).toBeVisible();
  await expect(page.locator("[data-plazo]")).toContainText("se valida en tu programa");
  await expect(page.getByRole("button", { name: "Aprobar y enviar por WhatsApp" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "No contárselo" })).toBeVisible();
  // El borrador no se puede tocar hasta pulsar «Editar».
  await expect(page.locator("#msg")).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Editar" }).click();
  await expect(page.locator("#msg")).not.toHaveAttribute("readonly", "");
  // Asunto que no se informa (penal): no hay mensaje para el cliente.
  await page.getByRole("option", { name: /Tomás Alcaraz/ }).click();
  await expect(page.getByText(/marcado para no informar/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Aprobar y enviar/ })).toHaveCount(0);
});

test("aprobar una notificación la saca de pendientes", async ({ page }) => {
  await page.goto("/notificaciones");
  await expect(page.getByRole("option")).toHaveCount(4);
  await page.getByRole("button", { name: "Aprobar y enviar por WhatsApp" }).click();
  await expect(page.getByRole("status")).toContainText("Mensaje aprobado");
  await page.goto("/notificaciones");
  await expect(page.getByRole("option")).toHaveCount(3);
});

test("reglas: Automático, Con revisión y Límites; los límites no se pueden activar (pantalla 4)", async ({ page }) => {
  await page.goto("/avisos");
  await expect(page.getByText("A · Automático", { exact: false })).toBeVisible();
  await expect(page.getByText("B · Con revisión", { exact: false })).toBeVisible();
  await expect(page.getByText("C · Límites", { exact: false })).toBeVisible();
  await expect(page.locator("[data-limite]")).toHaveCount(4);
  await expect(page.locator("[data-limite] input")).toHaveCount(0);
  const consultas = page.locator('[data-regla="consultas_nuevas"]');
  await expect(consultas).not.toBeChecked();
  await consultas.check();
  await expect(page.getByRole("status")).toContainText("Reglas guardadas");
  await page.reload();
  await expect(page.locator('[data-regla="consultas_nuevas"]')).toBeChecked();
});

test("WhatsApp: bandeja, hilo, respuesta propuesta por la IA y verificación (pantallas 5 y 6)", async ({ page }) => {
  await page.goto("/whatsapp");
  await expect(page.locator('[data-modo-whatsapp="pruebas"]')).toBeVisible();
  await expect(page.getByText("Respuesta propuesta por la IA · revísala antes de enviar")).toBeVisible();
  await expect(page.locator("#wa-msg")).toHaveValue(/Recibido el burofax/);
  await expect(page.getByText(/Nota de voz · «Dicen que no van a pagar/)).toBeVisible();
  await page.getByRole("option", { name: /Rosa Jiménez/ }).click();
  await expect(page.getByText("Código verificado")).toBeVisible();
  await expect(page.getByText(/respondido solo por Bufetea/).first()).toBeVisible();
  await page.getByRole("option", { name: /600 999 902/ }).click();
  await expect(page.getByText("Número desconocido · consulta nueva")).toBeVisible();
});

test("clientes sin noticias e índice con sello (pantallas 7 y 8)", async ({ page }) => {
  await page.goto("/sin-noticias");
  await expect(page.getByText("41 d")).toBeVisible();
  await expect(page.getByRole("button", { name: "Contarle algo" }).first()).toBeVisible();
  await page.goto("/indice");
  await expect(page.locator("[data-indice] .big")).toHaveText("92 %");
  await expect(page.locator('[data-sello="si"]')).toContainText("Despacho que informa");
});

test("modo integrado: sincronizado, datos del programa en solo lectura y alta manual secundaria", async ({ page }) => {
  await page.goto("/clientes");
  await expect(page.locator('[data-modo="independiente"]')).toBeVisible();
  await expect(page.getByRole("link", { name: "Importar CSV o Excel" })).toBeVisible();
  await expect(page.getByText("¿Tu programa de gestión se puede conectar?")).toBeVisible();
  await page.context().addCookies([{ name: "bufetea_demo_integrado", value: "1", url: URL_BASE }]);
  await page.goto("/clientes");
  await expect(page.locator('[data-modo="integrado"]')).toContainText(/Sincronizado con tu programa de gestión · última actualización hace \d+ min/);
  await expect(page.getByRole("link", { name: "Añadir un cliente que no está en tu programa" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Importar CSV o Excel" })).toHaveCount(0);
  await page.goto("/asuntos");
  await expect(page.getByRole("link", { name: "Añadir un asunto que no está en tu programa" })).toBeVisible();
});

test("bienvenida animada solo al iniciar sesión, y se salta con una tecla", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("[data-bienvenida]")).toBeVisible();
  await expect(page).toHaveURL(/\/hoy$/);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-bienvenida]")).toHaveCount(0, { timeout: 2000 });
  // Navegar después no la repite.
  await page.goto("/plan");
  await page.goto("/hoy");
  await expect(page.locator("[data-bienvenida]")).toHaveCount(0);
});

test("la bienvenida termina sola en unos 2 segundos", async ({ page }) => {
  await page.goto("/hoy?bienvenida=1");
  await expect(page.locator("[data-bienvenida]")).toBeVisible();
  await expect(page.locator("[data-bienvenida]")).toHaveCount(0, { timeout: 3000 });
});

test("con «reducir movimiento», solo un fundido corto", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${URL_BASE}/hoy?bienvenida=1`);
  await expect(page.locator(".bienvenida.quieta")).toBeVisible();
  await expect(page.locator("[data-bienvenida]")).toHaveCount(0, { timeout: 2000 });
  await ctx.close();
});
