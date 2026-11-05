/* Bufetea · web v3 */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SB_URL = "https://vblceecvhdhdxqtodvmg.supabase.co";
  var SB_KEY = "sb_publishable_6kaNZc5ASYBotWzYzQ1PsQ_O_AuGzTQ";
  /* medición del test A/B: visitas, clics y formularios por variante */
  function variante() { var v = window.__bufeteaVariante; if (!v) { try { v = localStorage.getItem("bufetea_ab"); } catch (e) {} } return v === "a" || v === "b" ? v : null; }
  var SES = null; try { SES = sessionStorage.getItem("bufetea_ses"); } catch (e) {}
  if (!SES) { try { SES = crypto.randomUUID(); } catch (e) { SES = "10000000-1000-4000-8000-100000000000".replace(/[018]/g, function (c) { return (c ^ Math.random() * 16 >> c / 4).toString(16); }); } try { sessionStorage.setItem("bufetea_ses", SES); } catch (e) {} }
  var hechos = {};
  function evento(ev) {
    if (hechos[ev]) return; hechos[ev] = 1;
    try { fetch(SB_URL + "/rest/v1/eventos_web", { method: "POST", keepalive: true, headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ sesion: SES, variante: variante(), evento: ev, pagina: location.pathname.split("/").pop() || "index.html" }) }).catch(function () {}); } catch (e) {}
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function eur(n, d) {
    d = d == null ? 2 : d; var s = Math.abs(n).toFixed(d).split("."), ent = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (n < 0 ? "-" : "") + ent + (d ? "," + s[1] : "") + " €";
  }
  function visible(el, cb, th) {
    if (!("IntersectionObserver" in window)) { cb(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(); } }); }, { threshold: th || 0.3 });
    io.observe(el);
  }

  evento("vista");
  document.addEventListener("click", function (e) { if (e.target.closest("[data-demo]")) evento("clic_demo"); }, true);
  $$("[data-hoy]").forEach(function (el) { try { var t = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }); el.textContent = t.charAt(0).toUpperCase() + t.slice(1); } catch (e) {} });
  /* cabecera y menú */
  var top = $("[data-top]");
  function onScroll() { if (top) top.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  var mb = $(".menu-btn"), nav = $("#nav");
  if (mb && nav) {
    mb.addEventListener("click", function () { var o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", o); mb.textContent = o ? "Cerrar" : "Menú"; });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); mb.textContent = "Menú"; }); });
  }

  /* aparición */
  var rvs = $$(".rv");
  if ("IntersectionObserver" in window && !RM) {
    var rio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    rvs.forEach(function (el) { rio.observe(el); });
  } else rvs.forEach(function (el) { el.classList.add("in"); });

  /* línea lateral del procedimiento */
  var pl = $("[data-procline]");
  if (pl) {
    var plSecs = $$("[data-pl]");
    pl.innerHTML = plSecs.map(function (s) { return '<a href="#' + s.id + '"><i></i><span>' + esc(s.getAttribute("data-pl")) + "</span></a>"; }).join("");
    pl.removeAttribute("aria-hidden"); pl.setAttribute("aria-label", "Secciones");
    var links = $$("a", pl);
    if ("IntersectionObserver" in window) {
      var pio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { var i = plSecs.indexOf(e.target); links.forEach(function (l, j) { l.classList.toggle("on", j === i); }); } });
      }, { rootMargin: "-45% 0px -50% 0px" });
      plSecs.forEach(function (s) { pio.observe(s); });
    }
  }

  /* traductor de la portada */
  /* #demo en la dirección abre el formulario de demo (enlace desde la demo del producto) */
  if (location.hash === "#demo") setTimeout(function () { var d = document.querySelector("[data-demo]"); if (d) d.click(); }, 300);
  var tr = $("[data-tr]");
  if (tr) {
    var N = [
      { doc: "Decreto", num: "412/2026", cli: "Lucía",
        legal: 'Se <mark>admite a trámite</mark> la demanda presentada por la representación de D.ª Lucía Martín Sáez. <mark>Dese traslado</mark> a la parte demandada, <mark>emplazándola</mark> para que la conteste en el plazo de <mark>veinte días hábiles</mark>.',
        plain: "Hola, Lucía. El juzgado ha admitido su demanda. Ahora la constructora tiene 20 días hábiles para contestar. Usted no tiene que hacer nada; le avisamos en cuanto haya novedades." },
      { doc: "Diligencia de ordenación", num: "233/2026", cli: "Andrés",
        legal: 'Se acuerda el <mark>señalamiento</mark> para la celebración del <mark>juicio verbal</mark> el día 14 de enero de 2027, a las 10:20 horas, en la <mark>Sala de Vistas n.º 3</mark>, con <mark>citación de las partes</mark>.',
        plain: "Hola, Andrés. Ya hay fecha de juicio: 14 de enero a las 10:20, en la sala 3 del juzgado. La semana antes le contamos qué llevar y cómo será. Ese día debe venir usted." },
      { doc: "Diligencia de ordenación", num: "145/2026", cli: "Rosa",
        legal: 'No constando el desalojo voluntario del inmueble, se mantiene la fecha señalada para la práctica de la <mark>diligencia de lanzamiento</mark> el día 2 de diciembre de 2026, a las 11:00 horas, debiendo la <mark>parte actora</mark> <mark>facilitar los medios</mark> necesarios para su práctica.',
        plain: "Hola, Rosa. Se mantiene el lanzamiento: el 2 de diciembre a las 11:00 recuperará su vivienda. Ese día hará falta un cerrajero; Marta le llamará esta semana para organizarlo todo." }
    ];
    var tabs = $$("[data-n]", tr), legal = $("[data-tr-legal]", tr), plain = $("[data-tr-plain]", tr), okb = $("[data-tr-ok]", tr),
      pill = $("[data-tr-pill]", tr), step = $("[data-tr-step]", tr), sent = $("[data-tr-sent]", tr);
    var cur = 0, timers = [], auto = true, started = false;
    function clear() { timers.forEach(clearTimeout); timers = []; }
    function later(f, ms) { timers.push(setTimeout(f, ms)); }
    function setPill(cls, t) { pill.className = "pill " + cls; pill.innerHTML = "<i></i>" + t; }
    function run(i) {
      clear(); cur = i; var n = N[i];
      tabs.forEach(function (b, j) { b.setAttribute("aria-pressed", String(j === i)); });
      $("[data-tr-doc]", tr).textContent = n.doc; $("[data-tr-num]", tr).textContent = n.num; $("[data-tr-cli]", tr).textContent = n.cli;
      tr.classList.remove("on", "working", "sent"); okb.classList.remove("pulse"); okb.disabled = true; okb.textContent = "Aprobar y enviar";
      legal.innerHTML = n.legal; plain.innerHTML = '<span class="cur"></span>'; setPill("warn", "Leyendo"); step.textContent = "Bufetea lo lee";
      if (RM) { tr.classList.add("on"); plain.textContent = n.plain; ready(); return; }
      later(function () { tr.classList.add("on", "working"); step.textContent = "Bufetea lo explica"; }, 500);
      later(function () {
        var k = 0, txt = n.plain;
        (function type() {
          k += 2; plain.innerHTML = esc(txt.slice(0, k)) + '<span class="cur"></span>';
          if (k < txt.length) later(type, 22); else { plain.textContent = txt; tr.classList.remove("working"); ready(); }
        })();
      }, 1500);
    }
    function ready() {
      setPill("warn", "Por aprobar"); step.textContent = "Listo para revisar"; okb.disabled = false; okb.classList.add("pulse");
      if (auto) later(approve, 2600);
    }
    function approve() {
      clear(); okb.classList.remove("pulse"); okb.disabled = true; okb.textContent = "Enviado ✓";
      setPill("ok", "Aprobado"); step.textContent = "Enviado por WhatsApp";
      sent.innerHTML = esc(N[cur].plain) + "<small>ahora ✓✓</small>"; tr.classList.add("sent");
      if (auto) later(function () { run((cur + 1) % N.length); }, 4200);
    }
    tabs.forEach(function (b) { b.addEventListener("click", function () { auto = false; started = true; run(+b.getAttribute("data-n")); }); });
    okb.addEventListener("click", function () { auto = false; started = true; approve(); });
    visible(tr, function () { if (!started) { started = true; run(0); } }, 0.2);
    legal.innerHTML = N[0].legal; plain.textContent = N[0].plain;
  }

  /* diccionario */
  var mean = $("[data-meaning]");
  if (mean) {
    var T = JSON.parse(mean.getAttribute("data-terms")), tb = $$("[data-term]");
    function showTerm(i) {
      tb.forEach(function (b, j) { b.setAttribute("aria-pressed", String(j === i)); });
      $("[data-m-f]", mean).textContent = "«" + T[i].f + "»"; $("[data-m-t]", mean).textContent = T[i].t; $("[data-m-e]", mean).textContent = T[i].e;
      mean.classList.remove("swap"); void mean.offsetWidth; mean.classList.add("swap");
    }
    tb.forEach(function (b) { b.addEventListener("click", function () { showTerm(+b.getAttribute("data-term")); }); });
    showTerm(0);
  }

  /* tres pasos */
  var st = $("[data-steps]");
  if (st) {
    var sb = $$("[data-s]", st), sv = $$("[data-v]", st), si = 0, stT = null, stAuto = true;
    function showStep(i) {
      si = i; sb.forEach(function (b, j) { b.classList.toggle("on", j === i); b.setAttribute("aria-pressed", String(j === i)); });
      sv.forEach(function (v, j) { v.classList.toggle("on", j === i); });
      clearTimeout(stT); if (stAuto && !RM) stT = setTimeout(function () { showStep((si + 1) % sb.length); }, 6000);
    }
    sb.forEach(function (b) { b.addEventListener("click", function () { stAuto = false; showStep(+b.getAttribute("data-s")); }); });
    sb.forEach(function (b, j) { b.setAttribute("aria-pressed", String(j === 0)); });
    visible(st, function () { if (stAuto) showStep(si); }, 0.25);
  }

  /* centralita */
  var call = $("[data-call]");
  if (call) {
    var SC = [
      { who: "Lucía Martín · cliente", log: [
        ["c", "Hola, soy Lucía Martín. Llamo para saber cómo va lo mío."],
        ["s", "Hola, Lucía. Soy Sofía, la asistente virtual de Ortega y Ruiz. Para hablar de su asunto, ¿me dice su código de cliente?"],
        ["c", "Sí, es el 4821."],
        ["x", "Código verificado · Asunto 412/2026", "ok"],
        ["s", "Gracias. La última novedad, del 3 de noviembre: el juzgado admitió su demanda y la constructora tiene 20 días hábiles para contestar. Usted no tiene que hacer nada."],
        ["c", "Perfecto, muchas gracias."],
        ["x", "Llamada guardada en el asunto, con resumen", ""] ] },
      { who: "Número desconocido", log: [
        ["c", "Buenas, llamo por lo de mi hermano Javier, el del despido."],
        ["s", "Hola. Soy Sofía, la asistente virtual del despacho. Por confidencialidad solo puedo hablar de un asunto con su titular, después de verificar su identidad."],
        ["c", "Ya, pero es que él está trabajando."],
        ["s", "Lo entiendo. Puedo dejar un aviso para que Javier nos llame, o tomar su nombre y que el abogado decida si puede contactarle."],
        ["x", "No se ha dado ningún dato del asunto", "warn"],
        ["x", "Aviso creado para el abogado", ""] ] },
      { who: "Andrés Molina · cliente", log: [
        ["c", "Soy Andrés, código 7310. Oiga, ¿usted cree que vamos a ganar el juicio?"],
        ["x", "Código verificado · Asunto 233/2026", "ok"],
        ["s", "Esa valoración solo puede hacerla su abogada, Elena Ortega. Lo que sí le puedo decir es que el juicio es el 14 de enero a las 10:20, en la sala 3."],
        ["s", "¿Quiere que le pida a Elena que le llame para hablarlo?"],
        ["c", "Sí, por favor."],
        ["x", "Petición de llamada para Elena Ortega", ""] ] },
      { who: "Raúl Ortiz · cliente nuevo", log: [
        ["c", "Hola, me acaban de despedir esta mañana y no sé qué hacer."],
        ["s", "Siento mucho lo que me cuenta. Soy Sofía, la asistente virtual del despacho. No puedo darle consejo jurídico, pero sí tomar sus datos para que un abogado le llame."],
        ["s", "En un despido hay un plazo corto para actuar, así que lo marco como urgente. ¿Qué día le entregaron la carta?"],
        ["c", "Hoy mismo."],
        ["x", "Consulta urgente · despido · aviso al abogado de guardia", "warn"],
        ["x", "Cita propuesta: mañana a las 9:30", "ok"] ] }
    ];
    var cb = $$("[data-c]", call), pc = $("[data-pc]", call), log = $("[data-pc-log]", call), tm = $("[data-pc-t]", call), whoEl = $("[data-pc-who]", call),
      bars = $$(".wave i", call), ct = [], tick = null, wave = null, secs = 0, callStarted = false;
    function stopAll() { ct.forEach(clearTimeout); ct = []; clearInterval(tick); clearInterval(wave); pc.classList.remove("talking"); bars.forEach(function (b) { b.style.height = "20%"; }); }
    function talk(on) {
      clearInterval(wave); pc.classList.toggle("talking", on);
      if (on && !RM) wave = setInterval(function () { bars.forEach(function (b) { b.style.height = (15 + Math.random() * 85) + "%"; }); }, 120);
      else bars.forEach(function (b) { b.style.height = "20%"; });
    }
    function play(i) {
      stopAll(); log.innerHTML = ""; secs = 0; tm.textContent = "00:00";
      cb.forEach(function (b, j) { b.setAttribute("aria-pressed", String(j === i)); });
      whoEl.textContent = SC[i].who;
      tick = setInterval(function () { secs++; tm.textContent = ("0" + Math.floor(secs / 60)).slice(-2) + ":" + ("0" + secs % 60).slice(-2); }, 1000);
      var t = 300;
      SC[i].log.forEach(function (l, k) {
        ct.push(setTimeout(function () {
          var d = document.createElement("div");
          if (l[0] === "x") { d.className = "sys " + l[2]; d.textContent = l[1]; talk(false); }
          else { d.className = "m" + (l[0] === "s" ? " s" : ""); d.innerHTML = "<small>" + (l[0] === "s" ? "Sofía · IA" : "Llamante") + "</small><p>" + esc(l[1]) + "</p>"; talk(l[0] === "s"); }
          log.appendChild(d);
          if (k === SC[i].log.length - 1) ct.push(setTimeout(function () { talk(false); clearInterval(tick); }, 900));
        }, RM ? 0 : t));
        t += l[0] === "x" ? 900 : Math.min(3600, 900 + l[1].length * 28);
      });
    }
    cb.forEach(function (b) { b.addEventListener("click", function () { play(+b.getAttribute("data-c")); }); });
    visible(call, function () { if (!callStarted) { callStarted = true; play(0); } }, 0.3);
  }

  /* WhatsApp */
  var wa = $("[data-wa]");
  if (wa) {
    var W = [
      { n: "Lucía Martín", tag: "Asunto 412/2026 · Civil", prev: "¿Y cuándo sería el juicio?", cnt: 1, m: [
        ["o", "El juzgado ha admitido su demanda. La constructora tiene 20 días hábiles para contestar.", "09:16"],
        ["i", "Muchas gracias. ¿Y cuándo sería el juicio?", "11:02"]],
        sug: "Todavía no hay fecha, Lucía. Cuando el juzgado la fije, se la contamos en el momento." },
      { n: "Grupo Huertas, S.L.", tag: "Apelación 517/2025 · Civil", prev: "📎 burofax_proveedor.jpg", cnt: 2, m: [
        ["i", "Buenos días, nos ha llegado esto del proveedor.", "08:41"],
        ["i", "📎 burofax_proveedor.jpg", "08:41"],
        ["t", "Guardado en el asunto 517/2025"]],
        sug: "Recibido, gracias. Lo revisa hoy Javier Ruiz y les decimos si hay que responder y en qué plazo." },
      { n: "Ioana Popescu", tag: "Extranjería · rumano", prev: "🎤 Nota de voz (0:42)", cnt: 1, m: [
        ["i", "🎤 Nota de voz · 0:42", "19:20"],
        ["t", "Transcrita: «Me piden un certificado de empadronamiento, ¿lo tengo que llevar yo?»"]],
        sug: "Bună, Ioana. Da, vă rugăm să ni-l trimiteți aici, pe WhatsApp, și îl adăugăm noi la dosar. (Se envía en rumano; tú lo ves en español)." },
      { n: "+34 6•• ••• 902", tag: "Cliente nuevo", prev: "Hola, tengo un problema con mi casero", cnt: 0, m: [
        ["i", "Hola, tengo un problema con mi casero, no me devuelve la fianza.", "22:05"],
        ["o", "Hola. Soy el asistente virtual del despacho. ¿Me cuenta cuándo dejó el piso y cuánto era la fianza?", "22:05"],
        ["i", "En septiembre, 1.200 €.", "22:07"]],
        sug: "Gracias. Le proponemos una cita con un abogado el jueves a las 17:00. ¿Le viene bien?" }
    ];
    var list = $(".wa-list", wa), msgs = $("[data-wa-msgs]", wa), sug = $("[data-wa-sug]", wa), send = $("[data-wa-send]", wa), wi = 0;
    list.innerHTML = W.map(function (c, i) {
      return '<button type="button" role="option" aria-selected="' + (i === 0) + '" data-w="' + i + '"><b>' + esc(c.n) + (c.cnt ? '<span class="cnt">' + c.cnt + "</span>" : "") + "</b><span>" + esc(c.prev) + "</span></button>";
    }).join("");
    function showWa(i) {
      wi = i; var c = W[i];
      $$("[data-w]", list).forEach(function (b, j) { b.setAttribute("aria-selected", String(j === i)); });
      $("[data-wa-name]", wa).textContent = c.n; var tg = $("[data-wa-tag]", wa); tg.innerHTML = "<i></i>" + esc(c.tag);
      msgs.innerHTML = c.m.map(function (m) {
        return m[0] === "t" ? '<span class="tagx">' + esc(m[1]) + "</span>" : '<div class="mm' + (m[0] === "o" ? " o" : "") + '">' + esc(m[1]) + "<small>" + m[2] + "</small></div>";
      }).join("");
      sug.textContent = c.sug; send.disabled = false; send.textContent = "Enviar";
    }
    list.addEventListener("click", function (e) { var b = e.target.closest("[data-w]"); if (b) showWa(+b.getAttribute("data-w")); });
    send.addEventListener("click", function () {
      var d = document.createElement("div"); d.className = "mm o"; d.innerHTML = esc(W[wi].sug) + "<small>ahora ✓✓</small>"; msgs.appendChild(d);
      send.disabled = true; send.textContent = "Enviado";
      var cnt = $('[data-w="' + wi + '"] .cnt', list); if (cnt) cnt.remove();
    });
    showWa(0);
  }

  /* rangos: relleno */
  function fill(r) { var p = (r.value - r.min) / (r.max - r.min) * 100; r.style.setProperty("--p", p + "%"); }
  $$('input[type="range"]').forEach(function (r) { fill(r); r.addEventListener("input", function () { fill(r); }); });

  /* calculadora */
  var calc = $("[data-calc]");
  if (calc) {
    var ci = {}; $$("[data-i]", calc).forEach(function (r) { ci[r.getAttribute("data-i")] = r; });
    var pct = 0.5, escB = $$("[data-esc]", calc);
    escB.forEach(function (b) { b.addEventListener("click", function () { pct = +b.getAttribute("data-esc"); escB.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); calcUp(); }); });
    function nf(x, d) { return x.toLocaleString("es-ES", { maximumFractionDigits: d }); }
    function calcUp() {
      var ll = +ci.ll.value, mi = +ci.mi.value, eh = +ci.eh.value;
      $('[data-o="ll"]', calc).textContent = ll; $('[data-o="mi"]', calc).textContent = mi; $('[data-o="eh"]', calc).textContent = eh + " €";
      var h = ll * mi * 4.33 / 60, e = h * eh, rh = h * pct, re = e * pct;
      $('[data-r="h"]', calc).textContent = nf(h, 1) + " h";
      $('[data-r="e"]', calc).textContent = eur(Math.round(e), 0);
      $('[data-r="rh"]', calc).textContent = nf(rh, 1) + " h";
      $('[data-r="pct"]', calc).textContent = Math.round(pct * 100) + " %";
      $('[data-r="re"]', calc).textContent = "≈ " + eur(Math.round(re), 0) + " de tu tiempo";
      var base0 = +(calc.getAttribute("data-base") || 49), dif = Math.round(re) - base0;
      $('[data-r="ah"]', calc).textContent = (dif > 0 ? "+" : dif < 0 ? "−" : "") + eur(Math.abs(dif), 0);
      $('[data-r="ah"]', calc).closest("div").classList.toggle("neg", dif <= 0);
      $('[data-r="vs"]', calc).textContent = dif > 0
        ? "Si Bufetea resolviera el " + Math.round(pct * 100) + " % de estas consultas, podrías recuperar unas " + nf(rh, 1).replace(".", ",") + " horas al mes. Su valor (" + eur(Math.round(re), 0) + ") superaría en " + eur(dif, 0) + " el coste del plan " + "de entrada."
        : "Con estos números, el tiempo recuperable no cubre por sí solo la cuota. El valor estaría sobre todo en que tus clientes estén informados sin que tengas que acordarte de avisarles.";
    }
    Object.keys(ci).forEach(function (k) { ci[k].addEventListener("input", calcUp); }); calcUp();
  }

  /* índice */
  var g = $("[data-gauge]");
  if (g && !RM) { $("[data-g-arc]", g).style.strokeDashoffset = "314.16"; $("[data-g-txt]", g).textContent = "0 %"; }
  if (g) visible(g, function () {
    var arc = $("[data-g-arc]", g), txt = $("[data-g-txt]", g), v = 92;
    arc.style.strokeDashoffset = String(314.16 * (1 - v / 100));
    if (RM) { txt.textContent = v + " %"; return; }
    var t0 = performance.now(); (function anim(t) { var k = Math.min(1, (t - t0) / 1600); txt.textContent = Math.round(v * (1 - Math.pow(1 - k, 3))) + " %"; if (k < 1) requestAnimationFrame(anim); })(t0);
  }, 0.4);

  /* precios: planes, forma de pago y calculadora (datos de comercial.py vía data-precios) */
  var PRE = null, preEl = $("[data-precios]");
  try { if (preEl) PRE = JSON.parse(preEl.getAttribute("data-precios")); } catch (e) { PRE = null; }
  var BILL = "mes";
  function eur2(v) { return eur(v); }
  function costePlan(p, n, bill, exIds) {
    var extra = Math.max(0, n - p.incl), base = bill === "anio" ? p.anio / 12 : p.mes, exs = 0;
    (exIds || []).forEach(function (id) { if ((p.incluye || []).indexOf(id) < 0) PRE.extras.forEach(function (x) { if (x.id === id) exs += x.precio; }); });
    return { extra: extra, base: base, add: extra * p.exceso, total: base + extra * p.exceso, exs: exs, todo: base + extra * p.exceso + exs };
  }
  function pintaBill() {
    $$("[data-bill]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-bill") === BILL)); });
    if (!PRE) return;
    PRE.plans.forEach(function (p) {
      var pm = $('[data-pm="' + p.id + '"]'), pu = $('[data-pu="' + p.id + '"]'), pa = $('[data-pa="' + p.id + '"]');
      $$('[data-pm="' + p.id + '"]').forEach(function (el) { el.textContent = BILL === "anio" ? eur(p.anio, 0) : eur(p.mes, 0); });
      $$('[data-pu="' + p.id + '"]').forEach(function (el) { el.textContent = BILL === "anio" ? "/año" : "/mes"; });
      $$('[data-pa="' + p.id + '"]').forEach(function (el) { el.textContent = el.getAttribute(BILL === "anio" ? "data-anio" : "data-mes"); });
    });
    document.dispatchEvent(new Event("bufetea:bill"));
  }
  document.addEventListener("click", function (e) { var b = e.target.closest("[data-bill]"); if (!b) return; BILL = b.getAttribute("data-bill"); pintaBill(); });

  $$("[data-cfg]").forEach(function (cfg) {
    if (!PRE) return;
    var a = $("[data-a]", cfg), ao = $("[data-ao]", cfg), lines = $("[data-lines]", cfg), tot = $("[data-total]", cfg), per = $("[data-per]", cfg),
      best = $("[data-best]", cfg), mods = $$("[data-mod]", cfg), pbs = $$("[data-cplan]", cfg), shown = 0, raf = null;
    var plan = (PRE.plans.filter(function (p) { return pbs.some(function (b) { return b.getAttribute("data-cplan") === p.id && b.getAttribute("aria-pressed") === "true"; }); })[0] || PRE.plans[0]).id;
    function animTo(v, pre) {
      cancelAnimationFrame(raf); var from = shown, t0 = performance.now();
      if (RM) { shown = v; tot.textContent = pre + eur(v); return; }
      (function f(t) { var k = Math.min(1, (t - t0) / 380); shown = from + (v - from) * (1 - Math.pow(1 - k, 3)); tot.textContent = pre + eur(shown); if (k < 1) raf = requestAnimationFrame(f); else shown = v; })(t0);
    }
    function li(a1, b1, cls) { return '<li' + (cls ? ' class="' + cls + '"' : '') + '><span>' + a1 + '</span><span>' + b1 + '</span></li>'; }
    function up() {
      var n = +a.value, p = PRE.plans.filter(function (x) { return x.id === plan; })[0], inc = p.incluye || [];
      ao.textContent = n.toLocaleString("es-ES");
      pbs.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-cplan") === plan)); });
      mods.forEach(function (m) {
        var id = m.getAttribute("data-mod"), en = inc.indexOf(id) > -1, tag = $('[data-mod-tag="' + id + '"]', cfg);
        if (en) { if (!m.disabled) m.setAttribute("data-user", m.checked ? "1" : "0"); m.checked = true; m.disabled = true; }
        else if (m.disabled) { m.disabled = false; m.checked = m.getAttribute("data-user") === "1"; }
        if (tag) tag.textContent = en ? "Incluido" : "Extra";
        m.closest(".mod").classList.toggle("inc", en);
      });
      var ids = mods.filter(function (m) { return m.disabled ? m.getAttribute("data-user") === "1" : m.checked; }).map(function (m) { return m.getAttribute("data-mod"); });
      var c = costePlan(p, n, BILL, ids);
      var sel = PRE.extras.filter(function (x) { return ids.indexOf(x.id) > -1 || inc.indexOf(x.id) > -1; });
      var pag = sel.filter(function (x) { return inc.indexOf(x.id) < 0; }), desde = pag.some(function (x) { return x.desde; });
      var h = li("Plan seleccionado", "<b>" + esc(p.name) + "</b> · " + (BILL === "anio" ? "anual" : "mensual"));
      h += li("Asuntos incluidos", String(p.incl));
      h += li("Asuntos adicionales", String(c.extra));
      h += li("Precio base", BILL === "anio" ? eur(c.base) + "/mes <small>(" + eur(p.anio, 0) + " al año)</small>" : eur(c.base) + "/mes");
      h += li("Importe adicional", c.extra ? c.extra + " × " + eur(p.exceso) + " = " + eur(c.add) : eur(0));
      h += li("Total mensual del plan", "<b>" + eur(c.total) + "</b>", "sub");
      h += li("Extras seleccionados", sel.length ? sel.map(function (x) { return esc(x.name) + " " + (inc.indexOf(x.id) > -1 ? "incluido" : (x.desde ? "desde " : "") + eur(x.precio, 0)); }).join("<br>") : "Ninguno");
      lines.innerHTML = h;
      animTo(c.todo, desde ? "desde " : "");
      per.textContent = (BILL === "anio" ? "Con pago anual, los asuntos adicionales y los extras se facturan cada mes. " : "") + (pag.length ? "Los precios de los extras son orientativos y se confirman antes de contratar." : "");
      var costes = PRE.plans.map(function (x) { return { p: x, t: costePlan(x, n, BILL, ids).todo }; }).sort(function (x, y) { return x.t - y.t; });
      var mejor = costes[0], actual = costes.filter(function (x) { return x.p.id === plan; })[0];
      best.innerHTML = (mejor.p.id === plan || mejor.t >= actual.t - 0.001) ? "Con " + n.toLocaleString("es-ES") + " asuntos" + (ids.length ? " y estos extras" : "") + ", " + esc(p.name) + " es el plan más económico." :
        "Con " + n.toLocaleString("es-ES") + " asuntos" + (ids.length ? " y estos extras" : "") + ", " + esc(mejor.p.name) + " te sale más económico (" + eur(mejor.t) + "/mes). " + '<button type="button" class="lnkbtn" data-cambia="' + mejor.p.id + '">Cambiar a ' + esc(mejor.p.name) + "</button>";
      var btn = $("[data-con-plan]", cfg);
      if (btn) btn.setAttribute("data-plan", p.name + " · " + (BILL === "anio" ? "anual" : "mensual") + " · " + n + " asuntos" + (pag.length ? " + " + pag.map(function (x) { return x.name; }).join(", ") : ""));
    }
    a.addEventListener("input", up); mods.forEach(function (m) { m.addEventListener("change", up); });
    pbs.forEach(function (b) { b.addEventListener("click", function () { plan = b.getAttribute("data-cplan"); up(); }); });
    cfg.addEventListener("click", function (e) { var c = e.target.closest("[data-cambia]"); if (c) { plan = c.getAttribute("data-cambia"); up(); } });
    document.addEventListener("bufetea:bill", up);
    up();
  });
  pintaBill();

  /* preguntas */
  $$("[data-faq-q]").forEach(function (q) {
    var box = q.closest(".faq-w").querySelector("[data-faqs]"), items = $$("details", box), none = document.createElement("p");
    none.className = "faq-none"; none.hidden = true; none.textContent = "No hay preguntas con esas palabras. Escríbenos en la demo y te lo contamos."; box.appendChild(none);
    function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
    q.addEventListener("input", function () {
      var w = norm(q.value.trim()).split(/\s+/).filter(Boolean), n = 0;
      items.forEach(function (d) { var ok = !w.length || w.every(function (x) { return norm(d.textContent).indexOf(x) > -1; }); d.hidden = !ok; if (ok) n++; if (w.length && ok) d.open = true; if (!w.length) d.open = false; });
      none.hidden = n > 0;
    });
  });

  /* demo y vídeo */
  var dm = $("#dmodal"), vm = $("#vmodal"), lastFocus = null;
  function openM(m) { lastFocus = document.activeElement; m.hidden = false; document.body.style.overflow = "hidden"; var f = m.querySelector("input,button,video"); if (f) setTimeout(function () { if (!m.contains(document.activeElement)) f.focus(); }, 50); }
  function closeM(m) { m.hidden = true; document.body.style.overflow = ""; var v = m.querySelector("video"); if (v) v.pause(); if (lastFocus) lastFocus.focus(); }
  document.addEventListener("click", function (e) {
    var d = e.target.closest("[data-demo]");
    if (d && dm) {
      e.preventDefault();
      $('[data-dpaso="form"]', dm).hidden = false; $('[data-dpaso="ok"]', dm).hidden = true;
      $("#d-plan").value = d.getAttribute("data-plan") || "";
      var ps = $("[data-plan-sel]", dm), pn = d.getAttribute("data-plan");
      if (ps) { ps.hidden = !pn; ps.textContent = pn ? "Has elegido " + pn + ". Primero, una demo gratuita de 20 minutos con tus casos. Si te convence, empiezas con un piloto de 30 días que cuenta como tu primer mes." : ""; }
      $("#d-status").textContent = ""; $("#d-status").className = "fstatus";
      openM(dm); return;
    }
    var v = e.target.closest("[data-video]");
    if (v && vm) { e.preventDefault(); openM(vm); var vid = vm.querySelector("video"); try { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (x) {} return; }
    if (e.target.closest("[data-close]") || e.target === dm) { closeM(dm); return; }
    if (e.target.closest("[data-vclose]") || e.target === vm) closeM(vm);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (dm && !dm.hidden) closeM(dm); if (vm && !vm.hidden) closeM(vm); } });

  var form = $("#f-demo");
  if (form) {
    var pasos = $$("[data-paso]", form), dots = $$("[data-dot]", dm), barra = $("[data-regbar]", dm), atras = $("[data-atras]", form),
      saltar = $("[data-saltar]", form), enviar = $("#d-enviar"), st = $("#d-status"), paso = 0, ref = null, nombre1 = "";
    function uuid() { try { return crypto.randomUUID(); } catch (e) { return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, function (c) { return (c ^ Math.random() * 16 >> c / 4).toString(16); }); } }
    var H = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" };
    $$("[data-chips]", form).forEach(function (g) {
      var multi = g.hasAttribute("data-multi");
      g.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        if (multi) b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
        else $$("button", g).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b && x.getAttribute("aria-pressed") !== "true")); });
      });
    });
    function val(name) { return $$('[data-chips="' + name + '"] [aria-pressed="true"]', form).map(function (b) { return b.getAttribute("data-v"); }); }
    function one(name) { var v = val(name); return v.length ? v[0] : null; }
    function limpia() { st.textContent = ""; st.className = "fstatus"; }
    function ir(n) {
      paso = n; pasos.forEach(function (f, k) { f.hidden = k !== n; });
      dots.forEach(function (d, k) { d.classList.toggle("on", k <= n); });
      barra.style.width = ((n + 1) / pasos.length * 100) + "%";
      atras.hidden = true; saltar.hidden = n === 0;
      enviar.textContent = n === 0 ? "Pedir mi demo personalizada" : n === pasos.length - 1 ? "Enviar y terminar" : "Continuar";
      limpia();
      var f = pasos[n].querySelector("input,button"); if (f) setTimeout(function () { var a = document.activeElement; if (!(a && pasos[n].contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) f.focus(); }, 30);
      var sh = $(".reg-main", dm); if (sh) sh.scrollTop = 0;
    }
    function fin(primera) {
      var av0 = $("[data-ok-aviso]", dm); if (av0) av0.hidden = true;
      var mas = $("[data-ok-mas]", dm); if (mas) mas.hidden = !primera;
      $("[data-ok-nombre]", dm).textContent = nombre1;
      $('[data-dpaso="form"]', dm).hidden = true; $('[data-dpaso="ok"]', dm).hidden = false;
    }
    window.__bufeteaDemoReset = function () { form.reset(); ref = null; $$("[data-chips] button", form).forEach(function (b) { b.setAttribute("aria-pressed", "false"); }); ir(0); };
    document.addEventListener("click", function (e) { if (e.target.closest("[data-demo]")) window.__bufeteaDemoReset(); }, true);
    atras.addEventListener("click", function () { ir(Math.max(1, paso - 1)); });
    saltar.addEventListener("click", function () { fin(false); });
    var bm = $("[data-mas]", dm); if (bm) bm.addEventListener("click", function () { $('[data-dpaso="ok"]', dm).hidden = true; $('[data-dpaso="form"]', dm).hidden = false; ir(1); });
    var empezado = false;
    form.addEventListener("input", function () { if (!empezado) { empezado = true; evento("form_inicio"); } if (st.classList.contains("err")) limpia(); });
    form.addEventListener("change", function () { if (st.classList.contains("err")) limpia(); });
    function falla(msg, el) { st.className = "fstatus err"; st.textContent = msg; if (el) el.focus(); }
    function espera(on, txt) { enviar.disabled = on; if (txt) enviar.textContent = txt; }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (paso === 0) {
        var nom = $("#d-nombre"), mov = $("#d-movil"), em = $("#d-email");
        if (nom.value.trim().length < 2) return falla("Escribe tu nombre.", nom);
        if (mov.value.replace(/\D/g, "").length < 9) return falla("Revisa el móvil: necesitamos al menos 9 cifras.", mov);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) return falla("Revisa el email.", em);
        if (!$("#d-acepto").checked) return falla("Para enviarlo, acepta la política de privacidad.", $("#d-acepto"));
        ref = uuid(); nombre1 = nom.value.trim().split(" ")[0];
        var d0 = { ref: ref, nombre: nom.value.trim(), movil: mov.value.trim(), email: em.value.trim(), acepta_privacidad: true,
          plan: $("#d-plan").value || null, variante: variante(), origen: location.pathname.split("/").pop() || "index.html" };
        espera(true, "Enviando…");
        fetch(SB_URL + "/rest/v1/solicitudes_demo", { method: "POST", headers: H, body: JSON.stringify(d0) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); espera(false); evento("lead"); fin(true); })
          .catch(function () { espera(false, "Pedir mi demo personalizada"); falla("No hemos podido enviarlo. Inténtalo de nuevo en un momento."); });
        return;
      }
      if (paso < pasos.length - 1) { ir(paso + 1); return; }
      var d = { despacho: $("#d-despacho").value.trim(), tamano: one("tamano"), asuntos: one("asuntos"), programa: $("#d-programa").value.trim(), intereses: val("intereses"), cuando: one("cuando") };
      Object.keys(d).forEach(function (k) { if (d[k] === "") d[k] = null; });
      espera(true, "Enviando…");
      fetch(SB_URL + "/rest/v1/rpc/completar_solicitud_demo", { method: "POST", headers: H, body: JSON.stringify({ p_ref: ref, d: d }) })
        .then(function (r) { if (!r.ok) throw 0; fin(false); evento("completo"); }).catch(function () { fin(false); var av = $("[data-ok-aviso]", dm); if (av) av.hidden = false; })
        .then(function () { espera(false, "Enviar y terminar"); });
    });
    ir(0);
    var qf = $("[data-qform]");
    if (qf) qf.addEventListener("submit", function (e) {
      e.preventDefault();
      var qn = $("#q-nombre", qf), qe = $("#q-email", qf), qm = $("#q-movil", qf);
      var trig = $("[data-demo]"); if (trig) trig.click();
      $("#d-nombre").value = qn.value.trim(); $("#d-email").value = qe.value.trim(); $("#d-movil").value = qm.value.trim();
      var foco = !qn.value.trim() ? $("#d-nombre") : !qm.value.trim() ? $("#d-movil") : !qe.value.trim() ? $("#d-email") : $("#d-acepto");
      setTimeout(function () { foco.focus(); }, 80);
      if (qn.value || qe.value || qm.value) { empezado = true; evento("form_inicio"); }
    });
  }
})();
/* Bufetea · web v4 — efectos */
(function () {
  "use strict";
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var bar = document.querySelector(".progress");
  function sp() { if (!bar) return; var h = document.documentElement.scrollHeight - innerHeight; bar.style.setProperty("--sp", h > 0 ? Math.min(1, scrollY / h) : 0); }
  addEventListener("scroll", sp, { passive: true }); sp();
  if (RM || !FINE) return;
  /* foco en tarjetas */
  document.querySelectorAll(".tile, .vow, .pbox, .calc-c, .extra, .meaning, .faqs details, .scen button, .gauge, .closing").forEach(function (el) {
    el.classList.add("spot");
    el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); el.style.setProperty("--mx", (e.clientX - r.left) + "px"); el.style.setProperty("--my", (e.clientY - r.top) + "px"); });
  });
  /* luz del hero que sigue al ratón */
  var hero = document.querySelector("[data-hero]"), glow = hero && hero.querySelector(".glow");
  if (hero && glow) hero.addEventListener("pointermove", function (e) { var r = hero.getBoundingClientRect(); glow.style.setProperty("--gx", (e.clientX - r.left) + "px"); glow.style.setProperty("--gy", (e.clientY - r.top) + "px"); });
  /* inclinación 3D de las pantallas */
  document.querySelectorAll(".screen, .phone-call").forEach(function (el) {
    var max = el.classList.contains("tr") ? 5 : 3;
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = "perspective(1400px) rotateY(" + (x * max) + "deg) rotateX(" + (-y * max) + "deg)";
    });
    el.addEventListener("pointerleave", function () { el.style.transform = ""; });
  });
  /* botones magnéticos */
  document.querySelectorAll(".btn.primary:not(.sm):not(.ok-btn)").forEach(function (b) {
    b.addEventListener("pointermove", function (e) { var r = b.getBoundingClientRect(); b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * .18) + "px," + ((e.clientY - r.top - r.height / 2) * .28) + "px)"; });
    b.addEventListener("pointerleave", function () { b.style.transform = ""; });
  });
})();
/* plazas de fundador: dato real de la base de datos */
(function () {
  "use strict";
  var TOTAL = 50, URL = "https://vblceecvhdhdxqtodvmg.supabase.co/rest/v1/rpc/plazas_fundador", KEY = "sb_publishable_6kaNZc5ASYBotWzYzQ1PsQ_O_AuGzTQ";
  function pinta(ocupadas, conDato) {
    var libres = Math.max(0, TOTAL - ocupadas);
    document.documentElement.classList.toggle("seats-live", ocupadas > 0);
    if (!ocupadas) return;
    document.querySelectorAll("[data-seats]").forEach(function (e) { e.textContent = libres; });
    document.querySelectorAll("[data-seats-txt]").forEach(function (e) { e.textContent = conDato ? ocupadas + " de " + TOTAL + " plazas ocupadas" : TOTAL + " plazas para los primeros despachos"; });
    document.querySelectorAll("[data-seatbar]").forEach(function (e) { e.style.width = (ocupadas / TOTAL * 100) + "%"; });
    document.querySelectorAll("[data-seatgrid]").forEach(function (g) {
      var cells = g.querySelectorAll("i"), box = g.closest("[data-founder]");
      cells.forEach(function (c, k) { c.style.setProperty("--k", k); c.classList.remove("on", "next"); });
      function llena() {
        cells.forEach(function (c, k) { if (k < ocupadas) setTimeout(function () { c.classList.add("on"); c.style.backgroundPosition = (k / (TOTAL - 1) * 100) + "% 0"; }, k * 40); });
        if (ocupadas < TOTAL) setTimeout(function () { cells[ocupadas].classList.add("next"); }, ocupadas * 40);
        if (box) { box.classList.add("scan"); }
      }
      if ("IntersectionObserver" in window) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); llena(); } }, { threshold: .4 }); io.observe(g); } else llena();
    });
  }
  fetch(URL, { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" }, body: "{}" })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) { pinta(Math.min(TOTAL, +d.ocupadas || 0), true); })
    .catch(function () { pinta(0, false); });
})();
/* simulación de documentos recibidos */
(function () {
  "use strict";
  document.querySelectorAll("[data-dmock]").forEach(function (m) {
    var pill = m.querySelector("[data-dm-pill]");
    function cuenta() { var n = m.querySelectorAll("[data-dm]:not(.ok)").length; pill.className = "pill " + (n ? "warn" : "ok"); pill.innerHTML = "<i></i>" + (n ? n + (n === 1 ? " pendiente" : " pendientes") : "Completo"); }
    m.querySelectorAll("[data-dm] .btn").forEach(function (b) {
      b.addEventListener("click", function () { var li = b.closest("li"); li.classList.add("ok", "new"); li.querySelector("small").textContent = "Recibido por WhatsApp · ahora"; cuenta(); });
    });
  });
})();
