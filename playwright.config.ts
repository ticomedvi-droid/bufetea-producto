import { defineConfig, devices } from "@playwright/test";

// Pruebas de interfaz sobre el modo demostración (datos ficticios, sin Supabase).
// La parte de servidor (RLS, bloqueo de extras, importes) se prueba contra la base de datos real con `npm run test:bd`.
const PUERTO = 3100;
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: "retain-on-failure",
    // Si el navegador está instalado en otra ruta (p. ej. un Chromium del sistema), indícala en PW_CHROMIUM.
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 900 } } },
    { name: "movil", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${PUERTO}`,
    port: PUERTO,
    timeout: 300_000,
    reuseExistingServer: true,
    env: { NEXT_PUBLIC_BUFETEA_DEMO: "1", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
