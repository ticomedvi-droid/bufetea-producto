# Fase 2 · Base del producto

## Qué hay

- **Proyecto Next.js 15 (App Router) + TypeScript + Tailwind 4**, con los estilos de `producto.html` copiados en `app/bufetea.css` y la tipografía Geist servida desde el propio producto.
- **Acceso** (`/entrar`, `/recuperar`, `/nueva-contrasena`, `/auth/confirm`): panel partido como en `producto.html`, sesión persistente renovada por el middleware y recuperación de contraseña por correo. La misma pantalla de nueva contraseña sirve para las invitaciones.
- **Alta del despacho** (`/alta`): exige aceptar el contrato de encargo del art. 28 (`/contrato-encargo`, versión v1, **borrador pendiente de revisión legal**). Los despachos que ya existían ven un aviso hasta que la persona titular lo acepta en Ajustes.
- **Menú por pilares**, como `producto.html`: Hoy · Informa · Atiende · Acompaña · **Amplía** (extras con candado) · Tu despacho (Clientes, Asuntos, Tu plan, Ajustes).
- **Hoy**: saludo, indicadores (novedades por revisar, asuntos en curso, % de clientes informados), lista de novedades con su estado, uso del plan y avisos del 80 % y el 100 % para la persona titular.
- **Clientes y asuntos**: listas con búsqueda, fichas editables, alta manual, varios clientes por asunto, estado abierto/cerrado/archivado, duplicados e historial completo de comunicaciones. Lo que viene del programa de gestión se marca como tal y nunca se escribe en él.
- **Importación CSV / Excel** (`/clientes/importar`): reconoce las columnas solo y se pueden corregir a mano. Muestra una vista previa, no duplica clientes ni asuntos e informa de los errores fila a fila. Incluye una plantilla descargable.
- **Planes y extras con bloqueo**:
  - Tablas `planes`, `extras` y `plan_extras`, cargadas desde `docs/comercial.py` (`npm run comercial`).
  - `extra_activo()` es la fuente única: un extra está activo si va incluido en el plan o si está contratado.
  - En el servidor, las páginas de extras no cargan nada si el extra no está activo, y `exigir_extra()` queda lista para las funciones del servidor de la Fase 5.
  - Si no está activo, se ve la ficha con candado, el precio orientativo y «Solicitar activación», que crea una solicitud para el equipo de Bufetea.
- **Tu plan**:
  - Plan y forma de pago; fundador («Precio congelado hasta…») y piloto («En piloto hasta…»).
  - Asuntos activos usados (máximo del mes) frente a los incluidos, con los adicionales y su importe.
  - Funciones incluidas y servicios (soporte prioritario y acompañamiento).
  - Extras marcados como «Incluido en tu plan», «Contratado» o «Bloqueado».
  - Total estimado del mes con la fórmula de la calculadora de la web y cambio de plan (solo la persona titular).
- **Ajustes**: identificador del despacho; buzón de LexNET, remitente y portal, que dependen del dominio y salen como «pendiente de dominio» mientras no haya; firma y email de respuesta; contrato del art. 28; equipo (invitar, cambiar rol, desactivar y reactivar; usuarios ilimitados).
- **Modo demostración** (`NEXT_PUBLIC_BUFETEA_DEMO=1`): los datos ficticios de la web, con la etiqueta «Ejemplo de demostración con datos ficticios». No usa Supabase.

## Migraciones aplicadas en «bufetea» (todas solo añaden)

| Archivo | Contenido |
|---|---|
| `20261105120000_fase2_01_comercial` | `planes`, `extras`, `plan_extras`, `comercial_config` (lectura pública) |
| `20261105120100_fase2_01b_comercial_datos` | Carga desde `docs/comercial.py` |
| `20261105120200_fase2_02_despachos` | Plan, facturación, estado, piloto, precio congelado, identificador, marca y art. 28 en `despachos`; email y estado activo en `perfiles`; `bufetea_admins`, `despacho_extras`, `solicitudes_activacion`, `cambios_plan`; funciones `extra_activo`, `exigir_extra`, `mis_extras`, `alta_despacho`, `aceptar_art28`, `cambiar_plan`, `solicitar_activacion`, `cambiar_rol` |
| `20261105120300_fase2_03_clientes_asuntos` | Cliente: idioma, canal, DNI y notas. Asunto: procedimiento, juzgado, tipo, abogado responsable, situación, duplicado y notas. Tabla `asunto_clientes`; escritura con RLS por despacho; campos protegidos; alta manual sin `id_externo` (identificador interno negativo); `importar_filas()` |
| `20261105120400_fase2_04_uso_y_estimacion` | `asuntos_activos_de`, `uso_diario`, `avisos_uso`, `registrar_uso()` (pg_cron a diario), `calcular_importe()`, `estimacion_mes()`, `mi_estimacion()` |

Lo que usa la web sigue igual: `solicitudes_demo`, `eventos_web` y `plazas_fundador`; la prueba 04 lo comprueba. El despacho de prueba «Medina Abogados» queda en Starter y en piloto.

Función del servidor nueva: **`equipo`** (invitar, desactivar y reactivar usuarios). Usa la clave de servicio que Supabase pone sola.

## Pruebas

| Prueba (sección 10) | Dónde | Resultado |
|---|---|---|
| 1 · RLS con dos despachos | `supabase/tests/01_rls_dos_despachos.sql` (base de datos real, se deshace al terminar) | ✓ |
| 2 · Starter / Professional / Business con Portal y Pay | `supabase/tests/02_extras_por_plan.sql` (servidor) + `tests/e2e` (interfaz) | ✓ |
| 3 · Cambio de plan: incluidos se activan y bloquean, lo contratado se conserva | `02_extras_por_plan.sql` + `tests/e2e` | ✓ |
| 4 · Importes: 99,50 €, 77 €, 179 € y 84,67 € | `supabase/tests/03_importes_tu_plan.sql` (SQL) + `tests/unit/precio.test.ts` (TS) + `tests/e2e` (pantalla) | ✓ |
| 9 · Formulario de demo, A/B y contador de fundadores | `supabase/tests/04_web_sigue_funcionando.sql` | ✓ |
| 10 · Escritorio y móvil sin errores de consola | `tests/e2e` (proyectos «escritorio» y «movil») | ✓ |

Órdenes: `npm test` (unitarias), `npm run test:e2e` (interfaz; si el navegador está en otra ruta, `PW_CHROMIUM=/ruta/a/chrome`) y `SUPABASE_DB_URL=… npm run test:bd` (base de datos).

## Pendiente de tu confirmación (no aplicado)

1. **Códigos de verificación de 6 cifras:** hay que sustituir la función `asignar_codigo_cliente()` y regenerar el código del único cliente actual. La comprobación del número de quien llama irá con Voice (Fase 5), junto con el ajuste del agente.
2. **RLS en las 7 tablas de `privado`:** no están expuestas, pero conviene activarla.

## En preparación (fases siguientes)

Notificaciones, avisos, WhatsApp, clientes nuevos, clientes sin noticias e índice (Fase 3–4). El contenido real de Portal, Docs y Pay llega en la Fase 5; ahora ya se aplican sus bloqueos. Panel interno y Stripe, en la Fase 6. Por ahora esas pantallas lo dicen con una etiqueta «En preparación».
