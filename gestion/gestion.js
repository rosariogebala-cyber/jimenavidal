/* Gestión de ofertas de Jimena Vidal. Guarda en datos/ del repo y GitHub Actions vuelve a armar el sitio. */
(function () {
  var REPO = "rosariogebala-cyber/jimenavidal";
  var RAMA = "main";
  var API = "https://api.github.com/repos/" + REPO;
  var RAW = "https://raw.githubusercontent.com/" + REPO + "/";
  var CLAVE = "jv-gestion-clave";
  var MAX_DESTACADAS = 4;
  var LADO_FOTO = 1600;

  var token = localStorage.getItem(CLAVE) || sessionStorage.getItem(CLAVE) || "";
  var ofertas = [];
  var publicado = { commit: "", ofertas: {} };
  var ultimoCommit = "";
  var vigilando = null;
  var fotosLocales = {};
  var editando = "";
  var estadoEditando = "";
  var fotoNueva = null;

  var entrar = document.querySelector("[data-entrar]");
  var app = document.querySelector(".jv-app");
  var form = document.querySelector(".jv-form");
  var avisoApp = document.querySelector("[data-app-msg]");
  var avisoForm = form.querySelector("[data-form-msg]");
  var publicando = document.querySelector("[data-publicando]");

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  function say(node, text, tone) {
    node.textContent = text || "";
    node.className = "jv-msg" + (tone ? " is-" + tone : "");
  }

  function gh(path, options) {
    options = options || {};
    var headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (token) headers.Authorization = "Bearer " + token;
    if (options.body) headers["Content-Type"] = "application/json";
    return fetch(API + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    }).then(function (r) {
      return r.text().then(function (text) {
        var data = text ? JSON.parse(text) : {};
        if (r.ok) return data;
        var err = new Error(mensajeDe(r.status, data));
        err.status = r.status;
        throw err;
      });
    }, function () {
      throw new Error("No hay conexión con GitHub. Probá de nuevo en unos segundos.");
    });
  }

  function mensajeDe(status, data) {
    if (status === 401) return "La clave no es válida o venció. Cargala de nuevo.";
    if (status === 403 && /rate limit/i.test(data.message || "")) return "GitHub frenó los pedidos por un rato. Probá en unos minutos.";
    if (status === 403 || status === 404) return "La clave no tiene permiso para guardar en jimenavidal (Contents: Read and write).";
    if (status === 409 || status === 422) return "Otro cambio se guardó al mismo tiempo. Probá de nuevo.";
    return (data && data.message) || "GitHub no pudo completar el pedido.";
  }

  function base64DeTexto(texto) {
    var bytes = new TextEncoder().encode(texto);
    var bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  function textoDeBase64(b64) {
    var bin = atob(b64.replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function leerRama() {
    return gh("/git/ref/heads/" + RAMA).then(function (ref) {
      return gh("/git/commits/" + ref.object.sha).then(function (commit) {
        return { commit: ref.object.sha, arbol: commit.tree.sha };
      });
    });
  }

  function leerOfertas(commit) {
    return gh("/contents/datos/ofertas.json?ref=" + commit).then(function (file) {
      return JSON.parse(textoDeBase64(file.content));
    });
  }

  /* Lee la última versión, aplica el cambio y la guarda en un solo commit. */
  function guardar(cambio, mensaje, intento) {
    var rama, lista, extra;
    return leerRama().then(function (r) {
      rama = r;
      return leerOfertas(rama.commit);
    }).then(function (actual) {
      lista = actual;
      extra = cambio(lista) || {};
      var archivos = extra.archivos || [];
      return Promise.all(archivos.map(function (a) {
        return gh("/git/blobs", { method: "POST", body: { content: a.base64, encoding: "base64" } }).then(function (blob) {
          return { path: a.path, mode: "100644", type: "blob", sha: blob.sha };
        });
      }));
    }).then(function (entradas) {
      entradas.push({ path: "datos/ofertas.json", mode: "100644", type: "blob", content: JSON.stringify(lista, null, 2) + "\n" });
      (extra.borrar || []).forEach(function (path) {
        entradas.push({ path: path, mode: "100644", type: "blob", sha: null });
      });
      return gh("/git/trees", { method: "POST", body: { base_tree: rama.arbol, tree: entradas } });
    }).then(function (arbol) {
      return gh("/git/commits", { method: "POST", body: { message: "Gestión: " + mensaje, tree: arbol.sha, parents: [rama.commit] } });
    }).then(function (commit) {
      return gh("/git/refs/heads/" + RAMA, { method: "PATCH", body: { sha: commit.sha, force: false } }).then(function () {
        return commit.sha;
      });
    }).then(function (sha) {
      ofertas = lista;
      ultimoCommit = sha;
      render();
      vigilarPublicacion(sha);
      return sha;
    }, function (err) {
      if ((err.status === 409 || err.status === 422) && !intento) return guardar(cambio, mensaje, 1);
      throw err;
    });
  }

  function leerPublicado() {
    return fetch("estado.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data && data.ofertas) publicado = data; return publicado; })
      .catch(function () { return publicado; });
  }

  function marcarPublicando(texto, listo) {
    publicando.hidden = !texto;
    publicando.className = "jg-publicando" + (listo ? " is-ok" : "");
    publicando.innerHTML = texto ? (listo ? '<i class="bi bi-check-circle-fill" aria-hidden="true"></i>' : '<span class="jg-giro" aria-hidden="true"></span>') + esc(texto) : "";
  }

  function vigilarPublicacion(sha) {
    clearTimeout(vigilando);
    var inicio = Date.now();
    marcarPublicando("Publicando en el sitio…");
    (function mirar() {
      if (sha !== ultimoCommit) return;
      leerPublicado().then(function (data) {
        if (sha !== ultimoCommit) return;
        if (data.commit === sha) {
          render();
          marcarPublicando("Publicado. Ya se ve en el sitio.", true);
          vigilando = setTimeout(function () { marcarPublicando(""); }, 8000);
          return;
        }
        if (Date.now() - inicio > 6 * 60 * 1000) {
          marcarPublicando("Sigue publicándose. Tocá Actualizar en un rato.");
          return;
        }
        vigilando = setTimeout(mirar, 6000);
      });
    })();
  }

  function de(estado) {
    return ofertas.filter(function (o) { return o.estado === estado; })
      .sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
  }

  function marcas() {
    var pub = de("publicada");
    var explicit = pub.some(function (o) { return "destacada" in (o.datos || {}); });
    var map = {};
    var n = 0;
    pub.forEach(function (o, index) {
      map[o.id] = explicit ? o.datos.destacada === true : index < MAX_DESTACADAS;
      if (map[o.id]) n += 1;
    });
    return { map: map, n: n };
  }

  function estadia(noches) {
    noches = Number(noches) || 0;
    if (!noches) return "";
    return (noches + 1) + " días / " + noches + (noches === 1 ? " noche" : " noches");
  }

  function precioTexto(d) {
    var n = Number(d.precio) || 0;
    if (!n) return "Sin precio";
    return (d.moneda || "USD") + " " + n.toLocaleString("es-AR");
  }

  function icono(act, label, icon, extra) {
    return '<button type="button" data-act="' + act + '" aria-label="' + label + '" title="' + label + '"' + (extra || "") + '><i class="bi bi-' + icon + '" aria-hidden="true"></i></button>';
  }

  function miniatura(o) {
    var pub = publicado.ofertas[o.id];
    if (pub && pub.card) return "../" + pub.card;
    if (fotosLocales[o.id]) return fotosLocales[o.id];
    if (o.foto) return RAW + RAMA + "/datos/fotos/" + o.foto;
    return "";
  }

  function fila(o, index, total, flags) {
    var d = o.datos || {};
    var pub = publicado.ofertas[o.id] || {};
    var estrella = "";
    if (o.estado === "publicada") {
      estrella = flags.map[o.id]
        ? icono("unfeature", "Sacar destacado", "star-fill", ' class="is-on"')
        : icono("featured", "Destacar", "star", flags.n >= MAX_DESTACADAS ? " disabled" : "");
    }
    var png = pub.png
      ? '<a href="../' + esc(pub.png) + '" download="' + esc(pub.archivo || "oferta.png") + '" aria-label="Bajar PNG" title="Bajar PNG"><i class="bi bi-download" aria-hidden="true"></i></a>'
      : '<a aria-disabled="true" aria-label="El PNG está listo cuando termine de publicarse" title="El PNG está listo cuando termine de publicarse"><i class="bi bi-download" aria-hidden="true"></i></a>';
    var src = miniatura(o);
    var art = document.createElement("article");
    art.className = "jv-item";
    art.setAttribute("data-id", o.id);
    art.innerHTML = [
      src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '<span class="jg-sin-foto" aria-hidden="true"><i class="bi bi-image"></i></span>',
      "<div><h3>" + esc(d.destino || "Sin destino") + "</h3>",
      "<p>" + esc(estadia(d.noches)) + "</p>",
      "<p>" + esc(precioTexto(d)) + "</p>",
      pub.error ? '<p class="jg-aviso">No se puede armar: ' + esc(pub.error) + "</p>" : "",
      "</div>",
      '<div class="jv-acts">',
      icono("edit", "Editar", "pencil"),
      png,
      estrella,
      icono("up", "Subir", "arrow-up", index === 0 ? " disabled" : ""),
      icono("down", "Bajar", "arrow-down", index === total - 1 ? " disabled" : ""),
      icono("estado", o.estado === "publicada" ? "Pasar a pendiente" : "Publicar", o.estado === "publicada" ? "archive" : "check-lg"),
      icono("del", "Quitar", "trash"),
      "</div>"
    ].join("");
    return art;
  }

  function render() {
    var flags = marcas();
    ["publicada", "pendiente"].forEach(function (estado) {
      var col = document.querySelector('[data-col="' + estado + '"]');
      var list = col.querySelector("[data-list]");
      var items = de(estado);
      col.querySelector("[data-cuenta]").textContent = items.length ? "(" + items.length + ")" : "";
      list.innerHTML = "";
      if (!items.length) {
        var vacio = document.createElement("p");
        vacio.innerHTML = estado === "publicada" ? "Sin ofertas&nbsp;publicadas." : "Sin ofertas&nbsp;pendientes.";
        list.appendChild(vacio);
        return;
      }
      items.forEach(function (o, index) { list.appendChild(fila(o, index, items.length, flags)); });
    });
  }

  function cargar() {
    say(avisoApp, "Cargando…");
    return Promise.all([leerRama().then(function (r) { return leerOfertas(r.commit).then(function (lista) { return { r: r, lista: lista }; }); }), leerPublicado()])
      .then(function (res) {
        ofertas = res[0].lista;
        render();
        say(avisoApp, "");
        if (publicado.commit && publicado.commit !== res[0].r.commit) {
          ultimoCommit = res[0].r.commit;
          vigilarPublicacion(ultimoCommit);
        }
      });
  }

  function modo(logueado) {
    entrar.hidden = logueado;
    app.hidden = !logueado;
    if (!logueado) return Promise.resolve();
    return cargar().catch(function (err) {
      if (err.status === 401) { salir(); say(entrar.querySelector("[data-clave-msg]"), err.message, "warn"); return; }
      say(avisoApp, err.message, "warn");
    });
  }

  function salir() {
    token = "";
    localStorage.removeItem(CLAVE);
    sessionStorage.removeItem(CLAVE);
    form.hidden = true;
    clearTimeout(vigilando);
    marcarPublicando("");
    modo(false);
  }

  /* Formulario */

  function textoNoches() {
    var n = Number(form.noches.value) || 0;
    form.querySelector("[data-stay]").innerHTML = n
      ? esc(n + (n === 1 ? " noche se publica como " : " noches se publican como ") + estadia(n)).replace(/ (\S+)$/, "&nbsp;$1") + "."
      : "";
  }

  function prepararFoto(file) {
    if (!file) return Promise.resolve(null);
    if (file.size > 15 * 1024 * 1024) return Promise.reject(new Error("La foto pesa más de 15 MB."));
    return new Promise(function (ok, fail) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, LADO_FOTO / Math.max(img.naturalWidth, img.naturalHeight));
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * k);
        canvas.height = Math.round(img.naturalHeight * k);
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        var data = canvas.toDataURL("image/jpeg", 0.86);
        URL.revokeObjectURL(url);
        ok({ vista: data, base64: data.split(",")[1] });
      };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error("No se pudo leer la foto. Probá con un JPG o PNG.")); };
      img.src = url;
    });
  }

  function numero(value) {
    var n = parseInt(String(value || "").replace(/\D/g, ""), 10);
    return isNaN(n) ? 0 : n;
  }

  function datosDelForm() {
    return {
      destino: form.destino.value.trim(),
      noches: numero(form.noches.value),
      origen: form.origen.value.trim(),
      fechas: form.fechas.value.trim(),
      vuelo: form.vuelo.value,
      incluye: Array.prototype.map.call(form.querySelectorAll('input[name="incluye"]:checked'), function (el) { return el.value; }),
      regimen: form.regimen.value,
      moneda: form.moneda.value,
      precio_antes: numero(form.precio_antes.value),
      precio: numero(form.precio.value),
      precio_nota: form.precio_nota.value,
      hotel: form.hotel.value.trim(),
      estrellas: numero(form.estrellas.value)
    };
  }

  function validar(d) {
    if (d.destino.length < 2) return "Escribí el destino.";
    if (d.noches && (d.noches < 1 || d.noches > 21)) return "Las noches tienen que estar entre 1 y 21.";
    if (d.origen && d.origen.length < 2) return "Escribí desde dónde sale.";
    if (d.precio_antes && !d.precio) return "Cargá el precio de ahora. El anterior va tachado al lado.";
    return "";
  }

  function abrir(o) {
    var d = o ? o.datos || {} : {};
    editando = o ? o.id : "";
    estadoEditando = o ? o.estado : "";
    fotoNueva = null;
    form.hidden = false;
    form.querySelector("[data-form-title]").textContent = o ? "Editar oferta" : "Nueva oferta";
    form.querySelector("[data-guardar]").hidden = !o;
    form.querySelector("[data-publicar]").classList.toggle("jv-go", !o);
    form.querySelector("[data-publicar]").hidden = !!o && o.estado === "publicada";
    form.querySelector("[data-pendiente]").hidden = !!o && o.estado === "pendiente";
    form.destino.value = d.destino || "";
    form.noches.value = o ? d.noches || "" : 7;
    form.origen.value = o ? d.origen || "" : "Rosario";
    form.fechas.value = d.fechas || "";
    form.vuelo.value = d.vuelo || "";
    form.regimen.value = d.regimen || "";
    form.moneda.value = d.moneda || "USD";
    form.precio_antes.value = d.precio_antes || "";
    form.precio.value = d.precio || "";
    form.precio_nota.value = d.precio_nota || "";
    form.hotel.value = d.hotel || "";
    form.estrellas.value = d.estrellas ? String(d.estrellas) : "";
    var keys = o ? d.incluye || [] : ["aereo", "hotel"];
    Array.prototype.forEach.call(form.querySelectorAll('input[name="incluye"]'), function (el) {
      el.checked = keys.indexOf(el.value) !== -1;
    });
    form.foto.value = "";
    var preview = form.querySelector(".jv-preview");
    var foto = o && o.foto ? (fotosLocales[o.id] || RAW + RAMA + "/datos/fotos/" + o.foto) : "";
    preview.hidden = !foto;
    if (foto) preview.src = foto; else preview.removeAttribute("src");
    var pieza = form.querySelector(".jg-pieza");
    var pub = o ? publicado.ofertas[o.id] : null;
    pieza.hidden = !(pub && pub.card);
    if (pub && pub.card) pieza.querySelector("img").src = "../" + pub.card;
    textoNoches();
    say(avisoForm, "");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    form.destino.focus({ preventScroll: true });
  }

  function cerrar() {
    form.hidden = true;
    editando = "";
    estadoEditando = "";
    fotoNueva = null;
  }

  function siguienteOrden(lista, estado, sinId) {
    return lista.reduce(function (max, o) {
      return o.estado === estado && o.id !== sinId ? Math.max(max, o.orden || 0) : max;
    }, 0) + 1;
  }

  function nuevoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, "");
    return Date.now().toString(16) + Math.random().toString(16).slice(2, 18);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var accion = (e.submitter && e.submitter.value) || (editando ? "guardar" : "pendiente");
    var estado = accion === "guardar" ? estadoEditando || "pendiente" : accion;
    var datos = datosDelForm();
    var error = validar(datos);
    if (error) { say(avisoForm, error, "warn"); return; }
    var id = editando || nuevoId();
    var esNueva = !editando;
    var foto = fotoNueva;
    var botones = form.querySelectorAll("button");
    Array.prototype.forEach.call(botones, function (b) { b.disabled = true; });
    say(avisoForm, "Guardando…");

    guardar(function (lista) {
      var o = lista.filter(function (x) { return x.id === id; })[0];
      if (!o) {
        if (!esNueva) throw new Error("Esa oferta ya no existe. Tocá Actualizar.");
        o = { id: id, estado: estado, orden: siguienteOrden(lista, estado), foto: "", datos: {} };
        lista.push(o);
      } else if (o.estado !== estado) {
        o.orden = siguienteOrden(lista, estado, id);
        o.estado = estado;
      }
      if ("destacada" in (o.datos || {})) datos.destacada = o.datos.destacada;
      o.datos = datos;
      if (foto) o.foto = id + ".jpg";
      return { archivos: foto ? [{ path: "datos/fotos/" + id + ".jpg", base64: foto.base64 }] : [] };
    }, (esNueva ? "nueva oferta " : "edita ") + datos.destino).then(function () {
      if (foto) fotosLocales[id] = foto.vista;
      cerrar();
      var texto = accion === "guardar" ? "Cambios guardados." : estado === "publicada" ? "Quedó publicada." : "Quedó como pendiente.";
      say(avisoApp, texto + " El sitio se actualiza en uno o dos minutos.", "ok");
    }).catch(function (err) {
      say(avisoForm, err.message, "warn");
    }).then(function () {
      Array.prototype.forEach.call(botones, function (b) { b.disabled = false; });
    });
  });

  form.foto.addEventListener("change", function () {
    var file = form.foto.files[0];
    var preview = form.querySelector(".jv-preview");
    fotoNueva = null;
    if (!file) return;
    prepararFoto(file).then(function (foto) {
      fotoNueva = foto;
      preview.src = foto.vista;
      preview.hidden = false;
      say(avisoForm, "");
    }).catch(function (err) {
      form.foto.value = "";
      say(avisoForm, err.message, "warn");
    });
  });

  [form.precio, form.precio_antes].forEach(function (input) {
    input.addEventListener("input", function () { input.value = input.value.replace(/\D/g, "").slice(0, 9); });
  });
  form.noches.addEventListener("input", textoNoches);
  form.querySelector("[data-cerrar]").addEventListener("click", cerrar);

  /* Acciones de la lista */

  function destacar(id, on) {
    return guardar(function (lista) {
      var pub = lista.filter(function (o) { return o.estado === "publicada"; })
        .sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
      var explicit = pub.some(function (o) { return "destacada" in (o.datos || {}); });
      var n = 0;
      pub.forEach(function (o, index) {
        o.datos = o.datos || {};
        o.datos.destacada = explicit ? o.datos.destacada === true : index < MAX_DESTACADAS;
        if (o.id === id) o.datos.destacada = on;
        if (o.datos.destacada) n += 1;
      });
      if (n > MAX_DESTACADAS) throw new Error("Podés destacar hasta cuatro. Sacá una para destacar esta.");
    }, (on ? "destaca " : "saca destacado ") + nombre(id));
  }

  function mover(id, dir) {
    return guardar(function (lista) {
      var o = lista.filter(function (x) { return x.id === id; })[0];
      if (!o) return;
      var grupo = lista.filter(function (x) { return x.estado === o.estado; })
        .sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
      var i = grupo.indexOf(o);
      var j = i + dir;
      if (j < 0 || j >= grupo.length) return;
      grupo[i] = grupo[j];
      grupo[j] = o;
      grupo.forEach(function (x, k) { x.orden = k + 1; });
    }, "ordena " + nombre(id));
  }

  function cambiarEstado(id) {
    var destino;
    return guardar(function (lista) {
      var o = lista.filter(function (x) { return x.id === id; })[0];
      if (!o) return;
      destino = o.estado === "publicada" ? "pendiente" : "publicada";
      o.orden = siguienteOrden(lista, destino, id);
      o.estado = destino;
    }, (ofertaPor(id).estado === "publicada" ? "pasa a pendiente " : "publica ") + nombre(id)).then(function () {
      say(avisoApp, destino === "publicada" ? "Quedó publicada. El sitio se actualiza en uno o dos minutos." : "Pasó a pendientes. Sale del sitio en uno o dos minutos.", "ok");
    });
  }

  function quitar(id) {
    return guardar(function (lista) {
      var i = lista.findIndex(function (x) { return x.id === id; });
      if (i === -1) return;
      var o = lista.splice(i, 1)[0];
      return { borrar: o.foto ? ["datos/fotos/" + o.foto] : [] };
    }, "quita " + nombre(id)).then(function () {
      say(avisoApp, "Oferta quitada.", "ok");
    });
  }

  function ofertaPor(id) {
    return ofertas.filter(function (o) { return o.id === id; })[0] || { datos: {} };
  }

  function nombre(id) {
    return (ofertaPor(id).datos || {}).destino || "oferta";
  }

  document.querySelector(".jv-cols").addEventListener("click", function (e) {
    var button = e.target.closest("button[data-act]");
    if (!button || button.disabled) return;
    var id = button.closest(".jv-item").getAttribute("data-id");
    var act = button.getAttribute("data-act");
    var job;
    if (act === "edit") { abrir(ofertaPor(id)); return; }
    if (act === "featured") job = destacar(id, true);
    if (act === "unfeature") job = destacar(id, false);
    if (act === "up") job = mover(id, -1);
    if (act === "down") job = mover(id, 1);
    if (act === "estado") job = cambiarEstado(id);
    if (act === "del") {
      if (!window.confirm("¿Quitás la oferta a " + nombre(id) + "?")) return;
      job = quitar(id);
    }
    if (!job) return;
    var botones = document.querySelectorAll(".jv-acts button");
    Array.prototype.forEach.call(botones, function (b) { b.disabled = true; });
    say(avisoApp, "Guardando…");
    job.then(function () {
      if (avisoApp.textContent === "Guardando…") say(avisoApp, "Guardado. El sitio se actualiza en uno o dos minutos.", "ok");
    }).catch(function (err) {
      say(avisoApp, err.message, "warn");
      render();
    });
  });

  document.querySelector(".jv-nueva").addEventListener("click", function () { abrir(null); });
  document.querySelector("[data-salir]").addEventListener("click", salir);
  document.querySelector("[data-recargar]").addEventListener("click", function () {
    cargar().catch(function (err) { say(avisoApp, err.message, "warn"); });
  });

  entrar.addEventListener("submit", function (e) {
    e.preventDefault();
    var button = entrar.querySelector("button");
    var aviso = entrar.querySelector("[data-clave-msg]");
    var clave = entrar.clave.value.trim();
    if (!clave) return;
    button.disabled = true;
    say(aviso, "Revisando la clave…");
    token = clave;
    gh("").then(function (repo) {
      if (repo.permissions && repo.permissions.push === false) throw new Error("Esa cuenta no puede guardar en jimenavidal.");
      (entrar.recordar.checked ? localStorage : sessionStorage).setItem(CLAVE, clave);
      entrar.clave.value = "";
      say(aviso, "");
      return modo(true);
    }).catch(function (err) {
      token = "";
      say(aviso, err.status === 404 ? "Esa clave no ve el repo jimenavidal." : err.message, "warn");
    }).then(function () {
      button.disabled = false;
    });
  });

  modo(!!token);
})();
