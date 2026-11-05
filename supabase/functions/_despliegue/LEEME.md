# Despliegue de las funciones del servidor

El repositorio es público, así que **nucleo** se despliega con un archivo de entrada que importa el código del propio
repositorio fijado a un commit (Supabase lo descarga al desplegar; lo que corre es exactamente ese commit):

```ts
import "https://raw.githubusercontent.com/ticomedvi-droid/bufetea-producto/<SHA>/supabase/functions/nucleo/index.ts";
```

- `nucleo`: notificaciones, buzón (Resend), mensajes (email y WhatsApp) y WhatsApp (Meta). Sin verificación de JWT en la pasarela:
  cada ruta comprueba la sesión, la firma del webhook o el secreto del cron.
- `mensajes`: `_despliegue/mensajes.ts`, reenvía a `nucleo` (lo usan el cron y la app anterior).
- `equipo`: `equipo/index.ts`.

Para desplegar una versión nueva: subir el commit, cambiar el SHA en el archivo de entrada de `nucleo` y desplegar.
Con la CLI de Supabase también se puede desplegar directamente: `supabase functions deploy nucleo --no-verify-jwt`.
