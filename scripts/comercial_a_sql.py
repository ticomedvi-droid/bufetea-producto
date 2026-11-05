"""Genera el SQL que carga docs/comercial.py en las tablas planes, extras, plan_extras y comercial_config.

Uso:  python3 scripts/comercial_a_sql.py > supabase/seed/comercial.sql
Es idempotente (upsert): para cambiar un precio se edita docs/comercial.py, se vuelve a generar y se aplica.
Los extras contratados por cada despacho (despacho_extras) no se tocan.
"""
import importlib.util
import json
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("comercial", RAIZ / "docs" / "comercial.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
C = mod.COMERCIAL


def q(v):
    """Literal SQL seguro para texto, números, booleanos y JSON."""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (list, dict)):
        return q(json.dumps(v, ensure_ascii=False)) + "::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def tiene(feats, texto):
    return any(texto.lower() in t.lower() for t, _ in feats)


lineas = ["-- Generado por scripts/comercial_a_sql.py a partir de docs/comercial.py. No editar a mano."]

for i, e in enumerate(C["extras"]):
    lineas.append(
        "insert into public.extras (id, nombre, subtitulo, precio_mes, desde, caracteristicas, nota, pagina, orden) values ("
        + ", ".join(q(x) for x in [e["id"], e["name"], e["sub"], e["precio"], e["desde"], e["feats"], e["nota"] or None, e["page"], i])
        + ") on conflict (id) do update set nombre = excluded.nombre, subtitulo = excluded.subtitulo, precio_mes = excluded.precio_mes,"
        " desde = excluded.desde, caracteristicas = excluded.caracteristicas, nota = excluded.nota, pagina = excluded.pagina,"
        " orden = excluded.orden, actualizado_en = now();"
    )

for i, p in enumerate(C["plans"]):
    feats = [t for t, _ in p["feats"]]
    lineas.append(
        "insert into public.planes (id, nombre, precio_mes, precio_anio, asuntos_incluidos, exceso_asunto, para, recomendado,"
        " caracteristicas, soporte_prioritario, acompanamiento, orden) values ("
        + ", ".join(q(x) for x in [p["id"], p["name"], p["mes"], p["anio"], p["incl"], p["exceso"], p["para"], p["rec"], feats,
                                    tiene(p["feats"], "Soporte prioritario"), tiene(p["feats"], "Acompañamiento"), i])
        + ") on conflict (id) do update set nombre = excluded.nombre, precio_mes = excluded.precio_mes, precio_anio = excluded.precio_anio,"
        " asuntos_incluidos = excluded.asuntos_incluidos, exceso_asunto = excluded.exceso_asunto, para = excluded.para,"
        " recomendado = excluded.recomendado, caracteristicas = excluded.caracteristicas, soporte_prioritario = excluded.soporte_prioritario,"
        " acompanamiento = excluded.acompanamiento, orden = excluded.orden, actualizado_en = now();"
    )

pares = [(p["id"], x) for p in C["plans"] for x in p["incluye"]]
for plan, extra in pares:
    lineas.append(f"insert into public.plan_extras (plan_id, extra_id) values ({q(plan)}, {q(extra)}) on conflict do nothing;")
if "--limpiar" in sys.argv:
    # Solo si un plan deja de incluir un extra: borra los enlaces que ya no están en comercial.py (pide confirmación al aplicarlo).
    lista = ", ".join(f"({q(a)}, {q(b)})" for a, b in pares)
    lineas.append(f"delete from public.plan_extras where (plan_id, extra_id) not in ({lista});")

config = {"iva": C["iva"], "anual_meses_gratis": C["anual_meses_gratis"], "asunto_activo": C["asunto_activo"]}
for k, v in config.items():
    lineas.append(
        f"insert into public.comercial_config (clave, valor) values ({q(k)}, {q(json.dumps(v, ensure_ascii=False))}::jsonb)"
        " on conflict (clave) do update set valor = excluded.valor;"
    )
sys.stdout.write("\n".join(lineas) + "\n")
