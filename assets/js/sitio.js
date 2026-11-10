/* Comportamiento de la landing de Jimena Vidal: preguntas frecuentes, menú fijo con anclas y entrada suave de las secciones. */
(function () {
  "use strict";

  document.querySelectorAll("[data-faq]").forEach(function (root) {
    var input = root.querySelector("[data-faq-search]");
    var topics = root.querySelectorAll("[data-topic]");
    var items = root.querySelectorAll("[data-faq-item]");
    var empty = root.querySelector("[data-faq-empty]");
    var topic = "primeros";
    function apply() {
      var q = (input && input.value || "").trim().toLowerCase();
      var shown = 0;
      items.forEach(function (item) {
        var okTopic = !q && item.getAttribute("data-faq-item") === topic;
        var text = item.textContent.toLowerCase();
        var okSearch = q && text.indexOf(q) !== -1;
        var ok = q ? okSearch : okTopic;
        item.hidden = !ok;
        if (ok) shown += 1;
      });
      if (empty) empty.hidden = shown !== 0;
    }
    topics.forEach(function (btn) {
      btn.addEventListener("click", function () {
        topic = btn.getAttribute("data-topic");
        topics.forEach(function (b) { b.classList.toggle("is-on", b === btn); });
        if (input) input.value = "";
        apply();
      });
    });
    if (input) input.addEventListener("input", apply);
    apply();
  });

  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.documentElement.classList.add("mq-ready"); });
  });

  var landingSections = Array.prototype.slice.call(document.querySelectorAll(".landing-page > section[data-module]"));
  if (landingSections.length) {
    var SECTION_IDS = {
      "navegacion": "inicio",
      "hero-full-imagen": "portada",
      "quienes-somos": "nosotros",
      "imagen-texto": "historia",
      "servicios-productos": "servicios",
      "planes": "planes",
      "beneficios": "beneficios",
      "productos": "productos",
      "galeria-imagenes": "galeria",
      "carrusel-imagenes": "destacados",
      "video-destacado": "video",
      "casos-exito": "casos",
      "resenas-google": "resenas",
      "equipo": "equipo",
      "proceso": "proceso",
      "preguntas-frecuentes": "preguntas",
      "donde-nos-encontramos": "ubicacion",
      "reserva-turno": "turnos",
      "footer": "contacto"
    };
    var CONTACT = ["footer", "donde-nos-encontramos", "reserva-turno"];
    var LINK_RULES = [
      [/^(inicio|home)$|volver arriba/, ["navegacion"]],
      [/reserv|turno|agend/, ["reserva-turno"]],
      [/contact|escrib|hablemos|consult|presupuesto|tasa|cotiz|whatsapp|@/, CONTACT],
      [/pregunta|faq|dudas/, ["preguntas-frecuentes"]],
      [/como trabajamos|proceso|metodo|paso/, ["proceso"]],
      [/ubicacion|donde|sucursal|mapa|llegar/, ["donde-nos-encontramos"]],
      [/resena|testimonio|opinion/, ["resenas-google", "casos-exito"]],
      [/caso|proyecto|trabajos|portfolio/, ["casos-exito", "galeria-imagenes", "productos"]],
      [/profesional|profesor|docente|barbero|equipo|staff/, ["equipo"]],
      [/precio|plan|tarifa|membresia|club/, ["planes", "servicios-productos", "productos"]],
      [/destino|galeria|foto/, ["galeria-imagenes", "carrusel-imagenes", "productos"]],
      [/promo|paquete|escapada|luna de miel|oferta|producto|propiedad|comprar|alquil|emprendimiento|catalogo|tienda|coleccion/, ["productos", "carrusel-imagenes", "planes", "servicios-productos"]],
      [/servicio|tratamiento|curso|corte/, ["servicios-productos", "planes", "productos"]],
      [/beneficio|por que/, ["beneficios"]],
      [/video/, ["video-destacado"]],
      [/nosotros|quienes somos|historia|sobre/, ["quienes-somos", "imagen-texto", "beneficios"]]
    ];
    var groupOf = function (section) {
      var mod = section.getAttribute("data-module");
      var hit = "";
      Object.keys(SECTION_IDS).forEach(function (g) {
        if ((mod === g || mod.indexOf(g + "-") === 0) && g.length > hit.length) hit = g;
      });
      return hit;
    };
    var byGroup = {};
    landingSections.forEach(function (section) {
      var group = groupOf(section);
      if (!group) return;
      if (!section.id) {
        var base = SECTION_IDS[group], id = base, n = 2;
        while (document.getElementById(id)) id = base + "-" + n++;
        section.id = id;
      }
      if (!byGroup[group]) byGroup[group] = section;
    });
    var firstOf = function (groups) {
      for (var i = 0; i < groups.length; i++) if (byGroup[groups[i]]) return byGroup[groups[i]];
      return null;
    };
    var navSection = byGroup["navegacion"];
    var navOffset = function () {
      if (!navSection) return 0;
      var stuck = navSection.classList.contains("is-stuck");
      navSection.classList.add("is-stuck", "is-measuring");
      var h = navSection.offsetHeight;
      navSection.classList.remove("is-measuring");
      if (!stuck) navSection.classList.remove("is-stuck");
      return h;
    };
    if (navSection) {
      var syncNav = function () {
        var prev = navSection.previousElementSibling;
        var naturalTop = prev ? prev.getBoundingClientRect().bottom + window.pageYOffset : 0;
        navSection.classList.toggle("is-stuck", window.pageYOffset > naturalTop + 40);
      };
      var syncNavHeight = function () {
        document.documentElement.style.setProperty("--nx-nav-h", navOffset() + "px");
      };
      syncNav();
      syncNavHeight();
      window.addEventListener("scroll", syncNav, { passive: true });
      window.addEventListener("resize", syncNavHeight);
    }
    var contactSection = firstOf(CONTACT);
    var mailLink = document.querySelector(".landing-page a[href^='mailto:']");
    var contactHref = contactSection ? "#" + contactSection.id : mailLink ? mailLink.getAttribute("href") : "#" + landingSections[0].id;
    var plainText = function (el) {
      return (el.textContent || el.getAttribute("aria-label") || "").trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
    };
    var resolveLink = function (text) {
      for (var i = 0; i < LINK_RULES.length; i++) {
        if (LINK_RULES[i][0].test(text)) return { contact: LINK_RULES[i][1] === CONTACT, section: firstOf(LINK_RULES[i][1]) };
      }
      return null;
    };

    document.querySelectorAll(".landing-page > section[data-module] a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      var own = a.closest("section[data-module]");
      var isHash = href.charAt(0) === "#";
      if (a.hasAttribute("data-bs-toggle") || a.hasAttribute("data-bs-slide") || a.hasAttribute("role") && a.getAttribute("role") === "button") return;
      if (isHash && href.length > 1 && document.getElementById(href.slice(1))) return;
      if (!isHash && href.indexOf("mailto:") !== 0) return;
      var text = plainText(a);
      var hit = a.classList.contains("nx-brand") ? { section: landingSections[0] } : resolveLink(text);
      var target = hit && hit.section;
      if (!isHash) {
        if (!target || hit.contact || target === own) return;
      } else if (!target || (target === own && target !== landingSections[0] && target !== contactSection)) {
        a.setAttribute("href", contactHref);
        return;
      }
      a.setAttribute("href", "#" + target.id);
    });

    document.addEventListener("click", function (e) {
      var a = e.target.closest(".landing-page a[href^='#']");
      if (!a || a.getAttribute("href").length < 2) return;
      var target = document.getElementById(a.getAttribute("href").slice(1));
      if (!target || landingSections.indexOf(target) === -1) return;
      e.preventDefault();
      if (a.classList.contains("nav-link")) {
        a.closest("nav, header, .nx").querySelectorAll(".nav-link.is-active").forEach(function (l) { l.classList.remove("is-active"); });
        a.classList.add("is-active");
      }
      if (history.replaceState) history.replaceState(null, "", "#" + target.id);
      var pick = a.getAttribute("data-filter-pick");
      var filterBtn = pick && target.querySelector('[data-filter="' + pick + '"]');
      if (filterBtn && !filterBtn.classList.contains("is-on")) filterBtn.click();
      var go = function () {
        var top = target === landingSections[0] ? 0 : target.getBoundingClientRect().top + window.pageYOffset - navOffset();
        window.scrollTo({ top: top, behavior: "smooth" });
      };
      var open = a.closest(".offcanvas.show, .collapse.show");
      var isOffcanvas = open && open.classList.contains("offcanvas");
      var Ctor = open && window.bootstrap && (isOffcanvas ? window.bootstrap.Offcanvas : window.bootstrap.Collapse);
      var inst = Ctor && Ctor.getInstance(open);
      if (!inst) { go(); return; }
      open.addEventListener(isOffcanvas ? "hidden.bs.offcanvas" : "hidden.bs.collapse", go, { once: true });
      inst.hide();
    });

    if (location.hash.length > 1) {
      var initial = document.getElementById(location.hash.slice(1));
      if (initial && landingSections.indexOf(initial) !== -1) {
        setTimeout(function () { window.scrollTo({ top: initial.getBoundingClientRect().top + window.pageYOffset - navOffset(), behavior: "instant" }); }, 0);
      }
    }
  }

  var animMode = document.body.getAttribute("data-anim");
  if (animMode && !document.body.classList.contains("has-tools") && "IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var animBlocks = [].slice.call(document.querySelectorAll(".mq-block")).filter(function (b) {
      return !b.querySelector(".nx-nav, .nx-wa");
    });
    document.body.classList.add("lz-anim");
    animBlocks.forEach(function (b) {
      b.classList.add("lz-pre");
      b.querySelectorAll(".row").forEach(function (row) {
        [].forEach.call(row.children, function (c, i) { c.style.setProperty("--lz-i", Math.min(i, 8)); });
      });
      var texts = [].filter.call(b.querySelectorAll("h1, h2, .nx-display, .nx-kicker, .nx-lead"), function (el) {
        return !el.closest(".accordion, .modal, .lz-txt");
      });
      texts.forEach(function (el, i) {
        el.classList.add("lz-txt");
        el.style.setProperty("--lz-t", Math.min(i, 5));
      });
    });
    var animIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.remove("lz-pre");
        en.target.classList.add("lz-in");
        animIo.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    animBlocks.forEach(function (b) { animIo.observe(b); });
  }
})();
