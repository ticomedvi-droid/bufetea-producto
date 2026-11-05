#!/usr/bin/env bash
# Empaqueta las funciones del servidor en un único archivo cada una (lo que se despliega en Supabase).
# Uso: scripts/empaquetar-funciones.sh [carpeta-salida]   (necesita Deno 2)
set -euo pipefail
cd "$(dirname "$0")/../supabase/functions"
SALIDA="${1:-../../.funciones}"
mkdir -p "$SALIDA"
for f in nucleo equipo; do
  deno bundle --quiet --config deno.json --minify --platform deno --external 'npm:*' -o "$SALIDA/$f.js" "$f/index.ts"
done
cp _despliegue/mensajes.ts "$SALIDA/mensajes.ts"
ls -la "$SALIDA"
