# Fase 3 · Núcleo

## Correcciones de la revisión de la Fase 2

- **Códigos de verificación de 6 cifras**, generados con aleatoriedad criptográfica. Se han regenerado los de los clientes existentes y la ficha del cliente tiene «Generar otro».
- **RLS activada** en las 7 tablas de `privado`.
- **Menú:** «Bufetea Voice / Portal / Docs / Pay», con su descripción debajo.
- **Hoy:** «Asuntos activos». El porcentaje de clientes informados muestra «—» y «Sin datos todavía» si hay menos de 5 asuntos que se informan o ningún mensaje enviado.
- **Cabecera limpia** en todas las pantallas: blanca, sin transparencia ni desenfoque.
- **Prueba de edición:** editar y guardar un asunto y un cliente, tanto creados a mano como venidos del programa de gestión (`supabase/tests/08_editar_y_aislar.sql`).
- **Modo integrado:**
  - Con el programa de gestión conectado, se ve «Sincronizado con tu programa de gestión · última actualización hace X min».
  - Los datos que vienen del programa son de solo lectura. Lo protege también la base de datos: no basta con ocultar los campos.
  - El alta manual queda como opción secundaria («Añadir un cliente que no está en tu programa»).
  - Sin conexión, la importación CSV/Excel y el alta manual son el camino principal, con un formulario para pedir que comprobemos si su programa se puede conectar (tabla `solicitudes_conexion`).
- **Bienvenida animada al iniciar sesión** (solo entonces):
  - Las columnas suben en cascada, se encienden las ventanas, salta la «a» y el logo vuela a su sitio en el menú mientras aparece Hoy. Dura unos 1,8 s.
  - Se inclina hacia el cursor y se salta con un clic o una tecla.
  - Con «reducir movimiento», queda en un fundido.
  - Usa el mismo SVG y los colores de la web, sin librerías.

## Fase 3

| Función | Qué hay |
|---|---|
| Recepción de PDF de LexNET | Subida desde «Notificaciones explicadas» y buzón por correo `<identificador>@entrada.<dominio>` (Resend, ruta `nucleo/buzon`). Sin duplicados (por huella del archivo). Se asocia al asunto por el número de procedimiento o queda «Sin asignar» para que el despacho lo asigne. |
| Notificaciones explicadas | La IA (Claude, desde el servidor) saca el tipo de resolución, «Lo que dice el juzgado», el «Resumen para ti», el plazo y el señalamiento. El plazo se calcula en días hábiles (sin agosto, fines de semana ni festivos nacionales) y se marca «se valida en tu programa». Sin IA configurada, hay una lectura automática prudente marcada «sin IA». |
| Mensaje para el cliente | Queda siempre «Por aprobar», en el idioma de la ficha (con la versión en español al lado), con «Aprobar y enviar», «Editar» y «No contárselo». Al aprobar, el señalamiento pasa a la agenda del asunto y salen los recordatorios. |
| Reglas | Automático (recordatorios, «¿cómo va lo mío?», consultas nuevas, avisos internos), Con revisión (con el cierre activable) y Límites, bloqueados y sin interruptor. |
| Límites en la base de datos | El disparador `mensajes_control` impide que algo salga sin aprobación de un abogado o sin una regla automática activa. Las explicaciones de notificaciones nunca salen solas. La administración no aprueba lo jurídico. Queda quién aprobó, o «automático» con su regla, y cuándo. |
| Email | Con Resend. El remitente es `avisos@<dominio>`; mientras no haya dominio, `BUFETEA_FROM` o el remitente de pruebas de Resend. Pie: «Mensaje redactado con ayuda de IA y aprobado por…». |
| WhatsApp (modo de pruebas de Meta) | Webhook `nucleo/whatsapp` con firma verificada. Bandeja compartida: identifica al cliente por su número, enlaza la conversación con sus asuntos, guarda los adjuntos y transcribe las notas de voz (ElevenLabs, opcional). La IA propone la respuesta y la envía una persona. Fuera de las 24 horas usa la plantilla aprobada. |
| «¿Cómo va lo mío?» con código | Solo con **número de la ficha + código de 6 cifras**: 3 fallos por número y hora, o 20 por despacho en 10 minutos, bloquean. Se cuenta solo la última novedad aprobada y enviada. Pronósticos y consejo: «Esa pregunta se la tiene que contestar su abogado». Sale solo si la regla está activa; si no, queda propuesto para una persona. |
| Idioma | Textos fijos en español, inglés, francés, rumano, árabe y chino. Los mensajes, con la IA. |
| Hoy | Notificaciones pendientes, clientes sin noticias, asuntos activos e índice. |
| Clientes sin noticias | Asuntos abiertos que se informan con más de 30 días sin noticias. «Contarle algo» prepara un mensaje (sin inventar novedades) que se aprueba en Avisos. |
| Índice y sello | Porcentaje de clientes con noticias en los últimos 30 días. Sello «Despacho que informa» desde el 85 %. Histórico mensual (cron el día 1). |

## Migraciones aplicadas

| Archivo | Contenido |
|---|---|
| `20261105120500_fase2_05_arreglo_proteger_campos` | (tuya) |
| `20261105130000_fase2_06_codigos_privado_integrado` | Códigos de 6 cifras y regeneración, RLS en `privado`, datos del programa en solo lectura, `solicitudes_conexion`, `regenerar_codigo()` |
| `20261105140000_fase3_01_nucleo` | `notificaciones`, columnas nuevas en `mensajes` (WhatsApp, idioma, regla), `mensajes_control`, `wa_numeros`, `wa_conversaciones`, `wa_mensajes`, `verificar_cliente()`, `estado_aprobado_cliente()`, reglas ampliadas, `proponer_recordatorios()` por WhatsApp, sin noticias, índice, almacenamiento privado (`notificaciones`, `whatsapp`) y cron mensual |

Amplía, sin quitar valores, los checks de `mensajes.canal`, `mensajes.tipo` y `despachos.envio_auto`. `solicitudes_demo`, `eventos_web` y `plazas_fundador` siguen igual (prueba 04).

## Funciones del servidor

- **`nucleo`:** notificaciones, buzón, mensajes y WhatsApp. Se despliega importando el código del repositorio fijado a un commit (ver `supabase/functions/_despliegue/LEEME.md`).
- **`mensajes`:** ahora reenvía a `nucleo`. Mantiene la dirección que usan el cron y la app anterior.

URLs que hay que dar de alta fuera:
- **WhatsApp (Meta):** `https://vblceecvhdhdxqtodvmg.supabase.co/functions/v1/nucleo/whatsapp`
- **Correo entrante (Resend, evento `email.received`):** `https://vblceecvhdhdxqtodvmg.supabase.co/functions/v1/nucleo/buzon`

## Pruebas

| Prueba | Resultado |
|---|---|
| Base de datos 01–08 (RLS, extras, importes, web, **5** notificación sin envío sin aprobación, **6** automático con su regla, **7** sin código no hay información, edición y aislamiento) | ✓ contra la base de datos real, sin dejar datos |
| Unitarias (importes, lectura de LexNET, plazos, límites de la IA **8**, decisiones del WhatsApp **6/7**, textos) | ✓ 27 |
| Interfaz, escritorio y móvil (40) | ✓ |
| Funciones desplegadas (webhook de Meta, firmas, sesión, cron por `nucleo` y por `mensajes`) | ✓ desde la base de datos con `pg_net` |

La prueba 8 con el modelo real (que la IA rechace consejo y pronósticos en una conversación) queda pendiente de la clave de Anthropic. Hoy está cubierta por la capa determinista, que corta antes de llamar al modelo, por el prompt del sistema y por la comprobación del texto que sale.
