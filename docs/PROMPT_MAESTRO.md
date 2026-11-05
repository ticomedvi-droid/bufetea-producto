# PROMPT MAESTRO · DESARROLLO DEL PRODUCTO BUFETEA

## 0. ROL Y FORMA DE TRABAJAR

Actúas como CTO y arquitecto de software full-stack sénior. Tu misión es construir el producto completo de Bufetea, listo para usarse con despachos reales: no una maqueta ni un prototipo de pantallas sueltas.

Trabajas directamente en el código. No te limites a darme especificaciones ni fragmentos para copiar y pegar: crea los archivos, ejecuta las migraciones, prueba y corrige.

La web pública de Bufetea es el contrato con el cliente. Todo lo que la web promete debe existir en el producto, funcionar como la web dice y verse como las pantallas que la web enseña. Nada más y nada menos.

- Web de referencia: https://gilded-tanuki-43fedf.netlify.app/
- Código de la web: te adjunto `bufetea-web-netlify.zip`. Contiene `index.html`, `precios.html`, las páginas de cada función, `producto.html` (demo navegable del producto), `app.html` (primera versión real conectada a Supabase), `v4.css` y `v4.js`.
- Configuración comercial: te adjunto `comercial.py`. Es la fuente única de planes, precios, límites y extras.

Si algo de este documento contradice la web, manda la web, y me avisas. Si la web no dice algo que el producto necesita, decídelo con criterio, coherente con la web, y apúntalo en el informe final.

No pidas confirmación para cada decisión. Pregúntame solo si una decisión es irreversible o cuesta dinero, como contratar un servicio o borrar datos.

---

## 1. QUÉ ES BUFETEA (no lo cambies)

Bufetea es un SaaS B2B para despachos de abogados en España. Es una capa de comunicación inteligente entre el despacho y sus clientes:

- **No sustituye el programa de gestión del despacho.** Lo lee en modo de solo lectura y nunca escribe en él.
- **Explica cada notificación judicial** en lenguaje claro, en el idioma del cliente.
- **Envía las comunicaciones por WhatsApp o email.**
- **Responde las consultas rutinarias** («¿cómo va lo mío?») con lo que el abogado ya aprobó, tras verificar la identidad del cliente con un código.
- **El abogado controla qué sale solo y qué revisa antes.**

Propuesta de valor: «Ni una llamada más de “¿cómo va lo mío?”». Tus clientes, siempre informados, y tú recuperas tiempo para ejercer la abogacía.

### Límites de la IA, obligatorios en todo el producto
- Nunca da asesoramiento jurídico ni pronostica el resultado de un asunto.
- Nunca habla de un asunto con quien no haya confirmado su código.
- Nunca envía la explicación de una notificación judicial sin aprobación, salvo lo que el despacho haya marcado como automático en sus reglas.
- Nunca escribe en el programa de gestión.
- Siempre se identifica como IA (Reglamento europeo de IA). Los mensajes indican que se redactaron con ayuda de IA y que los aprobó el abogado.

---

## 2. STACK Y PUNTO DE PARTIDA

**Stack:**
- Next.js (App Router) con React, TypeScript y Tailwind CSS.
- Supabase como backend: PostgreSQL, Auth, Row Level Security, Storage y Edge Functions.

No añadas un servidor Express aparte salvo que haga falta para algo que Supabase no pueda hacer, y en ese caso justifícalo.

**Ya existe un proyecto de Supabase: «bufetea».** No crees otra base de datos.
- Tiene tablas en uso: `despachos` (con `fundador` y `envio_auto`), `mensajes` (con `auto`), `solicitudes_demo`, `eventos_web` y otras.
- Tiene funciones RPC: `plazas_fundador`, `ajustar_envio_auto`, `proponer_recordatorios`, `completar_solicitud_demo`.
- Tiene la Edge Function `mensajes` (envío de email con Resend).

Antes de diseñar el esquema:
1. Inspecciona el esquema actual.
2. Amplíalo con migraciones nuevas.
3. No rompas lo que usa la web: el formulario de demo, la medición A/B y el contador de fundadores.

**Reutiliza lo que ya hay:**
- `app.html` y su lógica de login, envío automático y reglas.
- `producto.html` como guion visual y funcional de todas las pantallas.

**Secretos:** nunca escribas claves en el código ni en el repositorio. Usa variables de entorno y secretos de Supabase. Cuando necesites una clave nueva, dime cuál y dónde ponerla, y la introduzco yo.

---

## 3. FIDELIDAD VISUAL (obligatorio)

El producto debe ser igual que las pantallas de la web. Quien vea la web y luego entre al producto tiene que reconocer exactamente las mismas pantallas.

### Sistema visual
- **Tipografía:** Geist y Geist Mono.
- **Paleta de las pantallas del producto:** la clara, la que la web aplica a `.screen`, `.wa-app`, `.doc`, `.draft` y `.phone`. Los fondos crema, los acentos rubí y ámbar, los estados y las píldoras («Nueva», «Borrador listo», «Por aprobar», «Contarle algo», «Urgente», «Sale solo», «Incluido») salen de `v4.css`.
- **Login:** como el de `producto.html`, con panel partido y la marca a un lado.
- **Logo:** el mismo SVG de las tres columnas. El logo animado al pasar el cursor es solo para la web.
- **Navegación:** menú lateral por pilares (Informa, Atiende y Acompaña), más un grupo «Amplía» para los extras y «Tu plan», como en `producto.html`.

### Pantallas que deben reproducirse fielmente
Mismos textos, estructura y estados:

1. **Hoy:** saludo, indicadores (novedades por revisar, asuntos activos, % de clientes informados) y lista de novedades con su estado.
2. **Notificación interpretada:** «Lo que dice el juzgado», «Resumen para ti» y el plazo detectado con su fecha («se valida en tu programa»).
3. **Mensaje para el cliente:** borrador editable, idioma y canal, con los botones «Aprobar y enviar», «Editar» y «No contárselo».
4. **Reglas:** Automático, Con revisión y Límites, configurables por el despacho.
5. **Conversación de WhatsApp** con el cliente.
6. **Bandeja de WhatsApp del despacho:** lista, hilo y respuesta propuesta por la IA, que siempre envía una persona.
7. **Clientes sin noticias:** días sin noticias y mensaje propuesto.
8. **Índice de cliente informado** y sello «Despacho que informa» (a partir del 85 %).
9. **Bufetea Voice:** registro de llamadas con transcripción, resumen y grabación.
10. **Bufetea Portal**, como el móvil de la web.
11. **Bufetea Docs** y **Bufetea Pay**, como sus paneles en la web.
12. **Tu plan.**

Si una pantalla necesaria no está en la web (ajustes, usuarios, ficha de cliente, ficha de asunto), diséñala con el mismo sistema y apúntala en el informe.

Diseño responsive: el abogado tiene que poder aprobar mensajes desde el móvil. Accesibilidad AA.

---

## 4. FUNCIONALIDADES

Cada función tiene criterios de aceptación. No la des por terminada hasta que se cumplan.

### 4.1 Base
- **Despachos con varios usuarios.** Roles: titular/admin, abogado y administración. Usuarios ilimitados. Aislamiento total entre despachos con Row Level Security en todas las tablas.
- **Login** con email y contraseña, recuperación de contraseña y sesión persistente.
- **Clientes y asuntos:** ficha de cliente (teléfono, email, idioma, canal preferido, código de verificación) y ficha de asunto (número, juzgado, fase, abogado responsable, estado abierto, cerrado o archivado). Cada asunto tiene su historial completo de comunicaciones.
- **Modo independiente:**
  - Cada despacho tiene una dirección de email propia para reenviar PDFs de LexNET.
  - Una Edge Function recibe el correo, extrae el PDF y lo asocia al asunto (por número de procedimiento) o lo deja «sin asignar» para que el despacho lo asigne.
  - Alta e importación de clientes y asuntos desde CSV o Excel.
- **Modo integrado:**
  - Conector de solo lectura con el programa de gestión: lectura de asuntos, clientes y agenda, y sincronización de novedades cuando el programa lo permita.
  - Diseña una capa de conectores genérica (`connectors/`). Si tienes acceso al conector existente del proyecto (`bufetea-clio`), intégralo como el primero.
  - Nunca escrituras hacia el programa de gestión.
  - En la interfaz y en los textos no se nombran programas concretos: se dice «tu programa de gestión».

### 4.2 Las 10 funciones principales, incluidas en los tres planes
1. **Notificaciones explicadas.**
   - Al llegar un PDF, la IA identifica el tipo de resolución, qué ha pasado, qué plazo corre y si el cliente tiene que hacer algo.
   - Genera el resumen para el abogado y el mensaje para el cliente, sin tecnicismos.
   - Por defecto queda «Por aprobar».
2. **WhatsApp del despacho.**
   - Bandeja compartida por el equipo: identifica al cliente por su número y enlaza la conversación con sus asuntos.
   - Las notas de voz se transcriben y los adjuntos se guardan en el asunto.
   - La IA propone la respuesta y la envía una persona.
3. **«¿Cómo va lo mío?» con código.**
   - El cliente escribe y confirma su código.
   - Recibe la última novedad aprobada de su asunto.
   - Sin código, no se da ninguna información.
4. **Clientes nuevos.** Las consultas de números desconocidos se recogen a cualquier hora: la IA resume el caso, propone cita y avisa al despacho. Nunca da consejo jurídico.
5. **En el idioma del cliente.** El mensaje aprobado se envía en el idioma de su ficha: español, inglés, rumano, francés, árabe, chino y otros.
6. **Preparación del juicio.** Recordatorio la semana antes y la víspera: dónde, a qué hora, qué llevar y qué va a pasar.
7. **Clientes sin noticias.** Aviso interno cuando un cliente lleva más de 30 días sin noticias, con un mensaje propuesto.
8. **Mapa del procedimiento.** Fase actual y siguientes del asunto, explicadas sin tecnicismos.
9. **Cierre con reseña.** Mensaje de cierre al terminar el asunto y, si el despacho quiere, petición de valoración en Google.
10. **Índice y sello.** Porcentaje mensual de clientes con noticias en los últimos 30 días; a partir del 85 %, sello «Despacho que informa».

**Canales:** WhatsApp (WhatsApp Business Cloud API de Meta) y email (Resend, sobre la Edge Function `mensajes` ya existente). El canal se elige en la ficha del cliente.

### 4.3 Reglas: control del abogado
- **Automático:** el despacho lo activa por tipo de mensaje.
  - Recordatorios de cita (la semana antes y la víspera, como ya hace `envio_auto`).
  - Respuesta al «¿cómo va lo mío?» con lo ya aprobado.
  - Recogida de consultas nuevas.
  - Avisos internos de clientes sin noticias.
- **Con revisión:** explicaciones de notificaciones, respuestas nuevas de la IA por WhatsApp, mensajes a clientes sin noticias y cierre con reseña (salvo que se active como automático).
- **Límites:** bloqueados siempre, no configurables. Asesoramiento jurídico, pronósticos, hablar sin código verificado, enviar fuera de las reglas y escribir en el programa de gestión.
- **Trazabilidad:** todo mensaje enviado guarda quién lo aprobó, o «automático» con la regla que lo permitió, y cuándo.

### 4.4 Extras: se contratan con cualquier plan
- **Bufetea Voice (centralita con IA).**
  - Atiende llamadas, reconoce al cliente por su número y verifica su código.
  - Responde con información autorizada, recoge consultas nuevas, propone cita y pasa a una persona lo que lo necesite.
  - Guarda la grabación, la transcripción y el resumen en el asunto.
  - Implementación: agente de voz de ElevenLabs más número de teléfono. Lleva un contador de minutos.
- **Bufetea Portal.** Web con la marca del despacho donde el cliente, tras verificarse, ve la fase de su asunto, la última novedad, comunicaciones y documentos.
- **Bufetea Docs.** Solicitud de documentos con recordatorios, recogida de documentos y firma electrónica mediante un proveedor compatible.
- **Bufetea Pay.** Solicitud de provisiones de fondos con enlace de pago seguro (Stripe), recordatorios y seguimiento de lo pendiente.

---

## 5. PLANES Y BLOQUEO DE FUNCIONES (obligatorio)

El producto debe funcionar exactamente como dice la página de precios.
- **Fuente única:** una tabla `planes` y otra `extras` en la base de datos, cargadas con los valores de `comercial.py`. Ningún precio puede estar escrito a mano en los componentes.
- **Precios sin IVA. Usuarios ilimitados en todos los planes.**

| Plan | Mensual | Anual | Asuntos activos incluidos | Exceso por asunto/mes | Incluye |
|---|---|---|---|---|---|
| Starter | 49 € | 490 € | 50 | 0,40 € | Las 10 funciones principales |
| Professional | 89 € | 890 € | 150 | 0,35 € | Lo anterior, Bufetea Portal y soporte prioritario |
| Business | 149 € | 1.490 € | 400 | 0,30 € | Lo anterior, Bufetea Pay y acompañamiento de puesta en marcha |

**Extras** (precios orientativos, editables en la tabla `extras`):

| Extra | Precio | Nota |
|---|---|---|
| Voice | desde 39 €/mes | minutos según uso |
| Portal | 19 €/mes | — |
| Docs | 29 €/mes | la firma del proveedor se cobra aparte |
| Pay | 19 €/mes | la comisión de la pasarela se cobra aparte |

**Reglas de funcionamiento:**
- Cada despacho tiene plan, forma de pago (mensual o anual), extras contratados, estado (piloto, activo o cancelado) y si es fundador.
- **Un extra está activo si está contratado o si viene incluido en el plan.** Portal está incluido en Professional y Business; Pay, en Business.
- **Extras no activos:** aparecen en el menú con candado. Al abrirlos se ve qué hacen, su precio orientativo y el botón «Solicitar activación», que crea una solicitud para el equipo de Bufetea. No se pueden usar.
- **El bloqueo se aplica también en el servidor** (RLS o comprobaciones en las Edge Functions), no solo ocultando botones.
- **Cambio de plan:** los extras incluidos se activan o bloquean solos y se conserva lo que el despacho había contratado aparte.
- **Asunto activo:** expediente abierto con al menos un cliente asociado. No cuentan los cerrados, archivados ni duplicados. Se calcula a diario y se guarda el máximo del mes para facturar.
- **Sin límite duro de asuntos:** al superar los incluidos, el exceso se suma a la estimación del mes. Se avisa al administrador al llegar al 80 % y al 100 %.
- **Soporte prioritario y acompañamiento** son servicios: no bloquean pantallas. Basta con mostrarlos en «Tu plan».
- **Pantalla «Tu plan»:**
  - Plan y forma de pago.
  - Asuntos activos usados frente a los incluidos.
  - Asuntos adicionales e importe.
  - Extras activos, marcando «Incluido en tu plan» o «Contratado».
  - Total estimado del mes, con el mismo cálculo que la calculadora de la web.
  - Opción de cambiar de plan y de solicitar extras.
  - Para fundadores: «Precio congelado hasta [fecha]».
- **Piloto de 30 días:** el primer mes pagado es el piloto. El despacho puede marcarse «en piloto» con fecha de fin, que se ve en «Tu plan». Si continúa, el piloto cuenta como primer mes.
- **Programa fundador:** las primeras 50 incorporaciones (`despachos.fundador`). La RPC `plazas_fundador` debe seguir devolviendo el dato real que usa el contador de la web.
- **Cobros:** prepara la estructura para Stripe (productos, precios, suscripción, exceso por uso y webhooks) pero no cobres de verdad todavía. Documenta qué falta para activarlo.

---

## 6. PANEL INTERNO DE BUFETEA (para mí)

Una sección solo para administradores de Bufetea, separada de los despachos, con:
- **Solicitudes de demo** (`solicitudes_demo`): datos, despacho, programa (texto libre), interés y cuándo quiere empezar. Estados: pendiente, contactado, demo hecha, piloto, cliente y descartado.
- **Medición A/B de la web:** el resumen de `eventos_web` y `privado.resumen_ab`.
- **Despachos:** dar de alta, asignar plan, marcar fundador o piloto, activar extras y ver el uso (asuntos activos, mensajes y minutos de Voice).
- **Solicitudes de activación** de extras.

---

## 7. SEGURIDAD Y PRIVACIDAD (no negociable)

- **RGPD y LOPDGDD:** el despacho es el responsable y Bufetea el encargado del tratamiento.
  - El alta exige aceptar el contrato del artículo 28.
  - Exportación completa de los datos del despacho.
  - Borrado seguro al darse de baja.
- **Datos en la UE:** Supabase en una región de la UE.
- **Acceso:** RLS en todas las tablas, roles por usuario y registro de accesos. Cualquier acceso de soporte de Bufetea queda registrado.
- **Verificación de identidad del cliente** con código antes de dar información de un asunto, por cualquier canal: WhatsApp, Voice o Portal.
- **IA:**
  - Las llamadas al modelo se hacen desde Edge Functions, nunca desde el navegador.
  - Los prompts del sistema incluyen los límites de la sección 1.
  - Se usa un proveedor con compromiso contractual de no entrenar con los datos.
- **Sin certificaciones inventadas.** La web dice que Bufetea aún no tiene ISO propia, y el producto no puede decir otra cosa.

---

## 8. TEXTOS Y TONO

- **Español de España**, cercano y profesional, sin tecnicismos para el cliente final.
- **Mismos nombres que la web:** Bufetea Voice, Portal, Docs y Pay; «asuntos activos»; «Por aprobar»; «Sale solo»; «Despacho que informa».
- **Datos de demostración:** en el modo demo y en los datos de ejemplo, la etiqueta visible «Ejemplo de demostración con datos ficticios».
- **Ningún nombre de programa de gestión concreto** en textos visibles.

---

## 9. PLAN DE EJECUCIÓN

### Fase 1 · Auditoría breve
Analiza la web, `producto.html`, `app.html`, `comercial.py` y el esquema actual de Supabase. Entrega:
- una tabla de cada pantalla y promesa de la web con su estado: existe, parcial o falta;
- la lista de migraciones necesarias;
- las decisiones de arquitectura.

Máximo dos páginas. Después, empieza a construir sin esperar.

### Fase 2 · Base
Proyecto Next.js, sistema visual (tokens extraídos de `v4.css`), login, despachos, roles, RLS, clientes, asuntos, importación CSV, planes y extras con bloqueo, y «Tu plan».

### Fase 3 · Núcleo
Recepción de PDFs de LexNET, notificaciones explicadas, mensajes con aprobación, reglas, email, WhatsApp, «¿cómo va lo mío?» con código, idioma, Hoy, clientes sin noticias, índice y sello.

### Fase 4 · Resto de funciones principales
Clientes nuevos, preparación del juicio, mapa del procedimiento, cierre con reseña y conector de solo lectura.

### Fase 5 · Extras
Portal, Pay, Docs y Voice, cada uno detrás de su bloqueo por plan.

### Fase 6 · Panel interno, Stripe preparado y pulido

Al terminar cada fase, ejecuta las pruebas y enséñame lo hecho antes de seguir.

---

## 10. PRUEBAS (obligatorias)

**Tests automáticos** (Playwright y tests de base de datos) que comprueben como mínimo:
1. Un despacho no ve datos de otro: prueba de RLS con dos despachos.
2. Starter no puede usar Portal ni Pay; Professional usa Portal pero no Pay; Business usa los dos. Comprobado en la interfaz y en el servidor.
3. Al cambiar de plan, los extras incluidos se activan y bloquean correctamente.
4. El cálculo de «Tu plan» coincide con la calculadora de la web:
   - Professional con 180 asuntos: 99,50 €/mes.
   - Starter con 120 asuntos: 77 €.
   - Business con 500 asuntos: 179 €.
   - Professional anual con 180 asuntos: 84,67 €/mes.
5. Una notificación reenviada genera resumen, plazo y borrador en estado «Por aprobar», y no se envía sin aprobación.
6. Lo marcado como automático sale solo y queda registrado como automático.
7. Sin código verificado no se da información del asunto, por ningún canal.
8. La IA rechaza peticiones de asesoramiento jurídico y de pronósticos.
9. El formulario de demo de la web y el contador de fundadores siguen funcionando.
10. Escritorio y móvil sin errores de consola.

---

## 11. ENTREGA FINAL

1. Producto desplegado en una URL de pruebas y código en un repositorio.
2. Tabla de coherencia entre web y producto: cada pantalla y cada promesa de la web, marcada como igual, adaptada (con explicación) o pendiente.
3. Migraciones aplicadas y esquema resultante.
4. Variables de entorno y secretos necesarios, sin sus valores, y dónde ponerlos.
5. Lo que falta para producción: verificación de WhatsApp Business en Meta, número de teléfono de Voice, activar Stripe y dominio propio.
6. Resultado de las pruebas.
7. Problemas encontrados y decisiones que he de tomar yo.
