/* Gestor de ofertas, dentro de la landing de Jimena Vidal. */
(function () {
  var meta = document.querySelector('meta[name="lz-landing"]');
  var id = meta && meta.getAttribute("content");
  var footer = document.querySelector("#footer");
  var estatico = document.documentElement.hasAttribute("data-estatico");
  if ((!id && !estatico) || !footer || !footer.parentNode) return;

  var css = document.createElement("style");
  css.textContent = [
    ".jv-gestor{font-family:Manrope,system-ui,sans-serif;color:#3d2616}",
    "@media(max-width:760px){.jv-form,.jv-clave-form{padding-right:64px}.jv-gestor{padding-bottom:88px}}",
    ".jv-gestor [hidden]{display:none !important}",
    ".jv-gestor h2{font-family:Fraunces,Georgia,serif}",
    ".jv-gestor .jv-lead{max-width:38rem}",
    ".jv-cols{display:grid;grid-template-columns:1fr;gap:18px;margin:8px 0 16px}",
    "@media(min-width:800px){.jv-cols{grid-template-columns:1fr 1fr}}",
    ".jv-col{background:#fffaf6;border:1px solid #f0d4c0;border-radius:18px;padding:14px 14px 8px}",
    ".jv-col h3{margin:0 0 8px;font-size:18px}",
    ".jv-item{display:grid;grid-template-columns:72px 1fr;gap:10px;padding:12px 0;border-top:1px solid #f0d4c0}",
    ".jv-item img{width:72px;height:72px;object-fit:cover;border-radius:12px}",
    ".jv-item h3{margin:0;font-size:16px}",
    ".jv-item p{margin:2px 0;font-size:13px;line-height:1.35}",
    ".jv-acts{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:4px}",
    ".jv-gestor button{border:0;border-radius:999px;padding:8px 12px;font-weight:700;cursor:pointer;background:#fff;color:#3d2616}",
    ".jv-acts button{width:26px;height:26px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:13px;line-height:1}",
    ".jv-gestor button[disabled]{opacity:.45;cursor:default}",
    ".jv-go,.jv-nueva,.jv-gestor button.is-on{background:#e4570a;color:#fff}",
    ".jv-form{background:#fffaf6;border:1px solid #f0d4c0;border-radius:18px;padding:16px;margin-top:8px}",
    ".jv-form h3{margin:0 0 10px}",
    ".jv-form label,.jv-clave-form label{display:grid;gap:4px;margin-bottom:10px;font-size:13px;font-weight:700}",
    ".jv-form input,.jv-form select,.jv-clave-form input{width:100%;border:1px solid #f0d4c0;border-radius:10px;padding:10px 12px;font:inherit;font-weight:500;color:#3d2616;background:#fff}",
    ".jv-row{display:grid;grid-template-columns:1fr;gap:10px}",
    "@media(min-width:640px){.jv-row{grid-template-columns:1fr 1fr}}",
    ".jv-hint{margin:-4px 0 10px;font-size:12px;font-weight:500;color:#7a5644}",
    ".jv-checks{display:flex;flex-wrap:wrap;gap:8px 12px;margin:0 0 12px}",
    ".jv-checks label{display:flex;align-items:center;gap:6px;margin:0;font-weight:600}",
    ".jv-checks input{width:auto}",
    ".jv-form input[type=file]{padding:8px}",
    ".jv-preview{display:block;width:100%;max-height:180px;object-fit:cover;border-radius:12px;margin:0 0 10px}",
    ".jv-pieza{display:block;width:min(260px,100%);height:auto;border-radius:16px;margin:0 0 12px}",
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
    ".jv-actions{display:flex;flex-wrap:wrap;gap:8px}",
    ".jv-msg{min-height:1.2em;margin:8px 0 0;font-size:14px;font-weight:600}",
    ".jv-msg.is-ok{color:#a43f07}",
    ".jv-msg.is-warn{color:#9a3412}",
    ".jv-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center}"
  ].join("");
  document.head.appendChild(css);

  var heroCarrusel = document.getElementById("heroJimena");
  function syncHeroVideo() {
    if (!heroCarrusel) return;
    var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heroCarrusel.querySelectorAll(".jv-hero-video").forEach(function (video) {
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

  if (estatico) return;

  var section = document.createElement("section");
  section.className = "mq-block";
  section.id = "gestor-ofertas";
  section.setAttribute("data-width", "full");
  section.innerHTML = [
    '<div class="mq-frame"><div class="nx nx-pad"><div class="container jv-gestor">',
    '<p class="nx-kicker">Equipo</p>',
    "<h2>Gestión de&nbsp;ofertas</h2>",
    "<p class=\"jv-lead\">Publicadas, pendientes y el orden en que se&nbsp;ven.</p>",
    '<form class="jv-clave-form">',
    '<label>Clave del equipo<input type="password" name="clave" autocomplete="current-password" required></label>',
    '<button class="jv-go" type="submit">Entrar</button>',
    '<p class="jv-msg" data-clave-msg role="status"></p>',
    "</form>",
    '<div class="jv-app" hidden>',
    '<div class="jv-top"><button class="jv-nueva" type="button">Nueva oferta</button><button type="button" data-salir>Salir</button></div>',
    '<div class="jv-cols">',
    '<div class="jv-col" data-col="publicada"><h3>Publicadas</h3><p class="jv-hint">Podés destacar hasta cuatro. Esas van arriba, sobre la foto&nbsp;principal.</p><div data-list></div></div>',
    '<div class="jv-col" data-col="pendiente"><h3>Pendientes</h3><div data-list></div></div>',
    "</div>",
    '<form class="jv-form" hidden>',
    "<h3 data-form-title>Nueva oferta</h3>",
    '<label>Destino<input name="destino" maxlength="40" required placeholder="Riviera Maya"></label>',
    '<label>Foto del destino<input type="file" name="foto" accept="image/jpeg,image/png,image/webp"></label>',
    '<img class="jv-preview" alt="" hidden aria-hidden="true">',
    '<p class="jv-hint">La foto se adapta al tamaño de la&nbsp;pieza.</p>',
    '<div class="jv-row">',
    '<label>Noches<input name="noches" type="number" min="1" max="21" value="7"></label>',
    '<label>Sale de<input name="origen" maxlength="24" value="Rosario"></label>',
    "</div>",
    '<p class="jv-hint" data-stay>7 noches se publican como 8 días / 7 noches.</p>',
    '<label>Fechas<input name="fechas" maxlength="28" placeholder="12 jun – 19 jun, o salidas en junio"></label>',
    '<p class="jv-hint">Sale en la pieza, bajo el&nbsp;origen.</p>',
    "<span>Qué incluye</span>",
    '<p class="jv-hint">Solo entra lo que tenga&nbsp;tilde.</p>',
    '<div class="jv-checks">',
    '<label><input type="checkbox" name="incluye" value="aereo" checked> Vuelo</label>',
    '<label><input type="checkbox" name="incluye" value="equipaje"> Equipaje</label>',
    '<label><input type="checkbox" name="incluye" value="traslado"> Traslados</label>',
    '<label><input type="checkbox" name="incluye" value="excursion"> Visitas</label>',
    '<label><input type="checkbox" name="incluye" value="guia"> Guía en español</label>',
    '<label><input type="checkbox" name="incluye" value="hotel" checked> Alojamiento</label>',
    '<label><input type="checkbox" name="incluye" value="desayuno"> Desayuno</label>',
    '<label><input type="checkbox" name="incluye" value="asistencia"> Asistencia</label>',
    "</div>",
    '<label>Vuelo<select name="vuelo"><option value="">Sin aclarar</option><option value="directo">Directo</option><option value="con escala">Con escala</option></select></label>',
    '<p class="jv-hint">En la pieza se lee Vuelo directo o Vuelo con&nbsp;escala.</p>',
    '<label>Comidas<select name="regimen"><option value="">Sin régimen</option><option>Desayuno</option><option>Media pensión</option><option>All inclusive</option></select></label>',
    '<label>Moneda<select name="moneda"><option>USD</option><option>ARS</option><option>EUR</option></select></label>',
    '<div class="jv-row">',
    '<label>Precio antes<input name="precio_antes" inputmode="numeric" maxlength="9" placeholder="2490"></label>',
    '<label>Precio ahora<input name="precio" inputmode="numeric" maxlength="9" placeholder="1890"></label>',
    "</div>",
    '<p class="jv-hint">El anterior sale tachado. Si el de ahora queda vacío, la pieza no lo&nbsp;muestra.</p>',
    '<label>Plan<select name="precio_nota">',
    '<option value="">Sin plan</option>',
    '<option>Por pasajero adulto en base doble</option>',
    '<option>Por pasajero adulto en base triple</option>',
    '<option>Plan familiar (2 adulto + 1 menor hasta 11 años)</option>',
    '<option>Plan familiar (2 adulto + 2 menores hasta 11 años)</option>',
    '</select></label>',
    '<p class="jv-hint">Si no elegís plan, no entra en la&nbsp;pieza.</p>',
    '<label>Hotel<input name="hotel" maxlength="32" placeholder="Nombre del hotel"></label>',
    '<label>Estrellas<select name="estrellas"><option value="">Sin estrellas</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></label>',
    '<p class="jv-hint">Salen bajo Alojamiento. Si el hotel queda vacío, no se&nbsp;muestra.</p>',
    '<img class="jv-pieza" alt="" hidden aria-hidden="true">',
    '<div class="jv-actions">',
    '<button type="button" data-ver>Ver pieza</button>',
    '<button class="jv-go" type="submit" value="guardar" data-guardar hidden>Guardar</button>',
    '<button class="jv-go" type="submit" value="publicada" data-publicar>Publicar</button>',
    '<button type="submit" value="pendiente" data-pendiente>Guardar pendiente</button>',
    '<button type="button" data-cerrar>Cerrar</button>',
    "</div>",
    '<p class="jv-msg" data-form-msg role="status"></p>',
    "</form>",
    '<p class="jv-msg" data-app-msg role="status"></p>',
    "</div>",
    "</div></div></div>"
  ].join("");
  footer.parentNode.insertBefore(section, footer);

  var claveForm = section.querySelector(".jv-clave-form");
  var app = section.querySelector(".jv-app");
  var form = section.querySelector(".jv-form");
  var ofertas = [];
  var editando = "";
  var estadoEditando = "";

  function esc(value) {
    return String(value || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  function say(node, text, tone) {
    node.textContent = text || "";
    node.className = "jv-msg" + (tone ? " is-" + tone : "");
  }

  function json(url, options) {
    options = options || {};
    options.credentials = "same-origin";
    options.headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    return fetch(url, options).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error((data && data.error) || "No se pudo completar.");
        return data;
      });
    });
  }

  function pintarGrilla(data) {
    var row = document.querySelector("#productos .row");
    if (row && data.grilla != null) {
      Array.prototype.slice.call(row.children).forEach(function (col) {
        if (col.querySelector && col.querySelector(".prod-card")) col.remove();
      });
      row.insertAdjacentHTML("afterbegin", data.grilla);
      subirDestacadas();
      armarFiltros();
    }
    var note = document.querySelector("#productos .jv-cierre h2");
    if (note && data.nota) note.innerHTML = data.nota;
  }

  function bajar(url, nombre) {
    return fetch(url, { credentials: "same-origin", cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("No se pudo bajar el PNG.");
      return r.blob();
    }).then(function (blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  function de(estado) {
    return ofertas.filter(function (item) { return item.estado === estado; });
  }

  function icono(act, label, icon, extra) {
    return '<button type="button" data-act="' + act + '" aria-label="' + label + '" title="' + label + '"' + (extra || "") + '><i class="bi bi-' + icon + '" aria-hidden="true"></i></button>';
  }

  function marcas() {
    var pub = de("publicada");
    var explicit = pub.some(function (item) { return item.destacada === true || item.destacada === false; });
    var map = {};
    var n = 0;
    pub.forEach(function (item, index) {
      map[item.id] = explicit ? item.destacada === true : index < 4;
      if (map[item.id]) n += 1;
    });
    return { map: map, n: n };
  }

  function fila(item, index, total, flags) {
    var precio = item.precio_texto ? item.precio_texto : "Sin precio";
    var art = document.createElement("article");
    var estrella = "";
    if (item.estado === "publicada") {
      if (flags.map[item.id]) estrella = icono("unfeature", "Sacar destacado", "star-fill", ' class="is-on"');
      else estrella = icono("featured", "Destacar", "star", flags.n >= 4 ? " disabled" : "");
    }
    art.className = "jv-item";
    art.innerHTML = [
      '<img src="', esc(item.card), '" alt="', esc(item.destino), '">',
      "<div><h3></h3><p></p><p></p></div>",
      '<div class="jv-acts">',
      icono("edit", "Editar", "pencil"),
      icono("png", "Bajar PNG", "download"),
      estrella,
      icono("up", "Subir", "arrow-up", index === 0 ? " disabled" : ""),
      icono("down", "Bajar", "arrow-down", index === total - 1 ? " disabled" : ""),
      icono("estado", item.estado === "publicada" ? "A pendiente" : "Publicar", item.estado === "publicada" ? "archive" : "check-lg"),
      icono("del", "Quitar", "trash"),
      "</div>"
    ].join("");
    art.querySelector("h3").textContent = item.destino;
    art.querySelectorAll("p")[0].textContent = item.estadia;
    art.querySelectorAll("p")[1].textContent = precio;
    return art;
  }

  function render() {
    ["publicada", "pendiente"].forEach(function (estado) {
      var list = section.querySelector('[data-col="' + estado + '"] [data-list]');
      var items = de(estado);
      list.innerHTML = "";
      if (!items.length) {
        var empty = document.createElement("p");
        empty.innerHTML = estado === "publicada" ? "Sin ofertas&nbsp;publicadas." : "Sin ofertas&nbsp;pendientes.";
        list.appendChild(empty);
        return;
      }
      var flags = marcas();
      items.forEach(function (item, index) { list.appendChild(fila(item, index, items.length, flags)); });
    });
  }

  function aplicar(data) {
    ofertas = data.ofertas || [];
    render();
    pintarGrilla(data);
  }

  function cargar() {
    return json("/api/landings/" + id + "/ofertas").then(aplicar);
  }

  function modo(logueado) {
    claveForm.hidden = logueado;
    app.hidden = !logueado;
    if (logueado) return cargar().catch(function (err) { say(section.querySelector("[data-app-msg]"), err.message, "warn"); });
  }

  function nightsText() {
    var n = Number(form.noches.value) || 0;
    var days = n + 1;
    form.querySelector("[data-stay]").textContent = n
      ? n + (n === 1 ? " noche se publica como " : " noches se publican como ") + days + (days === 1 ? " día / " : " días / ") + n + (n === 1 ? " noche." : " noches.")
      : "";
  }

  function leerFoto() {
    var file = form.foto.files[0];
    if (!file) return Promise.resolve("");
    if (file.size > 8 * 1024 * 1024) return Promise.reject(new Error("La foto pesa más de 8 MB."));
    return new Promise(function (ok, fail) {
      var reader = new FileReader();
      reader.onload = function () { ok(reader.result); };
      reader.onerror = function () { fail(new Error("No se pudo leer la foto.")); };
      reader.readAsDataURL(file);
    });
  }

  function cuerpo(extra) {
    return leerFoto().then(function (foto) {
      var data = {
        destino: form.destino.value,
        noches: Number(form.noches.value),
        origen: form.origen.value,
        fechas: form.fechas.value,
        vuelo: form.vuelo.value,
        incluye: Array.prototype.map.call(form.querySelectorAll('input[name="incluye"]:checked'), function (el) { return el.value; }),
        regimen: form.regimen.value,
        moneda: form.moneda.value,
        precio_antes: form.precio_antes.value,
        precio: form.precio.value,
        precio_nota: form.precio_nota.value,
        hotel: form.hotel.value,
        estrellas: form.estrellas.value,
        estado: extra.estado
      };
      if (foto) data.foto = foto;
      return data;
    });
  }

  function verPieza() {
    var button = form.querySelector("[data-ver]");
    if (button) button.disabled = true;
    return cuerpo({ estado: "pendiente" }).then(function (data) {
      if (editando) data.id = editando;
      return fetch("/api/landings/" + id + "/ofertas/vista", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) return r.json().then(function (body) { throw new Error((body && body.error) || "No se pudo armar la vista."); });
        return r.blob();
      });
    }).then(function (blob) {
      var img = form.querySelector(".jv-pieza");
      if (img.src && img.src.indexOf("blob:") === 0) URL.revokeObjectURL(img.src);
      img.src = URL.createObjectURL(blob);
      img.hidden = false;
    }).catch(function (err) {
      say(form.querySelector("[data-form-msg]"), err.message, "warn");
    }).then(function () {
      if (button) button.disabled = false;
    });
  }

  function abrir(item) {
    editando = item ? item.id : "";
    estadoEditando = item ? item.estado : "";
    form.hidden = false;
    form.querySelector("[data-form-title]").textContent = item ? "Editar oferta" : "Nueva oferta";
    form.querySelector("[data-guardar]").hidden = !item;
    form.querySelector("[data-publicar]").classList.toggle("jv-go", !item);
    form.querySelector("[data-publicar]").hidden = !!item && item.estado === "publicada";
    form.querySelector("[data-pendiente]").hidden = !!item && item.estado === "pendiente";
    form.destino.value = item ? item.destino : "";
    form.noches.value = item ? item.noches : 7;
    form.origen.value = item ? item.origen : "Rosario";
    form.fechas.value = item ? item.fechas : "";
    form.vuelo.value = item && item.vuelo ? item.vuelo : "";
    form.regimen.value = item ? item.regimen : "";
    form.moneda.value = item && item.moneda ? item.moneda : "USD";
    form.precio_antes.value = item && item.precio_antes ? item.precio_antes : "";
    form.precio.value = item && item.precio ? item.precio : "";
    form.precio_nota.value = item && item.precio_nota ? item.precio_nota : "";
    form.hotel.value = item ? item.hotel : "";
    form.estrellas.value = item && item.estrellas ? String(item.estrellas) : "";
    var keys = item && item.incluye ? item.incluye : ["aereo", "hotel"];
    Array.prototype.forEach.call(form.querySelectorAll('input[name="incluye"]'), function (el) {
      el.checked = keys.indexOf(el.value) !== -1;
    });
    form.foto.value = "";
    var preview = form.querySelector(".jv-preview");
    if (item && item.tiene_foto) {
      preview.src = item.card;
      preview.hidden = false;
    } else {
      preview.hidden = true;
      preview.removeAttribute("src");
    }
    nightsText();
    say(form.querySelector("[data-form-msg]"), "");
    var pieza = form.querySelector(".jv-pieza");
    pieza.hidden = true;
    pieza.removeAttribute("src");
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (item) verPieza();
  }

  function destacar(item, on) {
    return json("/api/landings/" + id + "/ofertas/" + item.id + "/destacada", {
      method: "POST",
      body: JSON.stringify({ destacada: on })
    }).then(aplicar);
  }

  function mover(item, dir) {
    var items = de(item.estado).slice();
    var index = items.findIndex(function (row) { return row.id === item.id; });
    var next = index + dir;
    if (next < 0 || next >= items.length) return;
    var swap = items[index];
    items[index] = items[next];
    items[next] = swap;
    return json("/api/landings/" + id + "/ofertas/orden", {
      method: "POST",
      body: JSON.stringify({ ids: items.map(function (row) { return row.id; }) })
    }).then(aplicar);
  }

  function cambiarEstado(item) {
    return json("/api/landings/" + id + "/ofertas/" + item.id, {
      method: "PUT",
      body: JSON.stringify({
        destino: item.destino,
        noches: item.noches,
        origen: item.origen,
        fechas: item.fechas,
        vuelo: item.vuelo || "",
        incluye: item.incluye,
        regimen: item.regimen,
        precio_antes: item.precio_antes || "",
        precio: item.precio || "",
        precio_nota: item.precio_nota || "",
        moneda: item.moneda || "USD",
        hotel: item.hotel,
        estrellas: item.estrellas,
        estado: item.estado === "publicada" ? "pendiente" : "publicada"
      })
    }).then(function (data) {
      aplicar(data);
      if (data.oferta && data.oferta.estado === "publicada") return bajar(data.png, data.archivo);
    });
  }

  claveForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var button = claveForm.querySelector("button");
    button.disabled = true;
    json("/api/login", { method: "POST", body: JSON.stringify({ clave: claveForm.clave.value }) })
      .then(function () { claveForm.clave.value = ""; return modo(true); })
      .catch(function (err) { say(claveForm.querySelector("[data-clave-msg]"), err.message, "warn"); })
      .then(function () { button.disabled = false; });
  });

  section.querySelector("[data-salir]").addEventListener("click", function () {
    json("/api/logout", { method: "POST", body: "{}" }).then(function () {
      form.hidden = true;
      modo(false);
    });
  });

  section.querySelector(".jv-nueva").addEventListener("click", function () { abrir(null); });
  form.querySelector("[data-cerrar]").addEventListener("click", function () { form.hidden = true; editando = ""; estadoEditando = ""; });
  form.querySelector("[data-ver]").addEventListener("click", function () { verPieza(); });
  [form.precio, form.precio_antes].forEach(function (input) {
    input.addEventListener("input", function () {
      input.value = input.value.replace(/\D/g, "").slice(0, 9);
    });
  });
  form.noches.addEventListener("input", nightsText);
  form.foto.addEventListener("change", function () {
    var file = form.foto.files[0];
    var preview = form.querySelector(".jv-preview");
    if (!file) { preview.hidden = true; return; }
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var accion = (e.submitter && e.submitter.value) || (editando ? "guardar" : "pendiente");
    var guardar = accion === "guardar";
    var estado = guardar ? (estadoEditando || "pendiente") : accion;
    var buttons = form.querySelectorAll("button");
    Array.prototype.forEach.call(buttons, function (button) { button.disabled = true; });
    cuerpo({ estado: estado }).then(function (data) {
      var url = "/api/landings/" + id + "/ofertas" + (editando ? "/" + editando : "");
      return json(url, { method: editando ? "PUT" : "POST", body: JSON.stringify(data) });
    }).then(function (data) {
      editando = "";
      estadoEditando = "";
      form.hidden = true;
      aplicar(data);
      if (guardar) {
        say(section.querySelector("[data-app-msg]"), "Cambios guardados.", "ok");
        return;
      }
      say(section.querySelector("[data-app-msg]"), estado === "publicada" ? "Quedó publicada. El PNG se está bajando." : "Quedó como pendiente.", "ok");
      if (estado === "publicada") return bajar(data.png, data.archivo);
    }).catch(function (err) {
      say(form.querySelector("[data-form-msg]"), err.message, "warn");
    }).then(function () {
      Array.prototype.forEach.call(buttons, function (button) { button.disabled = false; });
    });
  });

  section.addEventListener("click", function (e) {
    var button = e.target.closest("[data-act]");
    if (!button || button.disabled) return;
    var itemEl = button.closest(".jv-item");
    var col = button.closest("[data-col]");
    var index = Array.prototype.indexOf.call(col.querySelectorAll(".jv-item"), itemEl);
    var item = de(col.getAttribute("data-col"))[index];
    if (!item) return;
    var act = button.getAttribute("data-act");
    var job;
    if (act === "edit") { abrir(item); return; }
    if (act === "png") job = bajar(item.png, item.archivo);
    if (act === "featured") job = destacar(item, true);
    if (act === "unfeature") job = destacar(item, false);
    if (act === "up") job = mover(item, -1);
    if (act === "down") job = mover(item, 1);
    if (act === "estado") job = cambiarEstado(item);
    if (act === "del") {
      if (!window.confirm("¿Quitás la oferta a " + item.destino + "?")) return;
      job = json("/api/landings/" + id + "/ofertas/" + item.id, { method: "DELETE" }).then(aplicar);
    }
    if (!job) return;
    button.disabled = true;
    job.catch(function (err) { say(section.querySelector("[data-app-msg]"), err.message, "warn"); })
      .then(function () { button.disabled = false; });
  });

  fetch("/api/sesion", { credentials: "same-origin", cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (s) { return modo(!!s.ok); })
    .catch(function () { modo(false); });
})();
