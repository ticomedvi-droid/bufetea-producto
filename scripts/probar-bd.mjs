// Lanza las pruebas de base de datos de supabase/tests contra el proyecto indicado en SUPABASE_DB_URL.
// Cada prueba es un bloque que termina con una excepción: si el mensaje empieza por PRUEBAS_OK ha pasado,
// y en cualquier caso la transacción se deshace, así que no deja datos.
//   SUPABASE_DB_URL=postgresql://... npm run test:bd
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Falta SUPABASE_DB_URL (cadena de conexión de la base de datos, en Supabase › Project Settings › Database).");
  process.exit(2);
}
const dir = new URL("../supabase/tests/", import.meta.url).pathname;
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
let fallos = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
  try {
    await client.query(readFileSync(join(dir, f), "utf8"));
    console.log(`✗ ${f}: terminó sin el aviso PRUEBAS_OK`);
    fallos++;
  } catch (e) {
    const msg = String(e.message);
    if (msg.startsWith("PRUEBAS_OK")) console.log(`✓ ${f}: ${msg.replace("PRUEBAS_OK: ", "")}`);
    else { console.log(`✗ ${f}: ${msg}`); fallos++; }
  }
}
await client.end();
process.exit(fallos ? 1 : 0);
