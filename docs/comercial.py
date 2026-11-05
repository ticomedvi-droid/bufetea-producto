# =====================================================================
# Bufetea · CONFIGURACIÓN COMERCIAL (fuente única de precios y planes)
# Todo lo que la web muestra sobre planes, límites, excesos y extras sale de aquí:
# las tarjetas, la comparativa, la calculadora (vía JSON), las preguntas y los textos.
# Para cambiar un precio, se cambia aquí y se vuelve a generar la web.
# =====================================================================
import json as _json, html as _html

COMERCIAL = {
  "iva": False,              # precios sin IVA
  "anual_meses_gratis": 2,
  "plans": [
    {"id": "starter", "name": "Starter", "mes": 49, "anio": 490, "incl": 50, "exceso": 0.40,
     "para": "Para abogados independientes y despachos pequeños.", "cta": "Quiero Starter", "rec": False, "incluye": [],
     "feats": [("Todas las funciones principales de Bufetea", 0), ("Notificaciones judiciales explicadas", 0),
               ("Comunicaciones por WhatsApp y email", 0), ("Respuestas a consultas rutinarias", 0),
               ("Recordatorios y seguimiento", 0), ("Captación de nuevos clientes", 0),
               ("Mensajes en el idioma del cliente", 0), ("Panel de control", 0), ("Usuarios ilimitados", 0)]},
    {"id": "professional", "name": "Professional", "mes": 89, "anio": 890, "incl": 150, "exceso": 0.35,
     "para": "Para despachos en crecimiento.", "cta": "Quiero Professional", "rec": True, "incluye": ["portal"],
     "feats": [("Todo lo de Starter", 0), ("Bufetea Portal incluido, valorado en 19 €/mes", 0), ("Soporte prioritario", 0), ("Usuarios ilimitados", 0)]},
    {"id": "business", "name": "Business", "mes": 149, "anio": 1490, "incl": 400, "exceso": 0.30,
     "para": "Para despachos con mayor volumen y más automatización.", "cta": "Quiero Business", "rec": False, "incluye": ["portal", "pay"],
     "feats": [("Todo lo de Professional", 0), ("Bufetea Portal y Bufetea Pay incluidos, valorados en 38 €/mes", 0), ("Soporte prioritario", 0),
               ("Acompañamiento de puesta en marcha", 0), ("Usuarios ilimitados", 0)]},
  ],
  # Precios orientativos: hipótesis comerciales pendientes de validar con los costes de cada proveedor.
  "extras": [
    {"id": "voice", "name": "Bufetea Voice", "sub": "Centralita con IA", "precio": 39, "desde": True, "page": "centralita-abogados.html",
     "feats": ["Atiende llamadas entrantes", "Identifica al cliente con los mecanismos de verificación disponibles",
               "Responde consultas rutinarias con información autorizada", "Recoge consultas de nuevos clientes",
               "Puede proponer citas", "Deja registro de la conversación", "Pasa al despacho lo que necesita a una persona"],
     "nota": "Minutos incluidos según uso: te los confirmamos antes de contratar. Los consumos adicionales tienen límites y tarifas transparentes."},
    {"id": "portal", "name": "Bufetea Portal", "sub": "Portal del cliente", "precio": 19, "desde": False, "page": "portal-del-cliente.html",
     "feats": ["Portal con la imagen de tu despacho", "Acceso del cliente a la información autorizada de su asunto",
               "Seguimiento del estado del procedimiento", "Comunicaciones y documentos", "Acceso seguro"], "nota": ""},
    {"id": "docs", "name": "Bufetea Docs", "sub": "Documentos y firma", "precio": 29, "desde": False, "page": "documentos-y-firma.html",
     "feats": ["Solicitud de documentación", "Recordatorios automáticos", "Recogida de documentos",
               "Preparación de documentos", "Firma electrónica mediante proveedor compatible"],
     "nota": "Si el proveedor de firma cobra por firma, esa tarifa se muestra aparte."},
    {"id": "pay", "name": "Bufetea Pay", "sub": "Cobro de provisiones", "precio": 19, "desde": False, "page": "cobro-de-provisiones.html",
     "feats": ["Solicitud de provisiones de fondos", "Recordatorios de pago", "Enlaces de pago seguros",
               "Seguimiento de pagos pendientes"],
     "nota": "Las comisiones del proveedor de pagos se muestran aparte."},
  ],
  "asunto_activo": ("Un asunto activo es un expediente abierto de tu despacho con al menos un cliente asociado. "
                    "No cuentan los expedientes cerrados o archivados ni los asuntos duplicados. "
                    "Antes de contratar ves cuántos asuntos activos tienes y cuánto pagarías por los adicionales."),
}

PL = {p["id"]: p for p in COMERCIAL["plans"]}
EX = {e["id"]: e for e in COMERCIAL["extras"]}

def eu(x, dec=None):
    """Formato español: 49 → «49 €», 0.4 → «0,40 €», 1490 → «1.490 €», 99.5 → «99,50 €»."""
    if dec is None:
        dec = 0 if float(x).is_integer() else 2
    s = f"{x:,.{dec}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    if dec == 0 and abs(x) < 10000 and abs(x) >= 1000:
        pass
    return s + " €"

def precio_extra(e):
    return ("desde " if e["desde"] else "") + eu(e["precio"]) + "/mes"

S, P, B = PL["starter"], PL["professional"], PL["business"]
EXTRAS_MIN = min(e["precio"] for e in COMERCIAL["extras"])
RESUMEN = (f"{S['name']} {eu(S['mes'])}/mes hasta {S['incl']} asuntos activos, {P['name']} {eu(P['mes'])}/mes hasta {P['incl']} "
           f"y {B['name']} {eu(B['mes'])}/mes hasta {B['incl']}")
JSON_ATTR = _html.escape(_json.dumps({"plans": [{k: p[k] for k in ("id", "name", "mes", "anio", "incl", "exceso", "incluye")} for p in COMERCIAL["plans"]],
                                      "extras": [{k: e[k] for k in ("id", "name", "sub", "precio", "desde")} for e in COMERCIAL["extras"]]},
                                     ensure_ascii=False))

def _ck(pend):
    return '<span class="soon" title="En desarrollo">En desarrollo</span>' if pend else ''

def plan_cards():
    out = ['<div class="billing" role="group" aria-label="Forma de pago" data-billing><button type="button" data-bill="mes" aria-pressed="true">Mensual</button>'
           f'<button type="button" data-bill="anio" aria-pressed="false">Anual <span>{COMERCIAL["anual_meses_gratis"]} meses gratis</span></button></div>', '<div class="plans">']
    for p in COMERCIAL["plans"]:
        ahorro = p["mes"] * 12 - p["anio"]
        feats = "".join(f'<li>{_html.escape(t)}{_ck(pend)}</li>' for t, pend in p["feats"])
        out.append(f'''<article class="plan{' rec' if p['rec'] else ''} rv" data-plan-card="{p['id']}">{'<span class="rec-b">Recomendado</span>' if p['rec'] else ''}
<h3 class="pn">{p['name']}</h3><p class="pp">{p['para']}</p>
<div class="price"><b data-pm="{p['id']}">{eu(p['mes'])}</b><span data-pu="{p['id']}">/mes</span></div>
<small class="pnote" data-pa="{p['id']}" data-mes="o {eu(p['anio'])} al año con pago anual" data-anio="Equivale a {eu(p['anio'] / 12, 2)}/mes · ahorras {eu(ahorro)}">o {eu(p['anio'])} al año con pago anual</small>
<p class="lim"><b>Hasta {p['incl']} asuntos activos</b><span>Después, {eu(p['exceso'], 2)} por asunto activo adicional al mes</span></p>
<ul class="pf">{feats}</ul>
<a class="btn {'primary' if p['rec'] else 'ghost'}" href="#" data-demo data-plan="{p['name']}">{p['cta']}</a></article>''')
    out.append('</div>')
    out.append('<p class="pfoot c">Sin IVA · Sin permanencia · Sin cobro por usuario · Demo gratuita de 20 minutos</p>')
    out.append(PILOTO)
    return "\n".join(out)

def comparativa(abierta=False):
    def c(v): return '<td>' + ({True: '<span class="y" aria-label="Sí">✓</span>', False: '<span class="n" aria-label="No">—</span>'}.get(v, v)) + '</td>'
    soon = ' <span class="soon">En desarrollo</span>'
    rows = [("Asuntos activos incluidos", [str(p["incl"]) for p in COMERCIAL["plans"]]),
            ("Asunto activo adicional, al mes", [eu(p["exceso"], 2) for p in COMERCIAL["plans"]]),
            ("Pago anual (2 meses gratis)", [eu(p["anio"]) + "/año" for p in COMERCIAL["plans"]]),
            ("Funciones principales de Bufetea", [True, True, True]),
            ("Usuarios", ["Ilimitados"] * 3),
            ("Panel de control", [True, True, True]),
            ("Soporte prioritario", [False, True, True]),
            ("Acompañamiento de puesta en marcha", [False, False, True]),
            ("Bufetea Portal", ["19 €/mes", "Incluido", "Incluido"]),
            ("Bufetea Pay", ["19 €/mes", "19 €/mes", "Incluido"]),
            ("Bufetea Voice y Bufetea Docs", ["Opcionales"] * 3)]
    head = "".join(f'<th scope="col">{p["name"]}</th>' for p in COMERCIAL["plans"])
    body = "".join(f'<tr><th scope="row">{r}</th>{"".join(c(v) for v in vals)}</tr>' for r, vals in rows)
    tabla = f'<div class="cmp-wrap"><table class="cmp"><caption class="sr">Comparativa de planes de Bufetea</caption><thead><tr><td></td>{head}</tr></thead><tbody>{body}</tbody></table></div>'
    if abierta:
        return f'<div class="cmp-box rv"><h3 class="h3big" style="margin-bottom:14px">Comparativa de planes</h3>{tabla}</div>'
    return f'<details class="cmp-box rv"><summary>Ver la comparativa completa de planes</summary>{tabla}</details>'

def asunto_activo():
    return (f'<div class="activo rv"><span class="rk">¿Qué es un asunto activo?</span><p>{COMERCIAL["asunto_activo"]}</p>'
            f'<p class="ej">Ejemplo: con 180 asuntos activos en {P["name"]} pagas {eu(P["mes"])} + (30 × {eu(P["exceso"], 2)}) = '
            f'{eu(P["mes"] + 30 * P["exceso"], 2)} al mes. Con 120 asuntos, {eu(P["mes"])}, porque están dentro de los {P["incl"]} incluidos.</p></div>')

def calculadora(uid):
    plans = "".join(f'<button type="button" data-cplan="{p["id"]}" aria-pressed="{str(p["rec"]).lower()}">{p["name"]}</button>' for p in COMERCIAL["plans"])
    mods = "".join(f'''<label class="mod"><input type="checkbox" data-mod="{e['id']}"><span class="bx" aria-hidden="true"></span><span><b>{e['name']} · {e['sub']}</b><small>{precio_extra(e)} · precio orientativo</small></span><span class="x" data-mod-tag="{e['id']}">Extra</span></label>''' for e in COMERCIAL["extras"])
    return f'''<div class="cfg rv" data-cfg data-precios="{JSON_ATTR}">
<div class="cfg-l">
<div class="pbox"><span class="lbl" id="{uid}-pl">Plan</span><div class="cplans" role="group" aria-labelledby="{uid}-pl">{plans}</div>
<div class="billing sm" role="group" aria-label="Forma de pago" data-billing><button type="button" data-bill="mes" aria-pressed="true">Mensual</button><button type="button" data-bill="anio" aria-pressed="false">Anual <span>2 meses gratis</span></button></div></div>
<div class="pbox"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><label for="{uid}" style="font-weight:650">Asuntos activos de tu despacho</label><output data-ao style="font-size:2.2rem;color:var(--ruby);line-height:1;font-weight:650">180</output></div>
<input id="{uid}" data-a type="range" min="10" max="1000" step="5" value="180">
<div class="scale" aria-hidden="true"><span>10</span><span>1.000</span></div>
<p class="fnote" data-best></p></div>
<div class="pbox"><span class="lbl">Extras · los incluidos en tu plan no se cobran</span><div class="mods">{mods}</div>
<p class="fnote">Precios orientativos, pendientes de validación con los costes de cada proveedor. Te los confirmamos antes de contratar.</p></div>
</div>
<aside class="ticket" aria-live="polite"><span class="lbl">Tu estimación</span>
<ul class="lines" data-lines></ul>
<div class="tot"><span>Total estimado al mes</span><b data-total>99,50 €</b></div>
<p class="per" data-per></p>
<p class="fine">Precios sin IVA · Sin permanencia · Sin cobro por usuario</p>
<a class="btn primary" href="#" data-demo data-con-plan>Pedir mi demo con este plan</a>
</aside></div>'''

def extras_cards(cls="extras x4"):
    cards = "".join(f'''<a class="extra xp rv" href="{e['page']}"><span class="tg">Extra · {e['sub']}</span><h3>{e['name']}</h3><b class="xprice">{precio_extra(e)}</b>
<ul>{"".join(f"<li>{_html.escape(f)}</li>" for f in e["feats"])}</ul>{f'<p class="xn">{e["nota"]}</p>' if e["nota"] else ''}</a>''' for e in COMERCIAL["extras"])
    return f'<div class="{cls}">{cards}</div><p class="pfoot">Se contratan con cualquier plan. Professional incluye Bufetea Portal y Business incluye Portal y Pay. Precios orientativos, sin IVA y pendientes de validación con los costes de cada proveedor: te los confirmamos antes de contratar.</p>'

PILOTO = ('<div class="piloto rv"><span class="rk">Cómo se empieza</span><div class="pil-steps">'
          '<div><b>1 · Demo gratuita</b><span>20 minutos con datos de ejemplo y una notificación tuya, anonimizada.</span></div>'
          '<div><b>2 · Piloto de 30 días con tus datos</b><span>Pagas el primer mes de tu plan y lo dejamos funcionando con tus asuntos.</span></div>'
          '<div><b>3 · Decides</b><span>Si sigues, el piloto cuenta como tu primer mes. Si no, no pagas nada más. Sin permanencia.</span></div>'
          '</div></div>')

FOUNDER = '''<div class="founder rv" data-founder><div class="f-top"><div class="f-num"><b data-seats>50</b><span>plazas</span></div><div class="f-txt"><b>Programa fundador Bufetea: las primeras 50 incorporaciones.</b> Puesta en marcha incluida, formación del equipo, acompañamiento inicial, el precio que contrates congelado durante 12 meses y un canal prioritario para darnos tu opinión. Cuando se cubran las plazas, el programa termina.</div></div>
<div class="seats50" data-seatgrid aria-hidden="true">''' + "<i></i>" * 50 + '''</div>
<div class="f-foot"><span data-seats-txt>Programa fundador: primeras 50 incorporaciones</span><span class="live"><i></i>En directo</span></div></div>'''

def extras_mini():
    cards = "".join(f'''<a class="extra rv" href="{e['page']}"><span class="tg">Extra · {e['sub']}</span><h3>{e['name']}</h3><b class="xprice">{precio_extra(e)}</b><p>{_html.escape(e['feats'][0])}{', ' + _html.escape(e['feats'][1][0].lower() + e['feats'][1][1:]) if len(e['feats']) > 1 else ''}.</p></a>''' for e in COMERCIAL["extras"])
    return f'<div class="extras x4">{cards}</div>'

V = EX["voice"]
FAQ_PRINCIPAL = [
 ("¿Tengo que cambiar mi programa de gestión?", "No. Bufetea no es otro programa de gestión: es la capa que mantiene informados a tus clientes y funciona junto a la herramienta que ya usas. Tus asuntos, plazos y facturación siguen donde están."),
 ("¿Funciona sin integración?", "Sí. En modo independiente reenvías el PDF de la notificación, Bufetea la procesa, prepara la explicación para el cliente, tú la revisas y sale por WhatsApp o email. Algunas funciones, como la lectura automática de asuntos, clientes y agenda, necesitan la integración o una carga inicial de datos."),
 ("¿Cómo puedo saber si mi programa es compatible?", "Escríbenos qué programa usas al pedir la demo. No todos los programas permiten las mismas operaciones: revisamos el tuyo y te decimos qué es posible antes de contratar. Si no se puede integrar, trabajas en modo independiente."),
 ("¿Qué diferencia hay entre los tres planes?", f"Las funciones principales son las mismas. Cambian los asuntos activos incluidos ({S['incl']}, {P['incl']} y {B['incl']}), el precio por asunto adicional y lo que viene incluido: {P['name']} incluye Bufetea Portal y soporte prioritario; {B['name']} añade Bufetea Pay y acompañamiento en la puesta en marcha. {S['name']} cuesta {eu(S['mes'])}/mes, {P['name']} {eu(P['mes'])}/mes y {B['name']} {eu(B['mes'])}/mes, sin IVA."),
 ("¿Qué se considera un asunto activo?", COMERCIAL["asunto_activo"]),
 ("¿Pago por cada abogado?", "No. Los tres planes incluyen usuarios ilimitados: todo el equipo del despacho, sin pagar por usuario."),
 ("¿Qué ocurre si supero los asuntos incluidos?", f"Pagas solo los asuntos activos adicionales: {eu(S['exceso'], 2)} al mes en {S['name']}, {eu(P['exceso'], 2)} en {P['name']} y {eu(B['exceso'], 2)} en {B['name']}. Por ejemplo, con 180 asuntos en {P['name']}: {eu(P['mes'])} + 30 × {eu(P['exceso'], 2)} = {eu(P['mes'] + 30 * P['exceso'], 2)} al mes. La calculadora te dice qué plan te sale más económico."),
 ("¿Puedo contratar los extras por separado?", f"Sí. Bufetea Voice, Portal, Docs y Pay se contratan con cualquier plan. {P['name']} ya incluye Portal y {B['name']} incluye Portal y Pay. Sus precios son orientativos (desde {eu(EXTRAS_MIN)}/mes) y te los confirmamos antes de contratar."),
 ("¿Cuánto cuesta Bufetea Voice?", f"Desde {eu(V['precio'])}/mes, precio orientativo pendiente de validación. Los minutos incluidos dependen del uso de tu despacho y te los confirmamos antes de contratar, igual que la tarifa de los consumos adicionales."),
 ("¿La demo tiene coste?", "No. La demo de 20 minutos es gratuita y sin compromiso: te enseñamos Bufetea con datos de ejemplo y con una notificación tuya, anonimizada."),
 ("¿Cómo funciona el piloto de 30 días?", "Después de la demo, si quieres probar Bufetea con tus asuntos reales, empiezas un piloto de 30 días: pagas el primer mes de tu plan, configuramos la conexión y tus reglas y lo usas con tus clientes. Si continúas, ese pago cuenta como tu primer mes. Si no, no pagas nada más. Para los 50 primeros despachos, la puesta en marcha está incluida."),
 ("¿Puedo cancelar cuando quiera?", "Sí. No hay permanencia: te das de baja cuando quieras, te devolvemos tus datos y después se eliminan de forma segura."),
 ("¿Hay pago anual?", f"Sí. Pagando el año completo tienes {COMERCIAL['anual_meses_gratis']} meses gratis: {eu(S['anio'])}, {eu(P['anio'])} o {eu(B['anio'])} al año. Los asuntos adicionales y los extras se facturan cada mes."),
 ("¿Cómo se protegen los datos?", "Tu despacho es el responsable y Bufetea el encargado del tratamiento, con contrato del artículo 28. Servidores en la UE, cada despacho aislado, control de acceso por usuario y verificación de identidad del cliente antes de hablar de su asunto."),
 ("¿La IA puede enviar información incorrecta?", "Las explicaciones de las notificaciones no salen solas: ves lo que dice el juzgado y el mensaje propuesto lado a lado, y lo corriges antes de enviarlo. Lo automático solo repite lo que ya aprobaste, y Bufetea no da asesoramiento jurídico ni pronósticos."),
 ("¿Qué mensajes necesitan aprobación?", "Tú lo decides. Por defecto, todo lo que explica una novedad del juzgado espera tu visto bueno. Los recordatorios de cita y la respuesta al «¿cómo va lo mío?» con lo ya aprobado pueden salir solos si los activas."),
 ("¿Cuánto tarda la puesta en marcha?", "En modo independiente puedes empezar a reenviar notificaciones el mismo día. Si hay integración, el plazo depende de tu programa y te lo concretamos en la demo. Para los 50 primeros despachos, la puesta en marcha y la formación están incluidas."),
 ("¿Y si mi cliente no habla español o no usa WhatsApp?", "Le llega el mismo mensaje aprobado en su idioma (inglés, rumano, francés, árabe, chino y más) y, si no usa WhatsApp, por email. Lo eliges en su ficha."),
 ("¿Atiende también a clientes nuevos?", "Sí. Las consultas nuevas que llegan por WhatsApp (o por teléfono, con Bufetea Voice) se recogen a cualquier hora: Bufetea resume el caso y propone cita. Nunca da asesoramiento jurídico."),
 ("¿Bufetea tiene certificación ISO?", "Todavía no como empresa. Nuestra infraestructura (Supabase) tiene ISO 27001 y SOC 2 Tipo 2, y nuestro proveedor de IA (Anthropic) tiene ISO/IEC 42001. Nuestro objetivo es certificar Bufetea en ISO 27001 e ISO/IEC 42001."),
 ("¿Mis clientes sabrán que es una IA?", "Sí, siempre. Los mensajes indican que se redactaron con ayuda de IA y que los aprobó su abogado, y el asistente se presenta como tal, como exige el Reglamento europeo de IA."),
]
