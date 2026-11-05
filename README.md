# Bufetea · producto

Capa de comunicación inteligente entre el despacho de abogados y sus clientes.

- `docs/PROMPT_MAESTRO.md`: especificación completa del producto y plan por fases.
- `docs/comercial.py`: fuente única de planes, precios, límites y extras (la misma que usa la web). Tras cambiarla: `npm run comercial` y aplicar `supabase/seed/comercial.sql`.
- `docs/FASE_1_AUDITORIA.md`, `docs/FASE_2.md`, `docs/FASE_3.md`: informes de cada fase.
- `web-referencia/`: copia de la web pública, referencia visual y funcional (no se modifica ni se despliega desde aquí).
- `supabase/migrations`, `supabase/functions`, `supabase/tests`: esquema, funciones del servidor y pruebas de base de datos.

## Arrancar

```bash
npm install
cp .env.example .env.local   # y rellena los valores
npm run dev
```

Sin las variables de Supabase arranca en modo demostración con datos ficticios.

## Pruebas

```bash
npm test                                 # importes (unitarias)
npm run test:e2e                         # interfaz en escritorio y móvil (modo demo)
SUPABASE_DB_URL=postgresql://… npm run test:bd   # RLS, extras e importes en la base de datos
```
