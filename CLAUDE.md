# Bufetea · reglas permanentes

- Las especificaciones completas están en docs/PROMPT_MAESTRO.md. Léelo antes de cada tarea.
- La web (carpeta web-referencia/) es el contrato: el producto debe verse y funcionar como sus pantallas. Si hay contradicción, manda la web, y avísalo.
- Los precios, planes y extras salen solo de docs/comercial.py, cargados en las tablas planes y extras. Nunca escritos a mano en los componentes.
- Stack: Next.js (App Router), TypeScript, Tailwind y Supabase (el proyecto «bufetea» ya existente). No crees otra base de datos y no rompas solicitudes_demo, eventos_web ni plazas_fundador, que usa la web.
- Nunca escribas claves ni secretos en el código: usa .env.local y secretos de Supabase, y pide el valor a Tico.
- Pregunta antes de borrar datos, aplicar migraciones destructivas o contratar servicios.
- Trabaja por fases. Al terminar cada una: pasa las pruebas, haz commit y resume lo hecho.
- Textos en español de España. Ningún nombre de programa de gestión en la interfaz.
- web-referencia/ es solo referencia: no se modifica ni se despliega desde este repositorio.
