(function () {
  "use strict";

  /* En una landing publicada los formularios envían la consulta; en las maquetas y la vista previa son de muestra */
  var leadMeta = document.querySelector('meta[name="lz-landing"]');
  var LEAD_FAIL = "No se pudo enviar. Revisá la conexión y probá de nuevo.";

  function leadData(form, extra) {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.name === "web" || el.disabled || el.type === "submit" || el.type === "button") return;
      if (el.type === "checkbox") { data[el.name] = el.checked; return; }
      if (el.type === "radio" && !el.checked) return;
      var value = el.tagName === "SELECT" && el.selectedIndex > -1 ? el.options[el.selectedIndex].text : el.value;
      if (String(value).trim()) data[el.name] = value;
    });
    Object.keys(extra || {}).forEach(function (k) {
      if (!/_iso$/.test(k) && extra[k] && data[k] == null) data[k] = extra[k];
    });
    return data;
  }

  function sendLead(form, tipo, extra) {
    if (!leadMeta) return Promise.resolve(true);
    var trap = form.querySelector('[name="web"]');
    var body = {
      landing: leadMeta.getAttribute("content"),
      tipo: tipo,
      datos: leadData(form, extra),
      origen: [location.search.replace(/^\?/, ""), document.referrer ? "desde " + document.referrer.replace(/^https?:\/\//, "").split("/")[0] : ""].filter(Boolean).join(" · "),
      web: trap ? trap.value : ""
    };
    return fetch("/api/consultas/nueva", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true })
      .then(function (r) {
        if (r.ok) track("consulta", tipo);
        return r.ok;
      }, function () { return false; });
  }

  /* Conversiones para Analytics, Tag Manager y Meta (si el cliente los cargó) */
  function track(kind, detail) {
    try {
      if (window.dataLayer) window.dataLayer.push({ event: "lz_" + kind, lz_detalle: detail || "" });
      if (window.gtag) window.gtag("event", kind === "consulta" ? "generate_lead" : "contact", { method: detail || kind });
      if (window.fbq) window.fbq("track", kind === "consulta" ? "Lead" : "Contact");
    } catch (e) { /* la medición nunca frena a la landing */ }
  }

  if (leadMeta) {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href*="wa.me/"], a[href^="tel:"], a[href^="mailto:"]');
      if (a) track("contacto", /wa\.me/.test(a.href) ? "whatsapp" : /^tel:/.test(a.href) ? "telefono" : "email");
    }, true);
    document.querySelectorAll(".nx-note").forEach(function (el) { el.remove(); });
    document.querySelectorAll("[data-form-msg]").forEach(function (el) { el.textContent = ""; });
    document.querySelectorAll("[data-demo-form], [data-book-form]").forEach(function (form) {
      var trap = document.createElement("input");
      trap.type = "text";
      trap.name = "web";
      trap.tabIndex = -1;
      trap.autocomplete = "off";
      trap.setAttribute("aria-hidden", "true");
      trap.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0";
      form.appendChild(trap);
    });
  }

  document.querySelectorAll("[data-search-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var form = btn.closest("[data-nav-search]");
      form.classList.toggle("is-open");
      var input = form.querySelector("input");
      if (form.classList.contains("is-open")) input.focus();
    });
  });

  document.querySelectorAll("[data-nav-search]").forEach(function (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); });
  });

  document.querySelectorAll("[data-tabs]").forEach(function (root) {
    var buttons = root.querySelectorAll("[data-tab]");
    var panels = root.querySelectorAll("[data-panel]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-tab");
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        panels.forEach(function (p) {
          p.classList.toggle("is-on", p.getAttribute("data-panel") === id);
        });
      });
    });
  });

  document.querySelectorAll("[data-filter-group]").forEach(function (root) {
    var buttons = root.querySelectorAll("[data-filter]");
    var items = root.querySelectorAll("[data-item]");
    var empty = root.querySelector("[data-empty]");
    var paged = root.hasAttribute("data-pager");
    var homes = Array.prototype.map.call(items, function (item) { return item.parentNode; });
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tag = btn.getAttribute("data-filter");
        buttons.forEach(function (b) { b.classList.toggle("is-on", b === btn); });
        var shown = 0;
        items.forEach(function (item) {
          var tags = (item.getAttribute("data-tags") || "").split(/\s+/);
          var ok = tag === "todos" || tags.indexOf(tag) !== -1;
          item.hidden = !ok;
          if (ok) shown += 1;
        });
        if (empty) empty.style.display = shown ? "none" : "block";
        if (paged) {
          var filtered = tag !== "todos";
          var first = homes[0];
          items.forEach(function (item, idx) { (filtered ? first : homes[idx]).appendChild(item); });
          root.classList.toggle("is-filtered", filtered);
        }
      });
    });
  });

  document.querySelectorAll("[data-heart]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var on = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", on ? "false" : "true");
      btn.innerHTML = on ? '<i class="bi bi-heart"></i>' : '<i class="bi bi-heart-fill"></i>';
    });
  });

  document.querySelectorAll("[data-swatches]").forEach(function (group) {
    group.querySelectorAll(".swatch").forEach(function (dot) {
      dot.addEventListener("click", function () {
        group.querySelectorAll(".swatch").forEach(function (d) { d.classList.remove("is-on"); });
        dot.classList.add("is-on");
      });
    });
  });

  var videoModal = document.getElementById("videoModal");
  if (videoModal) {
    var modal = new bootstrap.Modal(videoModal);
    var titleEl = videoModal.querySelector("[data-video-title]");
    document.querySelectorAll("[data-video]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        titleEl.textContent = btn.getAttribute("data-video") || "Video";
        modal.show();
      });
    });
  }

  document.querySelectorAll("[data-scroller]").forEach(function (root) {
    var track = root.querySelector("[data-track]");
    var count = root.querySelector("[data-count]");
    var bar = root.querySelector("[data-bar]");
    if (!track) return;
    function update() {
      var items = Array.prototype.filter.call(track.children, function (el) { return !el.hidden; });
      if (!items.length) return;
      var gap = 16;
      var w = items[0].getBoundingClientRect().width + gap;
      var index = Math.min(items.length, Math.round(track.scrollLeft / w) + 1);
      if (count) {
        count.textContent = String(index).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
      }
      if (bar) bar.style.width = Math.max(12, (index / items.length) * 100) + "%";
    }
    root.querySelectorAll("[data-dir]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = track.querySelector(":scope > :not([hidden])");
        var delta = item ? item.getBoundingClientRect().width + 16 : 280;
        track.scrollBy({ left: btn.getAttribute("data-dir") === "next" ? delta : -delta, behavior: "smooth" });
      });
    });
    track.addEventListener("scroll", update, { passive: true });
    update();
  });

  document.querySelectorAll("[data-bento]").forEach(function (root) {
    var dialog = root.querySelector("[data-lightbox-dialog]");
    if (!dialog || typeof dialog.showModal !== "function") return;
    var tiles = root.querySelectorAll("[data-lightbox]");
    var img = dialog.querySelector("[data-lb-img]");
    var copy = dialog.querySelector("[data-lb-copy]");
    var title = dialog.querySelector("[data-lb-title]");
    var count = dialog.querySelector("[data-lb-count]");
    var list = [];
    var index = 0;
    function render() {
      var tile = list[index];
      var src = tile.querySelector("img");
      img.src = src.getAttribute("src");
      img.alt = src.alt;
      copy.textContent = tile.getAttribute("data-copy") || "";
      title.textContent = tile.getAttribute("data-title") || "";
      count.textContent = String(index + 1).padStart(2, "0") + " / " + String(list.length).padStart(2, "0");
    }
    function step(dir) {
      index = (index + dir + list.length) % list.length;
      render();
    }
    tiles.forEach(function (tile) {
      tile.addEventListener("click", function () {
        list = Array.prototype.filter.call(tiles, function (t) { return !t.hidden; });
        index = Math.max(0, list.indexOf(tile));
        render();
        dialog.showModal();
      });
    });
    dialog.querySelectorAll("[data-lb-dir]").forEach(function (btn) {
      btn.addEventListener("click", function () { step(Number(btn.getAttribute("data-lb-dir"))); });
    });
    dialog.querySelector("[data-lb-close]").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    });
  });

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

  document.querySelectorAll("[data-map]").forEach(function (root) {
    var stage = root.querySelector("[data-map-stage]");
    var scale = 1;
    function paint() {
      stage.style.transform = "scale(" + scale + ")";
      stage.style.transformOrigin = "center center";
    }
    root.querySelectorAll("[data-zoom]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        scale = btn.getAttribute("data-zoom") === "in" ? Math.min(1.8, scale + 0.2) : Math.max(1, scale - 0.2);
        paint();
      });
    });
  });

  document.querySelectorAll("[data-pager]").forEach(function (root) {
    var pages = root.querySelectorAll("[data-page]");
    var count = root.querySelector("[data-count]");
    var i = 0;
    function show(n) {
      i = (n + pages.length) % pages.length;
      pages.forEach(function (p, idx) { p.hidden = idx !== i; });
      if (count) count.textContent = String(i + 1).padStart(2, "0") + " / " + String(pages.length).padStart(2, "0");
    }
    root.querySelectorAll("[data-dir]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        show(i + (btn.getAttribute("data-dir") === "next" ? 1 : -1));
      });
    });
    show(0);
  });

  function withTransition(apply) {
    if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }

  document.querySelectorAll("[data-split-toggle]").forEach(function (group) {
    var scope = group.closest(".mq-block") || document;
    var buttons = group.querySelectorAll("[data-split-side]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var side = btn.getAttribute("data-split-side");
        withTransition(function () {
          scope.querySelectorAll("[data-media]").forEach(function (el) { el.setAttribute("data-media", side); });
          buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        });
      });
    });
  });

  function setWidth(block, modules, mode) {
    block.setAttribute("data-width", mode);
    modules.forEach(function (el) { el.setAttribute("data-width", mode); });
  }

  document.querySelectorAll(".mq-block").forEach(function (block) {
    var caption = block.querySelector(".mq-caption");
    var modules = Array.prototype.filter.call(block.querySelectorAll(".mq-frame .nx"), function (el) {
      return !el.parentElement.closest(".nx");
    });
    if (!caption || !modules.length) return;

    var initial = modules[0].getAttribute("data-width") === "full" ? "full" : "contained";
    var tools = document.createElement("div");
    tools.className = "mq-tools";
    caption.querySelectorAll(".split-toggle").forEach(function (t) { tools.appendChild(t); });

    var group = document.createElement("div");
    group.className = "split-toggle";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Ancho del módulo");
    [["contained", "bi-layout-three-columns", "Con márgenes"], ["full", "bi-arrows-angle-expand", "Ancho completo"]].forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-width-set", opt[0]);
      btn.setAttribute("aria-pressed", String(opt[0] === initial));
      btn.innerHTML = '<i class="bi ' + opt[1] + '"></i> ' + opt[2];
      group.appendChild(btn);
    });
    tools.appendChild(group);
    caption.appendChild(tools);

    setWidth(block, modules, initial);
    var buttons = group.querySelectorAll("button");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        withTransition(function () {
          setWidth(block, modules, btn.getAttribute("data-width-set"));
          buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        });
      });
    });
  });
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.documentElement.classList.add("mq-ready"); });
  });

  document.querySelectorAll("[data-cmp]").forEach(function (root) {
    var picks = root.querySelectorAll("[data-pick]");
    picks.forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.setAttribute("data-show", btn.getAttribute("data-pick"));
        picks.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      });
    });
  });

  document.querySelectorAll("[data-demo-form]").forEach(function (form) {
    var msg = form.querySelector("[data-form-msg]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;
      sendLead(form, "contacto").then(function (ok) {
        if (btn) btn.disabled = false;
        if (msg) msg.textContent = ok ? "¡Gracias! Te escribimos a la brevedad." : LEAD_FAIL;
        if (ok) form.reset();
      });
    });
  });

  /* Reserva de turnos: demo sin envío */
  function isoDate(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function longDate(d) {
    return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  }
  function tomorrow() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d;
  }

  document.querySelectorAll("[data-booking]").forEach(function (root) {
    var form = root.matches("[data-book-form]") ? root : root.querySelector("[data-book-form]");
    var steps = Array.prototype.slice.call(root.querySelectorAll("[data-book-step]"));
    var stepItems = root.querySelectorAll("[data-book-steps] li");
    var nextBtn = root.querySelector("[data-book-next]");
    var prevBtn = root.querySelector("[data-book-prev]");
    var msg = root.querySelector("[data-book-msg]");
    var cal = root.querySelector("[data-book-cal]");
    var values = {};
    var current = 0;
    var calMonth = tomorrow();
    calMonth.setDate(1);

    function render() {
      root.querySelectorAll("[data-book-out]").forEach(function (el) {
        var v = values[el.getAttribute("data-book-out")];
        el.textContent = v || el.getAttribute("data-empty") || "";
        el.classList.toggle("is-empty", !v);
      });
      if (steps.length) {
        var need = (steps[current].getAttribute("data-book-requires") || "").split(",").filter(Boolean);
        nextBtn.disabled = need.some(function (k) { return !values[k]; });
      }
    }

    function say(text) { if (msg) msg.textContent = text || ""; }

    function busySlots() {
      var seed = values.dia_iso || "";
      root.querySelectorAll("[data-book-slots] [data-book-pick]").forEach(function (btn, i) {
        if (!seed) return;
        var hash = 0;
        (seed + btn.textContent).split("").forEach(function (c) { hash = (hash * 31 + c.charCodeAt(0)) % 997; });
        var busy = hash % 4 === 0 && i > 0;
        btn.disabled = busy;
        btn.title = busy ? "Ocupado" : "";
        if (busy && btn.getAttribute("aria-pressed") === "true") {
          btn.setAttribute("aria-pressed", "false");
          values.horario = "";
        }
      });
    }

    function pick(btn) {
      var name = btn.getAttribute("data-book-pick");
      root.querySelectorAll('[data-book-pick="' + name + '"]').forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      values[name] = btn.getAttribute("data-label") || btn.querySelector("strong") && btn.querySelector("strong").textContent || btn.textContent.trim();
      if (btn.hasAttribute("data-iso")) values[name + "_iso"] = btn.getAttribute("data-iso");
      (btn.getAttribute("data-book-set") || "").split("|").forEach(function (pair) {
        var i = pair.indexOf(":");
        if (i > 0) values[pair.slice(0, i)] = pair.slice(i + 1);
      });
      if (name === "dia") busySlots();
      say("");
      render();
    }

    function dayButton(d, cls, inner) {
      var iso = isoDate(d);
      var on = values.dia_iso === iso;
      return '<button class="' + cls + '" type="button" data-book-pick="dia" data-iso="' + iso + '" data-label="' + longDate(d) +
        '" aria-pressed="' + on + '" aria-label="' + longDate(d) + '">' + inner + "</button>";
    }

    root.querySelectorAll("[data-book-days]").forEach(function (box) {
      var count = Number(box.getAttribute("data-count")) || 6;
      var d = tomorrow();
      var html = "";
      while (count > 0) {
        if (d.getDay() !== 0) {
          html += dayButton(d, "bk-day",
            "<small>" + d.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "") + "</small>" +
            "<strong>" + d.getDate() + "</strong>" +
            "<small>" + d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "") + "</small>");
          count -= 1;
        }
        d.setDate(d.getDate() + 1);
      }
      box.innerHTML = html;
    });

    function renderCal() {
      if (!cal) return;
      var first = tomorrow();
      var min = new Date(first.getFullYear(), first.getMonth(), 1);
      var max = new Date(min.getFullYear(), min.getMonth() + 2, 1);
      var y = calMonth.getFullYear();
      var m = calMonth.getMonth();
      var title = calMonth.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
      var html = '<div class="bk-cal-head"><button type="button" data-cal="-1" aria-label="Mes anterior"' + (calMonth <= min ? " disabled" : "") + '><i class="bi bi-chevron-left"></i></button>' +
        "<strong>" + title + "</strong>" +
        '<button type="button" data-cal="1" aria-label="Mes siguiente"' + (calMonth >= max ? " disabled" : "") + '><i class="bi bi-chevron-right"></i></button></div>' +
        '<div class="bk-cal-grid">' + ["L", "M", "M", "J", "V", "S", "D"].map(function (w) { return '<span class="bk-cal-dow">' + w + "</span>"; }).join("");
      var offset = (new Date(y, m, 1).getDay() + 6) % 7;
      for (var i = 0; i < offset; i++) html += "<span></span>";
      var days = new Date(y, m + 1, 0).getDate();
      for (var day = 1; day <= days; day++) {
        var d = new Date(y, m, day);
        if (d < first || d.getDay() === 0) html += '<span class="bk-cal-off">' + day + "</span>";
        else html += dayButton(d, "bk-cal-day", String(day));
      }
      cal.innerHTML = html + "</div>";
    }

    function goTo(n) {
      if (!steps.length) return;
      current = Math.max(0, Math.min(steps.length - 1, n));
      steps.forEach(function (s, i) { s.hidden = i !== current; });
      stepItems.forEach(function (li, i) {
        li.classList.toggle("is-on", i === current);
        li.classList.toggle("is-done", i < current);
        var b = li.querySelector("button");
        b.disabled = i > current;
        if (i === current) b.setAttribute("aria-current", "step");
        else b.removeAttribute("aria-current");
      });
      prevBtn.hidden = current === 0;
      var last = current === steps.length - 1;
      nextBtn.innerHTML = last ? 'Confirmar reserva <i class="bi bi-check2"></i>' : 'Continuar <i class="bi bi-arrow-right"></i>';
      say("");
      render();
    }

    function toggleDone(done) {
      root.querySelectorAll("[data-book-hide-on-done]").forEach(function (el) { el.hidden = done; });
      root.querySelectorAll("[data-book-done]").forEach(function (el) { el.hidden = !done; });
      stepItems.forEach(function (li) { li.classList.toggle("is-done", done || li.classList.contains("is-done")); li.querySelector("button").disabled = done; });
    }

    root.addEventListener("click", function (e) {
      var target = e.target.closest("[data-book-pick], [data-cal], [data-book-goto], [data-book-next], [data-book-prev], [data-book-reset], [data-book-ics]");
      if (!target || target.disabled || !root.contains(target)) return;
      if (target.hasAttribute("data-book-pick")) pick(target);
      if (target.hasAttribute("data-cal")) {
        calMonth.setMonth(calMonth.getMonth() + Number(target.getAttribute("data-cal")));
        renderCal();
      }
      if (target.hasAttribute("data-book-goto")) goTo(Number(target.getAttribute("data-book-goto")) - 1);
      if (target.hasAttribute("data-book-prev")) goTo(current - 1);
      if (target.hasAttribute("data-book-next")) {
        if (current === steps.length - 1) form.requestSubmit();
        else goTo(current + 1);
      }
      if (target.hasAttribute("data-book-reset")) {
        form.reset();
        values = {};
        root.querySelectorAll("[data-book-pick]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        toggleDone(false);
        goTo(0);
        renderCal();
        render();
      }
      if (target.hasAttribute("data-book-ics")) downloadIcs();
    });

    root.querySelectorAll("[data-book-field]").forEach(function (field) {
      var name = field.getAttribute("data-book-field");
      field.addEventListener("input", function () {
        if (field.type === "date") {
          values[name] = field.value ? longDate(new Date(field.value + "T00:00")) : "";
        } else if (field.tagName === "SELECT") {
          values[name] = field.value ? field.selectedOptions[0].textContent : "";
        } else {
          values[name] = field.value.trim();
        }
        render();
      });
    });

    root.querySelectorAll("[data-book-date]").forEach(function (input) {
      input.min = isoDate(tomorrow());
      input.addEventListener("input", function () {
        var sunday = input.value && new Date(input.value + "T00:00").getDay() === 0;
        input.setCustomValidity(sunday ? "Los domingos no atendemos. Elegí otro día." : "");
      });
    });

    form.noValidate = true;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (steps.length && current < steps.length - 1) {
        if (!nextBtn.disabled) goTo(current + 1);
        return;
      }
      var labels = { servicio: "el servicio", profesional: "con quién", dia: "el día", horario: "el horario" };
      var missing = (form.getAttribute("data-book-requires") || "").split(",").filter(function (k) { return k && !values[k]; });
      if (missing.length) {
        say("Elegí " + missing.map(function (k) { return labels[k] || k; }).join(" y ") + " para seguir.");
        return;
      }
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var submit = form.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      sendLead(form, "turno", values).then(function (ok) {
        if (submit) submit.disabled = false;
        if (!ok) { say(LEAD_FAIL); return; }
        toggleDone(true);
        render();
      });
    });

    function downloadIcs() {
      if (!values.dia_iso || !values.horario) return;
      var parts = values.horario.split(":");
      var start = new Date(values.dia_iso + "T00:00");
      start.setHours(Number(parts[0]), Number(parts[1]));
      var end = new Date(start.getTime() + (parseInt(values.duracion, 10) || 30) * 60000);
      function stamp(d) { return isoDate(d).replace(/-/g, "") + "T" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0") + "00"; }
      var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lanzate//Turnos//ES", "BEGIN:VEVENT",
        "UID:" + Date.now() + "@example.com", "DTSTART:" + stamp(start), "DTEND:" + stamp(end),
        "SUMMARY:" + (values.servicio || "Turno") + (values.profesional ? " con " + values.profesional : ""),
        "LOCATION:Calle Ejemplo 123, Buenos Aires", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
      a.download = "turno.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }

    renderCal();
    goTo(0);
    render();
  });

  var libBar = document.querySelector(".lib-bar");
  var libHeader = document.querySelector(".lib-header");
  if (libBar && libHeader) {
    var libLinks = Array.prototype.slice.call(document.querySelectorAll("[data-section-link]"));
    var libSections = Array.prototype.slice.call(document.querySelectorAll("[data-section]"));
    function libOffset() {
      var h = libHeader.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--lib-header", h + "px");
      document.documentElement.style.setProperty("--lib-offset", (h + libBar.getBoundingClientRect().height + 16) + "px");
    }
    function libSpy() {
      var line = libHeader.getBoundingClientRect().height + libBar.getBoundingClientRect().height + 24;
      var current = libSections[0];
      libSections.forEach(function (section) {
        if (section.getBoundingClientRect().top <= line) current = section;
      });
      if (!current) return;
      libLinks.forEach(function (link) {
        var on = link.getAttribute("href") === "#" + current.id;
        link.classList.toggle("is-on", on);
        if (on) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
    libOffset();
    libSpy();
    window.addEventListener("resize", libOffset);
    document.addEventListener("scroll", libSpy, { passive: true });
  }

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
