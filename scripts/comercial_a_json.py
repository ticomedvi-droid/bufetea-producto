"""Genera lib/datos/comercial-demo.json a partir de docs/comercial.py, solo para el modo demostración (sin base de datos).
En producción los precios se leen de las tablas planes y extras. Uso: python3 scripts/comercial_a_json.py"""
import importlib.util, json, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("comercial", RAIZ / "docs" / "comercial.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
C = m.COMERCIAL
salida = {
    "_aviso": "Generado por scripts/comercial_a_json.py desde docs/comercial.py. No editar a mano.",
    "planes": [{
        "id": p["id"], "nombre": p["name"], "precio_mes": p["mes"], "precio_anio": p["anio"], "asuntos_incluidos": p["incl"],
        "exceso_asunto": p["exceso"], "incluye": p["incluye"], "para": p["para"], "recomendado": p["rec"],
        "caracteristicas": [t for t, _ in p["feats"]],
        "soporte_prioritario": any("soporte prioritario" in t.lower() for t, _ in p["feats"]),
        "acompanamiento": any("acompañamiento" in t.lower() for t, _ in p["feats"]),
    } for p in C["plans"]],
    "extras": [{"id": e["id"], "nombre": e["name"], "subtitulo": e["sub"], "precio_mes": e["precio"], "desde": e["desde"],
                "caracteristicas": e["feats"], "nota": e["nota"] or None} for e in C["extras"]],
}
(RAIZ / "lib" / "datos" / "comercial-demo.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
