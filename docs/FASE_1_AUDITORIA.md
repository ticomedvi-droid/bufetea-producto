# Fase 1 · Auditoría breve

Fuentes: `web-referencia/` (index, precios, producto, app, páginas de función, v4.css/js), `docs/comercial.py` y el proyecto Supabase «bufetea» (`vblceecvhdhdxqtodvmg`, eu-west-3 París). «Lo que ya existe» = `app.html` + Supabase.

## 1. Pantallas y promesas de la web

| Pantalla o promesa | Estado | Qué hay hoy / qué falta |
|---|---|---|
| Login partido, recuperar contraseña, sesión | Parcial | `app.html` tiene login, alta y recuperación; falta el diseño de `producto.html` |
| Despachos, usuarios y roles | Parcial | `perfiles` con admin/abogado/administrativo; sin invitaciones; RLS solo de lectura |
| Fichas de cliente y de asunto con historial | Parcial | Listas en `app.html`; sin idioma, canal, juzgado, fase ni historial |
| Hoy (indicadores y novedades) | Parcial | `vHoyReal` sin notificaciones reales |
| Notificación interpretada (juzgado, «Resumen para ti», plazo) | Falta | En `app.html` es solo ejemplo; no hay tabla, PDF ni IA |
| Mensaje para el cliente (aprobar, editar, no contárselo) | Parcial | `mensajes` + Edge `mensajes/aprobar`, solo email; sin idioma |
| Reglas: Automático, Con revisión y Límites | Parcial | `envio_auto` solo admite los dos recordatorios |
| Avisos que salen solos / recordatorios | Existe | `proponer_recordatorios` + cron cada 5 min (email) |
| Conversación y bandeja de WhatsApp | Falta | `mensajes.canal` solo admite `email` |
| «¿Cómo va lo mío?» con código | Parcial | Solo por voz (`centralita/verificar`), código de 4 cifras |
| Clientes nuevos | Parcial | Solo llamadas `consulta_nueva`; falta WhatsApp y el aviso |
| En el idioma del cliente | Falta | No hay campo de idioma |
| Preparación del juicio | Parcial | Recordatorio genérico; falta «qué llevar» y «qué va a pasar» |
| Clientes sin noticias | Parcial | Vista `asuntos_noticias` y pantalla; falta mensaje propuesto y aviso interno |
| Mapa del procedimiento | Falta | Solo `asuntos.fase_cliente` en texto |
| Cierre con reseña | Falta | Solo existe el tipo `cierre` |
| Índice y sello (85 %) | Parcial | Se calcula en el navegador; no hay histórico mensual |
| Bufetea Voice | Parcial | Agente ElevenLabs + `centralita` + `llamadas`; falta reconocer por número, grabación, transcripción y minutos |
| Bufetea Portal, Docs y Pay | Falta | Solo maquetas |
| Tu plan, candados y «Solicitar activación» | Falta | La maqueta de `producto.html` está desfasada (ver §5) |
| Planes y extras en BD, asuntos activos, exceso, 80/100 % | Falta | — |
| Modo independiente: buzón LexNET e importación CSV/Excel | Falta | — |
| Modo integrado (solo lectura) | Existe (1 conector) | Función `clio` + sync cada 10 min + webhooks; falta la capa genérica |
| Piloto 30 días, fundador y precio congelado | Parcial | `fundador` y `plazas_fundador` funcionan; falta la fecha de piloto y de congelación |
| Panel interno (demos, A/B, despachos, activaciones) | Parcial | Datos en `solicitudes_demo` y `privado.resumen_ab`; sin pantalla ni estado de la demo |
| RGPD: art. 28, exportación, borrado y registro de accesos | Falta | — |
| IA identificada («redactado con IA, aprobado por…») | Falta | La plantilla de email no lo dice |

## 2. Migraciones (todas aditivas: no se tocan `solicitudes_demo` ni `eventos_web`, y `plazas_fundador` no cambia)

1. **Comercial:** `planes`, `extras` y `plan_extras` cargadas por un script desde `comercial.py`; `despacho_extras` (contratados); `solicitudes_activacion`; función `extra_activo(despacho, extra)` y vista `mis_extras`.
2. **Despachos:** `plan_id`, `facturacion` (mensual/anual), `estado` (piloto/activo/cancelado), `piloto_fin`, `precio_congelado_hasta`, `slug`, `buzon_email`, marca (logo, colores), `resena_google_url`, `art28_aceptado_en`. Se amplía el check de `envio_auto` a los tipos automáticos de §4.3.
3. **Clientes y asuntos:** `id_externo` pasa a admitir nulos (hoy es NOT NULL y bloquea el alta manual y el CSV); `origen` ∈ manual/csv/conector; cliente: `idioma`, `canal`, `dni_hash`; asunto: `procedimiento`, `juzgado`, `abogado_id`, `estado_bufetea` (abierto/cerrado/archivado), `duplicado_de`, `tipo_procedimiento`; tabla `asunto_clientes` (N:M, rellenada desde `cliente_id`).
4. **Notificaciones:** tabla `notificaciones` (PDF, hash, texto, tipo de resolución, resumen, plazo, ¿debe actuar el cliente?, estado, asunto o «sin asignar») y bucket privado `notificaciones/{despacho}/`.
5. **Mensajes:** `canal` email|whatsapp, más `tipo`s, `idioma`, `notificacion_id`, `regla_auto` (trazabilidad del envío automático) y pie de IA.
6. **WhatsApp:** `wa_numeros`, `wa_conversaciones` y `wa_mensajes` (adjuntos, transcripción, propuesta de la IA, quién envía); `verificaciones` (sesión con código por canal y caducidad).
7. **Atención:** `consultas_nuevas`; `plantillas_fases` (mapa por tipo de procedimiento); `llamadas` + duración, grabación y transcripción.
8. **Uso e índice:** `uso_diario` (asuntos activos, por cron diario), vista del máximo mensual, `avisos_uso`, `indice_mensual`, función `estimacion_mes()`.
9. **Extras:** `portal_sesiones`, `docs_solicitudes`/`docs_items`/`firmas`, `pay_cobros`; `privado.facturacion` (ids de Stripe).
10. **Interno y seguridad:** `bufetea_admins`, `registro_accesos`, `solicitudes_demo.estado` (columna nueva rellenada desde `atendida`/`demo_celebrada`), políticas de escritura por rol y RLS activada en las tablas de `privado`.

## 3. Arquitectura

- **Next.js:** `app/(acceso)` (entrar, recuperar); `app/(despacho)` con hoy, notificaciones, avisos, reglas, whatsapp, consultas, sin-noticias, indice, voice, portal, docs, pay, plan, clientes, asuntos, importar y ajustes; `app/(interno)`; `app/portal/[slug]` (cliente final). Además `components/` (tokens de `v4.css`), `lib/` (Supabase, `precio.ts`) y `connectors/` (interfaz de solo lectura; primero el de la función `clio`). Toda la lógica con secretos va en `supabase/functions/` con `_shared/` (`ia.ts` con los límites, `extras.ts`) y las migraciones en `supabase/migrations/`.
- **Planes y bloqueos:** nada se copia al cambiar de plan. Un extra está activo si va incluido en el plan o está contratado: lo decide `extra_activo()`. La usan las políticas RLS de las tablas de cada extra, las Edge Functions (403) y el layout (candado y ficha con «Solicitar activación»). Al cambiar de plan, lo incluido se activa o se bloquea solo y lo contratado se conserva. El cálculo está en `estimacion_mes()` (SQL) y en `precio.ts`, con la fórmula de `v4.js`; se prueba con los cuatro casos de §10.
- **PDFs de LexNET:** cada despacho tiene `<slug>@entrada.bufetea.es`, con correo entrante de Resend que llama a la Edge `buzon`: verifica la firma, saca el adjunto, lo guarda en Storage y elimina duplicados por hash. Luego busca el número de procedimiento y el juzgado para asociarlo a un asunto; si no lo encuentra, queda «sin asignar». Se encola `notificaciones/interpretar`, que lee el PDF con Claude y deja el borrador «Por aprobar». También se podrá arrastrar el PDF en la interfaz.
- **Email:** se amplía la Edge `mensajes` con un emisor por canal.
- **WhatsApp:** Cloud API de Meta, idealmente en coexistencia para conservar el número (lo promete la web). Webhook en la Edge `whatsapp`. Fuera de las 24 horas solo se puede escribir con plantillas aprobadas por idioma.
- **IA:** Claude (Anthropic) solo desde las Edge Functions, sin entrenamiento con los datos.
- **Voz:** el agente de ElevenLabs, un número de teléfono y webhook al terminar la llamada; la transcripción de las notas de voz se hace con ElevenLabs STT.
- **Pay:** Stripe Connect, para que el dinero vaya a la cuenta del despacho.
- **Cobro de Bufetea:** Stripe Billing en modo de pruebas.

## 4. Claves y cuentas (sin valores todavía)

- **Supabase:** clave de servicio para el despliegue; las URL y claves públicas ya existen.
- **Hosting del producto:** Vercel o Netlify.
- **Dominio y DNS** de bufetea: remitente, `entrada.` y portal.
- **Anthropic:** API key, con contrato sin entrenamiento.
- **Resend:** API key (¿la actual?), dominio verificado y secreto del webhook de entrada.
- **Meta:** Business Manager verificado, WABA, App ID y secreto, token de usuario de sistema, `phone_number_id`, token de verificación del webhook y plantillas.
- **ElevenLabs:** API key, secreto del webhook y número de teléfono (Twilio o SIP).
- **Stripe:** claves de prueba, secreto de webhook y Connect.
- **Firma eIDAS:** proveedor por decidir.
- **Programa de gestión:** las credenciales OAuth que ya usa `clio`.

## 5. Contradicciones y riesgos (aviso)

- **«Tu plan» en `producto.html`** dice «Plan base 49 €», «Pedir precio» y «Activar en la demo», y trae Voice activo. Contradice a `precios.html`. Mandan `precios.html` y `comercial.py`, con el botón «Solicitar activación».
- **Nombres del menú:** `producto.html` usa «Extras» y «Tu despacho», y el prompt dice «Amplía». Sigo la pantalla.
- **Resumen:** «Resumen para el abogado» (producto) frente a «Resumen para ti» (index). Uso «Resumen para ti».
- **Portal:** la página del portal dice que el código llega al correo y `producto.html` dice que al móvil. Uso el correo.
- **Nombre del programa en pantalla:** `app.html` muestra «Clio» en la interfaz; se cambia por «tu programa de gestión».
- **Remitente de email:** por defecto es `avisos@iurisapp.es`, de otra marca.
- **Códigos de verificación:** son de 4 cifras y la voz no comprueba el número de quien llama. Propongo 6 cifras más el número (ahora hay 1 cliente, así que el cambio cuesta poco).
- **Aviso de seguridad de Supabase:** marca 7 tablas de `privado` sin RLS. No están expuestas, porque anon y authenticated no tienen USAGE sobre ese esquema, pero se activa igualmente.
