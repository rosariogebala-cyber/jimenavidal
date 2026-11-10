/* Promos, filtros y detalles de la landing de Jimena Vidal. La gestión está en /gestion/. */
(function () {
  var footer = document.querySelector("#footer");
  if (!footer || !footer.parentNode) return;

  /* Las promos con fecha se ocultan fuera de su período, en hora de Argentina. */
  var hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  document.querySelectorAll("#productos .prod-card[data-desde], #productos .prod-card[data-hasta]").forEach(function (card) {
    var desde = card.getAttribute("data-desde") || "";
    var hasta = card.getAttribute("data-hasta") || "";
    if ((desde && hoy < desde) || (hasta && hoy > hasta)) card.parentNode.remove();
  });

  var css = document.createElement("style");
  css.textContent = [
    "#productos .jv-stars{display:inline-flex;gap:2px;margin-left:.4em;color:#e4570a;vertical-align:middle}",
    "#productos .jv-stars i{font-size:.78em}",
    "#productos .jv-incs{display:flex;flex-wrap:wrap;gap:6px 12px;margin:0 0 10px;font-size:.86rem}",
    "#productos .jv-inc{display:inline-flex;align-items:center;gap:.3em}",
    "#productos .jv-inc i{color:#e4570a}",
    "#productos .prod-price s{opacity:.72;margin-right:.4em;font-weight:600;text-decoration:line-through}",
    "#productos .prod-sale{margin:0 0 10px;font-size:.95rem}",
    "#productos .jv-cierre{width:100vw;margin:56px 0 0 calc(50% - 50vw);background:radial-gradient(62% 130% at 90% 0%,rgba(255,186,120,.55) 0%,transparent 58%),radial-gradient(48% 120% at 0% 100%,rgba(255,120,40,.42) 0%,transparent 60%),linear-gradient(115deg,#4a1608 0%,#b8430c 55%,#e4570a 100%)}",
    "#productos .nx-pad{padding-bottom:0}",
    ":root{--jv-solape:20px}",
    "@media (min-width:992px){#hero .nx-hero-slide{padding-bottom:clamp(80px,16vh,180px)}}",
    "#productos [hidden]{display:none !important}",
    "#productos .jv-filtros{margin:20px 0 4px}",
    "#productos .jv-filtros-fila{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px}",
    "#productos .jv-filtros-grupo{display:flex;flex-wrap:wrap;gap:8px}",
    "#productos .jv-chip{border:1px solid #d9dee5;background:#fff;color:#33475b;border-radius:999px;padding:7px 14px;font-size:.88rem;font-weight:600;line-height:1.2;white-space:nowrap;cursor:pointer;transition:background .2s ease,color .2s ease,border-color .2s ease}",
    "#productos .jv-chip:hover{border-color:#e4570a;color:#e4570a}",
    "#productos .jv-chip.is-on{background:#e4570a;border-color:#e4570a;color:#fff}",
    "#productos .jv-chip:focus-visible,#productos .jv-chip-limpiar:focus-visible{outline:2px solid #0b1f38;outline-offset:2px}",
    "#productos .jv-chip-limpiar{border:0;background:none;color:#0b1f38;font-size:.88rem;font-weight:600;text-decoration:underline;text-underline-offset:3px;padding:7px 4px;cursor:pointer;white-space:nowrap}",
    "#productos .jv-filtros-vacio{margin:16px 0 0;color:#5b6b80}",
    "#productos .jv-filtros-vacio button{border:0;background:none;padding:0;color:#e4570a;font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer}",
    "#productos .jv-chip-n{margin-left:5px;font-weight:500;opacity:.55}",
    "#productos .jv-chip.is-on .jv-chip-n{opacity:.85}",
    "@media (max-width:991.98px){#productos .jv-filtros-fila{gap:8px}#productos .jv-filtros-grupo{display:contents}#productos .jv-chip{padding:6px 12px;font-size:.84rem}}",
    "@media (prefers-reduced-motion:reduce){#productos .jv-chip{transition:none}}",
    "#productos .jv-sobre-hero{position:relative;z-index:3;margin-top:calc(var(--jv-solape) * -1)}",
    "#productos .jv-sobre-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}",
    "@media (min-width:992px){#productos .jv-sobre-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}}",
    "#productos .jv-sobre-grid .prod-card{height:100%;background:transparent;box-shadow:none;border:0}",
    "#productos .jv-sobre-grid .nx-frame{box-shadow:0 -6px 18px -6px rgba(11,31,56,.35)}",
    "body.jv-con-solape #hero .carousel-indicators{margin-bottom:calc(var(--jv-solape) + 1rem)}",
    "body.jv-con-solape #hero .jv-hero-lugar{margin-bottom:var(--jv-solape)}",
    "#productos .jv-cierre h2 .em{color:#ffd7b8}",
    "#productos .jv-cierre p{color:#ffe4d0}",
    "#productos .jv-cierre .btn-nx-light{color:#c2410c;text-decoration:none}",
    "#productos .jv-cierre .foot-form-note{color:#ffd7b8}",
    "#productos .jv-cierre-side{display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px;width:100%}",
    "#productos .jv-cierre-hint{flex:0 0 100%;max-width:none;margin:0 0 -4px;color:#ffe4d0;font-size:.85rem;font-weight:600;letter-spacing:.01em}",
    "#productos .jv-cierre form{flex:1;min-width:0}",
    "#productos .jv-cierre .foot-form{width:100%}",
    "#productos .jv-wa{flex:none;width:52px;height:52px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:#25d366;color:#fff;font-size:26px;text-decoration:none}",
    "@media(max-width:767.98px){#productos .jv-cierre-side{flex-wrap:wrap}#productos .jv-cierre form{flex:1 1 220px}}",
    "#resenas-de-google .nx{background:#fff}",
    "#resenas-de-google .quote-card{background:#f4f6f8;box-shadow:0 0 0 1px #e3e7ec}",
    "@media (min-width:992px){#resenas-de-google .container > .row > .col-lg-4{order:2}}",
    "@media (min-width:992px){#resenas-de-google .container > .row{align-items:stretch !important}#resenas-de-google .col-lg-4 > .score-card{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}#resenas-de-google .row:has(.jv-resena-navs:not([hidden])) .col-lg-4 > .score-card{height:calc(100% - 60px)}}",
    "#preguntas-frecuentes .nx{background:#e7eef6}",
    "#preguntas-frecuentes .nx{position:relative;overflow:hidden}",
    "#preguntas-frecuentes .jv-faq-foto{position:relative;width:100vw;aspect-ratio:4/3;max-height:420px;margin:calc(clamp(48px,6vw,88px) * -1) 0 8px calc(50% - 50vw);overflow:hidden;background:#d6e4f4}",
    "@media (min-width:992px){#preguntas-frecuentes .nx-pad{padding-top:96px;padding-bottom:96px}#preguntas-frecuentes .jv-faq-media{position:static}#preguntas-frecuentes .jv-faq-foto{position:absolute;top:0;bottom:0;left:0;width:41.6667%;max-height:none;aspect-ratio:auto;margin:0}}",
    "#preguntas-frecuentes .jv-faq-foto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .5s ease}",
    "#preguntas-frecuentes .jv-faq-foto img.is-on{opacity:1}",
    "#preguntas-frecuentes .jv-faq-title{margin:0 0 28px;max-width:16ch;text-wrap:balance}",
    "#preguntas-frecuentes .jv-faq-tabs{display:flex;flex-wrap:wrap;gap:0 22px;margin:0 0 8px;border-bottom:1px solid #cfdced}",
    "@media (max-width:991.98px){#preguntas-frecuentes .jv-faq-tabs{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 82%,transparent);mask-image:linear-gradient(90deg,#000 82%,transparent)}#preguntas-frecuentes .jv-faq-tabs::-webkit-scrollbar{display:none}#preguntas-frecuentes .jv-faq-tabs.is-end{-webkit-mask-image:none;mask-image:none}}",
    "#preguntas-frecuentes .jv-faq-tabs .topic{flex:none;width:auto;margin:0 0 -1px;padding:10px 0 12px;border:0;border-bottom:2px solid transparent;border-radius:0;background:none;color:#5b6b80;font-size:.95rem;font-weight:500;white-space:nowrap;transition:color .2s ease,border-color .2s ease}",
    "#preguntas-frecuentes .jv-faq-tabs .topic:hover{background:none;color:#0b1f38}",
    "#preguntas-frecuentes .jv-faq-tabs .topic.is-on{background:none;color:#0b1f38;font-weight:600;border-bottom-color:#e4570a}",
    "#preguntas-frecuentes .jv-faq-tabs .topic:focus-visible{outline:2px solid #e4570a;outline-offset:2px}",
    "#preguntas-frecuentes .accordion-item{background:transparent;border-bottom:1px solid #cfdced}",
    "#preguntas-frecuentes .accordion-button{padding:20px 0;font-size:1.12rem}",
    "#preguntas-frecuentes .accordion-body{padding:0 0 22px;max-width:56ch;color:#3d4c60}",
    "#preguntas-frecuentes .jv-faq-cta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px 20px;margin-top:36px;padding:18px 18px 18px 24px;background:#fff;border-radius:999px;box-shadow:0 1px 2px rgba(11,31,56,.06),0 8px 24px rgba(11,31,56,.08)}",
    "#preguntas-frecuentes .jv-faq-cta h3{margin:0;font-family:Fraunces,Georgia,serif;font-weight:500;font-size:1.25rem;color:#0b1f38}",
    "#preguntas-frecuentes .jv-faq-cta a{display:inline-flex;align-items:center;gap:.5em;padding:12px 22px;border-radius:999px;background:#e4570a;color:#fff;font-weight:600;text-decoration:none;transition:background .2s ease}",
    "#preguntas-frecuentes .jv-faq-cta a:hover,#preguntas-frecuentes .jv-faq-cta a:focus-visible{background:#c94a06;color:#fff}",
    "#preguntas-frecuentes .jv-faq-cta a i{transition:transform .2s ease}",
    "#preguntas-frecuentes .jv-faq-cta a:hover i{transform:translateX(3px)}",
    "#donde-nos-encontramos .jv-map{position:relative;aspect-ratio:26/10;border-radius:16px;overflow:hidden;background:#e7eef6;box-shadow:0 1px 2px rgba(11,31,56,.06),0 8px 24px rgba(11,31,56,.08)}",
    "#donde-nos-encontramos .jv-map iframe{position:absolute;inset:0;width:100%;height:100%;border:0}",
    "@media (max-width:575.98px){#donde-nos-encontramos .jv-map{aspect-ratio:4/5}}",
    "@media (max-width:575.98px){#preguntas-frecuentes .jv-faq-cta{border-radius:20px;padding:20px}#preguntas-frecuentes .jv-faq-cta a{width:100%;justify-content:center}}",
    "@media (prefers-reduced-motion:reduce){#preguntas-frecuentes .jv-faq-foto img,#preguntas-frecuentes .jv-faq-tabs .topic{transition:none}}",
    "#preguntas-frecuentes .jv-bags{display:grid;gap:10px;margin:2px 0 0}",
    "#preguntas-frecuentes .jv-bags figure{display:grid;gap:8px;margin:0;background:rgba(255,255,255,.62);border-radius:16px;padding:12px 14px 14px}",
    "#preguntas-frecuentes .jv-bags svg{width:auto;max-width:100%;height:148px;margin:0 auto;display:block}",
    "#preguntas-frecuentes .jv-bags figcaption{font-size:.92rem;line-height:1.35}",
    "#preguntas-frecuentes .jv-bags strong{display:block;margin-bottom:2px}",
    "#preguntas-frecuentes .jv-bags span{display:block;margin-top:4px;color:#e4570a;font-weight:700}",
    "#preguntas-frecuentes .jv-bags-note{margin:12px 0 0;font-size:.92rem}",
    "@media(min-width:992px){#preguntas-frecuentes .jv-bags{grid-template-columns:repeat(3,1fr)}#preguntas-frecuentes .jv-bags figure{grid-template-columns:1fr;align-items:start}}",
    "#hero .nx-hero-slide{overflow:hidden}",
    "#hero .nx-hero-slide::before{z-index:1}",
    "#hero .jv-quince .nx-hero-slide{background:#0b1f38}",
    "#hero .jv-hero-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center right;z-index:0}",
    "#hero .jv-quince .jv-hero-video{object-position:center}",
    "#hero .jv-hero-lugar{position:absolute;z-index:2;right:max(20px,6vw);bottom:clamp(64px,12%,110px);max-width:11ch;margin:0;color:#fff;opacity:.7;text-align:right;font-family:Fraunces,Georgia,serif;font-weight:500;font-size:clamp(2rem,4.6vw,3.4rem);line-height:1.02;letter-spacing:-.03em;text-wrap:balance;text-shadow:0 2px 18px rgba(11,31,56,.55);pointer-events:none}",
    "@media (max-width:575.98px){#hero .jv-hero-lugar{font-size:1.85rem;bottom:76px}}",
    "#hero .jv-quince .nx-hero-slide::before{z-index:1;background:linear-gradient(180deg,rgba(11,31,56,.28) 0%,rgba(11,31,56,.1) 46%,rgba(11,31,56,.72) 100%)}",
    "#hero .jv-quince h2{color:#fff;max-width:12ch;font-size:clamp(2.6rem,6vw,4.6rem);line-height:.98;text-wrap:balance}",
    "#hero .jv-quince .nx-lead{color:#fff;max-width:28rem;text-wrap:pretty}",
    "#resenas-de-google .jv-resena-pagina[hidden]{display:none !important}",
    "#resenas-de-google .jv-resena-navs{display:flex;align-items:center;gap:12px;margin-top:18px}",
    "#resenas-de-google .jv-resena-nav{width:42px;height:42px;border:0;border-radius:999px;background:#f4f6f8;color:#0b1f38;box-shadow:0 0 0 1px #e3e7ec;cursor:pointer}",
    "#resenas-de-google .jv-resena-num{min-width:3.2em;font-weight:700;letter-spacing:.04em}",
    "#productos .nx-frame .jv-zoom{position:absolute;inset:0;display:block;width:100%;height:100%;margin:0;padding:0;border:0;background:transparent;cursor:zoom-in}",
    "#productos .nx-frame .jv-zoom img{width:100%;height:100%;object-fit:cover}",
    ".jv-light{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:28px 20px;background:rgba(11,31,56,.84)}",
    ".jv-light[hidden]{display:none !important}",
    ".jv-light img{max-width:min(920px,100%);max-height:calc(100vh - 72px);border-radius:16px;object-fit:contain}",
    ".jv-light-x{position:absolute;top:14px;right:14px;width:42px;height:42px;border:0;border-radius:999px;background:#fff;color:#0b1f38;font-size:26px;line-height:1;cursor:pointer}",
  ].join("");
  document.head.appendChild(css);

  var heroCarrusel = document.getElementById("heroJimena");
  function syncHeroVideo() {
    if (!heroCarrusel) return;
    var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heroCarrusel.querySelectorAll("video.jv-hero-video").forEach(function (video) {
      var item = video.closest(".carousel-item");
      var activo = item && item.classList.contains("active") && !quieto;
      if (activo) {
        var play = video.play();
        if (play && play.catch) play.catch(function () {});
      } else {
        video.pause();
      }
    });
  }
  if (heroCarrusel) {
    heroCarrusel.addEventListener("slid.bs.carousel", syncHeroVideo);
    syncHeroVideo();
  }

  function subirDestacadas() {
    var marco = document.querySelector("#productos .mq-frame");
    var fila = document.querySelector("#productos .row");
    if (!marco || !fila) return;
    var tira = marco.querySelector(".jv-sobre-hero");
    var cols = fila.querySelectorAll(".jv-destacada");
    if (!cols.length) {
      if (tira) tira.remove();
      document.body.classList.remove("jv-con-solape");
      return;
    }
    if (!tira) {
      tira = document.createElement("div");
      tira.className = "jv-sobre-hero";
      tira.innerHTML = '<div class="container"><div class="jv-sobre-grid"></div></div>';
      marco.insertBefore(tira, marco.firstChild);
    }
    var grilla = tira.querySelector(".jv-sobre-grid");
    grilla.innerHTML = "";
    Array.prototype.forEach.call(cols, function (col) {
      var card = col.querySelector(".prod-card");
      if (card) grilla.appendChild(card);
      col.remove();
    });
    document.body.classList.add("jv-con-solape");
    medirSolape();
  }
  function medirSolape() {
    var foto = document.querySelector("#productos .jv-sobre-grid .nx-frame");
    if (foto) document.documentElement.style.setProperty("--jv-solape", Math.round(foto.getBoundingClientRect().height * 0.3) + "px");
  }
  subirDestacadas();
  window.addEventListener("resize", medirSolape);

  var GRUPOS_FILTRO = [
    { modo: "alguno", items: [["directo", "Vuelo directo"], ["con-escala", "Vuelo con escala"]] },
    { modo: "alguno", items: [["all-inclusive", "All inclusive"], ["media-pension", "Media pensión"], ["desayuno", "Desayuno"]] },
    { modo: "alguno", items: [["noches-5", "Hasta 5 noches"], ["noches-10", "Hasta 10 noches"]] }
  ];
  var filtrosActivos = {};

  function tarjetasPromo() {
    return Array.prototype.slice.call(document.querySelectorAll("#productos .prod-card[data-filtros]"));
  }

  function etiquetas(card) {
    return (card.getAttribute("data-filtros") || "").split(" ").filter(Boolean);
  }

  function filtrar() {
    var vistas = 0;
    tarjetasPromo().forEach(function (card) {
      var tags = etiquetas(card);
      var ok = GRUPOS_FILTRO.every(function (grupo) {
        var elegidos = grupo.items.map(function (it) { return it[0]; }).filter(function (k) { return filtrosActivos[k]; });
        if (!elegidos.length) return true;
        return grupo.modo === "todos"
          ? elegidos.every(function (k) { return tags.indexOf(k) !== -1; })
          : elegidos.some(function (k) { return tags.indexOf(k) !== -1; });
      });
      var caja = card.parentElement && card.parentElement.matches(".row > [class*='col-']") ? card.parentElement : card;
      caja.hidden = !ok;
      if (ok) vistas += 1;
    });
    var tira = document.querySelector("#productos .jv-sobre-hero");
    if (tira) {
      var conTira = !!tira.querySelector(".prod-card:not([hidden])");
      tira.hidden = !conTira;
      document.body.classList.toggle("jv-con-solape", conTira);
    }
    var hay = Object.keys(filtrosActivos).some(function (k) { return filtrosActivos[k]; });
    var caja = document.querySelector("#productos .jv-filtros");
    if (!caja) return;
    caja.querySelector("[data-limpiar]").hidden = !hay;
    var vacio = caja.querySelector("[data-vacio]");
    vacio.hidden = vistas > 0;
    guardarEnLink();
  }

  function guardarEnLink() {
    var activos = Object.keys(filtrosActivos).filter(function (k) { return filtrosActivos[k]; });
    var hash = activos.length ? "#filtro=" + activos.join("+") : "";
    if (!hash && location.hash.indexOf("#filtro=") !== 0) return;
    if (hash === location.hash) return;
    history.replaceState(null, "", location.pathname + location.search + hash);
  }

  var filtroDesdeLink = (location.hash.match(/^#filtro=([\w+-]+)$/) || [])[1];
  if (filtroDesdeLink) {
    filtroDesdeLink.split("+").forEach(function (k) { filtrosActivos[k] = true; });
  }

  function armarFiltros() {
    var titulo = document.querySelector("#productos .container > h2");
    var cards = tarjetasPromo();
    var caja = document.querySelector("#productos .jv-filtros");
    if (!titulo || !cards.length) {
      if (caja) caja.remove();
      return;
    }
    var cuenta = {};
    cards.forEach(function (card) { etiquetas(card).forEach(function (t) { cuenta[t] = (cuenta[t] || 0) + 1; }); });
    var presentes = {};
    Object.keys(cuenta).forEach(function (t) { if (cuenta[t] < cards.length) presentes[t] = true; });
    if (!caja) {
      caja = document.createElement("div");
      caja.className = "jv-filtros";
      titulo.insertAdjacentElement("afterend", caja);
    }
    var html = ['<div class="jv-filtros-fila" role="group" aria-label="Filtrar promociones">'];
    GRUPOS_FILTRO.forEach(function (grupo) {
      var items = grupo.items.filter(function (it) { return presentes[it[0]]; });
      if (!items.length) return;
      html.push('<span class="jv-filtros-grupo">');
      items.forEach(function (it) {
        var on = !!filtrosActivos[it[0]];
        html.push('<button type="button" class="jv-chip' + (on ? " is-on" : "") + '" data-filtro="' + it[0] + '" aria-pressed="' + on + '" aria-label="' + it[1] + ", " + cuenta[it[0]] + (cuenta[it[0]] === 1 ? " promo" : " promos") + '">' + it[1] + '<span class="jv-chip-n">' + cuenta[it[0]] + "</span></button>");
      });
      html.push("</span>");
    });
    html.push('<button type="button" class="jv-chip-limpiar" data-limpiar hidden>Limpiar</button></div>');
    html.push('<p class="jv-filtros-vacio" data-vacio hidden>No hay promos con esos filtros. <button type="button" data-limpiar-vacio>Ver todas</button></p>');
    caja.innerHTML = html.join("");
    Object.keys(filtrosActivos).forEach(function (k) { if (!presentes[k]) delete filtrosActivos[k]; });
    filtrar();
  }

  document.addEventListener("click", function (e) {
    var chip = e.target.closest("#productos [data-filtro]");
    if (chip) {
      var key = chip.getAttribute("data-filtro");
      filtrosActivos[key] = !filtrosActivos[key];
      chip.classList.toggle("is-on", filtrosActivos[key]);
      chip.setAttribute("aria-pressed", String(filtrosActivos[key]));
      filtrar();
      return;
    }
    if (e.target.closest("#productos [data-limpiar], #productos [data-limpiar-vacio]")) {
      filtrosActivos = {};
      document.querySelectorAll("#productos [data-filtro]").forEach(function (b) {
        b.classList.remove("is-on");
        b.setAttribute("aria-pressed", "false");
      });
      filtrar();
    }
  });
  armarFiltros();
  if (filtroDesdeLink && document.querySelector("#productos .jv-chip.is-on")) {
    var irAFiltros = function () {
      var fila = document.querySelector("#productos .jv-filtros");
      if (!fila) return;
      var nav = document.querySelector(".navbar.fixed-top, header .navbar, .navbar");
      var alto = nav ? nav.getBoundingClientRect().height : 0;
      window.scrollTo(0, window.scrollY + fila.getBoundingClientRect().top - alto - 24);
    };
    if (document.readyState === "complete") irAFiltros();
    else window.addEventListener("load", irAFiltros);
  }

  var resenasPag = document.querySelector("#resenas-de-google [data-jv-resenas]");
  if (resenasPag) {
    var paginas = resenasPag.querySelectorAll("[data-jv-pagina-item]");
    var pagina = 0;
    var numero = resenasPag.querySelector("[data-jv-pagina]");
    function mostrarResenas(i) {
      if (!paginas.length) return;
      pagina = (i + paginas.length) % paginas.length;
      paginas.forEach(function (el, idx) { el.hidden = idx !== pagina; });
      if (numero) numero.textContent = (pagina + 1) + " / " + paginas.length;
    }
    var prev = resenasPag.querySelector("[data-jv-prev]");
    var next = resenasPag.querySelector("[data-jv-next]");
    if (prev) prev.addEventListener("click", function () { mostrarResenas(pagina - 1); });
    if (next) next.addEventListener("click", function () { mostrarResenas(pagina + 1); });
    mostrarResenas(0);
  }

  var reseñas = document.querySelector("#resenas-de-google [data-scroller]");
  if (reseñas) {
    var pista = reseñas.querySelector("[data-track]");
    var giro = null;
    function avanzarReseñas() {
      if (!pista) return;
      var tarjeta = pista.querySelector(":scope > :not([hidden])");
      if (!tarjeta || pista.scrollWidth <= pista.clientWidth + 8) return;
      var paso = tarjeta.getBoundingClientRect().width + 16;
      var fin = pista.scrollWidth - pista.clientWidth - 4;
      if (pista.scrollLeft >= fin) pista.scrollTo({ left: 0, behavior: "smooth" });
      else pista.scrollBy({ left: paso, behavior: "smooth" });
    }
    function seguirReseñas() {
      if (giro || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      giro = setInterval(avanzarReseñas, 4500);
    }
    function pausarReseñas() {
      clearInterval(giro);
      giro = null;
    }
    reseñas.addEventListener("pointerenter", pausarReseñas);
    reseñas.addEventListener("pointerleave", seguirReseñas);
    reseñas.addEventListener("focusin", pausarReseñas);
    reseñas.addEventListener("focusout", seguirReseñas);
    seguirReseñas();
  }

  var dudas = document.querySelector("#preguntas-frecuentes [data-faq]");
  if (dudas) {
    var temas = dudas.querySelector(".jv-faq-tabs");
    function finTemas() {
      if (temas) temas.classList.toggle("is-end", temas.scrollLeft + temas.clientWidth >= temas.scrollWidth - 4);
    }
    if (temas) {
      temas.addEventListener("scroll", finTemas, { passive: true });
      window.addEventListener("resize", finTemas);
      finTemas();
    }
    dudas.querySelectorAll("[data-topic]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tema = btn.getAttribute("data-topic");
        dudas.querySelectorAll("[data-topic]").forEach(function (otro) {
          otro.setAttribute("aria-pressed", otro === btn ? "true" : "false");
        });
        var fila = btn.parentElement;
        if (fila && fila.scrollWidth > fila.clientWidth) {
          fila.scrollTo({ left: Math.max(0, btn.offsetLeft - fila.offsetLeft - 24), behavior: "smooth" });
        }
        dudas.querySelectorAll("[data-faq-foto]").forEach(function (foto) {
          foto.classList.toggle("is-on", foto.getAttribute("data-faq-foto") === tema);
        });
        var panel = dudas.querySelector('[data-faq-item="' + tema + '"] .accordion-collapse');
        if (panel && window.bootstrap) bootstrap.Collapse.getOrCreateInstance(panel, { toggle: false }).show();
      });
    });
  }

  var light = document.createElement("div");
  light.className = "jv-light";
  light.hidden = true;
  light.innerHTML = '<button type="button" class="jv-light-x" aria-label="Cerrar">&times;</button><img alt="">';
  document.body.appendChild(light);
  function cerrarPieza() {
    light.hidden = true;
    document.body.style.overflow = "";
  }
  function abrirPieza(src, alt) {
    var img = light.querySelector("img");
    img.src = src;
    img.alt = alt || "";
    light.hidden = false;
    document.body.style.overflow = "hidden";
  }
  document.addEventListener("click", function (event) {
    var zoom = event.target.closest(".jv-zoom");
    if (zoom) {
      var photo = zoom.querySelector("img");
      abrirPieza(zoom.getAttribute("data-zoom"), photo ? photo.alt : "");
      return;
    }
    if (event.target === light || event.target.classList.contains("jv-light-x")) cerrarPieza();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !light.hidden) cerrarPieza();
  });
})();
