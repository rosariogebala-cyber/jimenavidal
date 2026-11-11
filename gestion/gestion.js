/* Gestión de ofertas y portada de Jimena Vidal. Guarda en datos/ del repo y GitHub Actions vuelve a armar el sitio. */
(function () {
  var REPO = "rosariogebala-cyber/jimenavidal";
  var RAMA = "main";
  var API = "https://api.github.com/repos/" + REPO;
  var RAW = "https://raw.githubusercontent.com/" + REPO + "/";
  var GRAPHQL = "https://api.github.com/graphql";
  var CLAVE = "jv-gestion-clave";
  var MAX_DESTACADAS = 4;
  var LADO_FOTO = 1600;
  var LADO_PORTADA = 1920;
  var OFERTAS = "datos/ofertas.json";
  var PORTADA = "datos/hero.json";
  var CONTACTO = "datos/contacto.json";
  var SIN_PERMISO = "Esta clave puede ver pero no guardar. En GitHub, editá la clave y en Permissions → Contents elegí Read and write. Después tocá Salir y volvé a entrar.";

  var token = localStorage.getItem(CLAVE) || sessionStorage.getItem(CLAVE) || "";
  var ofertas = [];
  var portada = { slides: [] };
  var contacto = {};
  var publicado = { commit: "", ofertas: {} };
  var ultimoCommit = "";
  var vigilando = null;
  var fotosLocales = {};
  var editando = "";
  var estadoEditando = "";
  var fotoNueva = null;
  var fotoOriginal = "";
  var fotoEnProceso = false;
  var soloLectura = false;
  var ocupado = false;

  var entrar = document.querySelector("[data-entrar]");
  var app = document.querySelector(".jv-app");
  var form = document.querySelector("[data-panel=ofertas] .jv-form");
  var vistaOferta = form.querySelector("[data-vista-oferta]");
  var fotoVista = vistaOferta.querySelector("img");
  var formPortada = document.querySelector("[data-form-portada]");
  var avisoApp = document.querySelector("[data-app-msg]");
  var avisoForm = form.querySelector("[data-form-msg]");
  var publicando = document.querySelector("[data-publicando]");

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  var ocultarAviso = null;

  function say(node, text, tone) {
    node.textContent = text || "";
    node.className = (node === avisoApp ? "jg-toast " : "") + "jv-msg" + (tone ? " is-" + tone : "");
    if (node !== avisoApp) return;
    clearTimeout(ocultarAviso);
    if (tone === "ok") ocultarAviso = setTimeout(function () { say(avisoApp, ""); }, 7000);
  }

  /* Un blob suelto no cambia el sitio; sirve para saber si la clave puede escribir. */
  function puedeGuardar() {
    return gh("/git/blobs", { method: "POST", body: { content: "", encoding: "utf-8" } })
      .then(function () { return true; }, function (err) {
        if (err.status === 403 || err.status === 404) return false;
        throw err;
      });
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
    if (status === 403 || status === 404) return SIN_PERMISO;
    if (status === 409 || status === 422) return "Otro cambio se guardó al mismo tiempo. Probá de nuevo.";
    return (data && data.message) || "GitHub no pudo completar el pedido.";
  }

  function base64DeTexto(texto) {
    var bytes = new TextEncoder().encode(texto);
    var bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  function gql(query, variables) {
    return fetch(GRAPHQL, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ query: query, variables: variables }),
      cache: "no-store"
    }).then(function (r) {
      return r.text().then(function (text) {
        var data = text ? JSON.parse(text) : {};
        var err;
        if (!r.ok) {
          err = new Error(mensajeDe(r.status, data));
          err.status = r.status;
          throw err;
        }
        if (data.errors && data.errors.length) {
          var e = data.errors[0];
          var texto = e.message || "";
          err = new Error(texto);
          err.conflicto = /expected branch to point to|expectedHeadOid/i.test(texto);
          err.borrado = /deletion/i.test(texto);
          if (e.type === "FORBIDDEN" || e.type === "NOT_FOUND" || /not accessible|permission/i.test(texto)) err.message = SIN_PERMISO;
          else if (err.conflicto) err.message = "Otro cambio se guardó al mismo tiempo. Probá de nuevo.";
          else if (!texto) err.message = "GitHub no pudo completar el pedido.";
          throw err;
        }
        return data.data;
      });
    }, function () {
      throw new Error("No hay conexión con GitHub. Probá de nuevo en unos segundos.");
    });
  }

  var LEER = "query($duenio: String!, $nombre: String!, $rama: String!, $ofertas: String!, $portada: String!, $contacto: String!) {" +
    " repository(owner: $duenio, name: $nombre) {" +
    " ref(qualifiedName: $rama) { target { oid } }" +
    " ofertas: object(expression: $ofertas) { ... on Blob { text } }" +
    " portada: object(expression: $portada) { ... on Blob { text } }" +
    " contacto: object(expression: $contacto) { ... on Blob { text } } } }";

  var GUARDAR = "mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid } } }";

  /* Una sola consulta: el último commit de la rama y los dos archivos de datos. */
  function leerTodo() {
    return gql(LEER, {
      duenio: REPO.split("/")[0],
      nombre: REPO.split("/")[1],
      rama: "refs/heads/" + RAMA,
      ofertas: RAMA + ":" + OFERTAS,
      portada: RAMA + ":" + PORTADA,
      contacto: RAMA + ":" + CONTACTO
    }).then(function (data) {
      var repo = data.repository;
      if (!repo || !repo.ref) throw new Error(SIN_PERMISO);
      return {
        commit: repo.ref.target.oid,
        ofertas: repo.ofertas ? JSON.parse(repo.ofertas.text) : [],
        portada: repo.portada ? JSON.parse(repo.portada.text) : { slides: [] },
        contacto: repo.contacto ? JSON.parse(repo.contacto.text) : {}
      };
    });
  }

  /* El cambio se ve enseguida; si GitHub no lo acepta, la lista vuelve a como estaba. */
  function alInstante(local, cambio) {
    var copia = JSON.parse(JSON.stringify(local));
    cambio(copia);
    return copia;
  }

  function guardar(cambio, mensaje) {
    var antes = ofertas;
    try {
      ofertas = alInstante(ofertas, cambio);
      render();
    } catch (err) {
      ofertas = antes;
      return Promise.reject(err);
    }
    return guardarEn(OFERTAS, cambio, mensaje).then(function (r) {
      ofertas = r.data;
      render();
      return r.sha;
    }, function (err) {
      ofertas = antes;
      render();
      throw err;
    });
  }

  function guardarPortada(cambio, mensaje) {
    var antes = portada;
    try {
      portada = alInstante(portada, cambio);
      renderPortada();
    } catch (err) {
      portada = antes;
      return Promise.reject(err);
    }
    return guardarEn(PORTADA, cambio, mensaje).then(function (r) {
      portada = r.data;
      renderPortada();
      return r.sha;
    }, function (err) {
      portada = antes;
      renderPortada();
      throw err;
    });
  }

  /* Lee la última versión del archivo, aplica el cambio y lo guarda en un solo commit. */
  function guardarEn(ruta, cambio, mensaje, intento, sinBorrar) {
    var lista;
    return leerTodo().then(function (actual) {
      lista = ruta === OFERTAS ? actual.ofertas : ruta === CONTACTO ? actual.contacto : actual.portada;
      var extra = cambio(lista) || {};
      var altas = (extra.archivos || []).map(function (a) { return { path: a.path, contents: a.base64 }; });
      altas.push({ path: ruta, contents: base64DeTexto(JSON.stringify(lista, null, 2) + "\n") });
      var bajas = sinBorrar ? [] : (extra.borrar || []).map(function (path) { return { path: path }; });
      return gql(GUARDAR, {
        input: {
          branch: { repositoryNameWithOwner: REPO, branchName: RAMA },
          expectedHeadOid: actual.commit,
          message: { headline: "Gestión: " + mensaje },
          fileChanges: { additions: altas, deletions: bajas }
        }
      });
    }).then(function (data) {
      var sha = data.createCommitOnBranch.commit.oid;
      ultimoCommit = sha;
      vigilarPublicacion(sha);
      return { sha: sha, data: lista };
    }, function (err) {
      if (err.conflicto && !intento) return guardarEn(ruta, cambio, mensaje, 1, sinBorrar);
      if (err.borrado && !sinBorrar) return guardarEn(ruta, cambio, mensaje, intento, true);
      throw err;
    });
  }

  function leerPublicado() {
    return fetch("estado.json?t=" + Date.now(), { cache: "no-store", signal: AbortSignal.timeout(10000) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data && data.ofertas) publicado = data; return publicado; })
      .catch(function () { return publicado; });
  }

  function marcarPublicando(texto, listo, detenido) {
    publicando.hidden = !texto;
    publicando.className = "jg-publicando" + (listo ? " is-ok" : "");
    publicando.innerHTML = texto ? (listo ? '<i class="bi bi-check-circle-fill" aria-hidden="true"></i>' : detenido ? '' : '<span class="jg-giro" aria-hidden="true"></span>') + esc(texto) : "";
  }

  function estadoPublicacion(sha) {
    // El repositorio es público: esta consulta no necesita permisos extra de la clave.
    return fetch(API + "/actions/workflows/publicar.yml/runs?head_sha=" + encodeURIComponent(sha) + "&per_page=1", {
      cache: "no-store", signal: AbortSignal.timeout(10000)
    }).then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (data) { return (data.workflow_runs || [])[0] || null; })
      .catch(function () { return null; });
  }

  function vigilarPublicacion(sha) {
    clearTimeout(vigilando);
    var inicio = Date.now();
    marcarPublicando("Publicando en el sitio…");
    (function mirar() {
      if (sha !== ultimoCommit) return;
      Promise.all([leerPublicado(), estadoPublicacion(sha)]).then(function (resultados) {
        var data = resultados[0];
        var ejecucion = resultados[1];
        if (sha !== ultimoCommit) return;
        if (data.commit === sha) {
          render();
          marcarPublicando("Publicado. Ya se ve en el sitio.", true);
          vigilando = setTimeout(function () { marcarPublicando(""); }, 8000);
          return;
        }
        if (ejecucion && ejecucion.status === "completed" && ejecucion.conclusion !== "success") {
          marcarPublicando("Cambios guardados. La publicación falló; el sitio conserva la versión anterior.", false, true);
          return;
        }
        if (Date.now() - inicio > 6 * 60 * 1000) {
          marcarPublicando("Cambios guardados. No pudimos confirmar la publicación. Tocá Actualizar para revisar.", false, true);
          return;
        }
        vigilando = setTimeout(mirar, 3000);
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

  function hoyAr() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  }

  function diaCorto(iso) {
    var p = String(iso || "").split("-");
    return p.length === 3 ? Number(p[2]) + "/" + Number(p[1]) : "";
  }

  /* Cómo está la promo publicada según sus fechas: programada, vigente con fin o vencida. */
  function periodo(o) {
    if (o.estado !== "publicada" || (!o.desde && !o.hasta)) return "";
    var hoy = hoyAr();
    if (o.desde && hoy < o.desde) return '<p class="jg-fecha is-prog"><i class="bi bi-calendar-event" aria-hidden="true"></i> Programada: aparece el&nbsp;' + diaCorto(o.desde) + (o.hasta ? " y se saca después del&nbsp;" + diaCorto(o.hasta) : "") + "</p>";
    if (o.hasta && hoy > o.hasta) return '<p class="jg-fecha is-fin"><i class="bi bi-calendar-x" aria-hidden="true"></i> Vencida el ' + diaCorto(o.hasta) + ": ya no se&nbsp;ve</p>";
    if (o.hasta) return '<p class="jg-fecha"><i class="bi bi-calendar-check" aria-hidden="true"></i> Se ve hasta el&nbsp;' + diaCorto(o.hasta) + "</p>";
    return "";
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

  function descargas(pub, id) {
    if (pub.error) return "";
    if (!pub.reel) return '<p class="jg-bajar-espera">Las imágenes para bajar aparecen cuando termine de&nbsp;publicarse.</p>';
    return '<p class="jg-bajar">' +
      '<a href="../' + esc(pub.reel) + '" download="' + esc(pub.archivo_reel) + '"><i class="bi bi-download" aria-hidden="true"></i> Reel <span>1080×1920</span></a>' +
      '<a href="../' + esc(pub.post) + '" download="' + esc(pub.archivo_post) + '"><i class="bi bi-download" aria-hidden="true"></i> Post <span>1080×1350</span></a>' +
      '<a href="#" class="jg-wa" data-wa="' + esc(id) + '"><i class="bi bi-whatsapp" aria-hidden="true"></i> WhatsApp</a>' +
      (pub.texto ? '<a href="#" class="jg-copiar" data-copiar="' + esc(id) + '"><i class="bi bi-clipboard" aria-hidden="true"></i> Copiar texto</a>' : "") +
      "</p>";
  }

  function copiarTexto(id, link) {
    var texto = (publicado.ofertas[id] || {}).texto || "";
    var listo = function () {
      link.innerHTML = '<i class="bi bi-clipboard-check" aria-hidden="true"></i> Copiado';
      setTimeout(function () { link.innerHTML = '<i class="bi bi-clipboard" aria-hidden="true"></i> Copiar texto'; }, 2500);
      say(avisoApp, "Texto copiado. Pegalo en el epígrafe de Instagram.", "ok");
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).then(listo, function () { window.prompt("Copiá el texto:", texto); });
    } else {
      window.prompt("Copiá el texto:", texto);
    }
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest("[data-copiar]");
    if (!link) return;
    e.preventDefault();
    copiarTexto(link.getAttribute("data-copiar"), link);
  });

  function textoWhatsApp(o) {
    var d = o.datos || {};
    return [
      d.destino,
      estadia(d.noches),
      Number(d.precio) ? "Desde " + precioTexto(d) : "",
      "Más info: " + new URL("../", location.href).href
    ].filter(Boolean).join("\n");
  }

  // Con imagen solo se puede compartir desde el celu (Web Share). En la compu va el texto por WhatsApp Web.
  function enviarWhatsApp(id) {
    var o = ofertaPor(id);
    var pub = publicado.ofertas[id] || {};
    var texto = textoWhatsApp(o);
    var porTexto = function () {
      window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener");
    };
    var celu = window.matchMedia("(pointer: coarse)").matches;
    if (!celu || !navigator.canShare || !pub.reel) { porTexto(); return; }
    fetch("../" + pub.reel).then(function (r) { return r.blob(); }).then(function (blob) {
      var archivo = new File([blob], pub.archivo_reel || "reel.jpg", { type: "image/jpeg" });
      if (!navigator.canShare({ files: [archivo] })) { porTexto(); return; }
      return navigator.share({ files: [archivo], text: texto }).catch(function (err) {
        if (err.name !== "AbortError") porTexto();
      });
    }).catch(porTexto);
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest("[data-wa]");
    if (!link) return;
    e.preventDefault();
    enviarWhatsApp(link.getAttribute("data-wa"));
  });

  function fila(o, index, total, flags) {
    var d = o.datos || {};
    var pub = publicado.ofertas[o.id] || {};
    var estrella = "";
    if (o.estado === "publicada") {
      estrella = flags.map[o.id]
        ? icono("unfeature", "Sacar destacado", "star-fill", ' class="is-on"')
        : icono("featured", "Destacar", "star", flags.n >= MAX_DESTACADAS ? " disabled" : "");
    }
    var src = miniatura(o);
    var art = document.createElement("article");
    art.className = "jv-item";
    art.setAttribute("data-id", o.id);
    art.innerHTML = [
      src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '<span class="jg-sin-foto" aria-hidden="true"><i class="bi bi-image"></i></span>',
      "<div><h3>" + esc(d.destino || "Sin destino") + "</h3>",
      "<p>" + esc(estadia(d.noches)) + "</p>",
      "<p>" + esc(precioTexto(d)) + "</p>",
      periodo(o),
      pub.error ? '<p class="jg-aviso">No se puede armar: ' + esc(pub.error) + "</p>" : "",
      descargas(pub, o.id),
      "</div>",
      '<div class="jv-acts">',
      icono("edit", "Editar", "pencil"),
      icono("dup", "Duplicar", "copy"),
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
    return Promise.all([leerTodo(), leerPublicado()])
      .then(function (res) {
        ofertas = res[0].ofertas;
        portada = res[0].portada;
        contacto = res[0].contacto;
        render();
        renderPortada();
        llenarContacto();
        say(avisoApp, "");
        clearTimeout(vigilando);
        marcarPublicando("");
        if (publicado.commit !== res[0].commit) {
          ultimoCommit = res[0].commit;
          vigilarPublicacion(ultimoCommit);
        }
      });
  }

  function modo(logueado) {
    entrar.hidden = logueado;
    app.hidden = !logueado;
    if (!logueado) return Promise.resolve();
    return Promise.all([cargar(), puedeGuardar()]).then(function (res) {
      var ok = res[1];
      soloLectura = !ok;
      if (soloLectura) say(avisoApp, SIN_PERMISO, "warn");
    }).catch(function (err) {
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

  function prepararFoto(file, lado) {
    if (!file) return Promise.resolve(null);
    if (file.size > 15 * 1024 * 1024) return Promise.reject(new Error("La foto pesa más de 15 MB."));
    return new Promise(function (ok, fail) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, (lado || LADO_FOTO) / Math.max(img.naturalWidth, img.naturalHeight));
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
    if (form.desde.value && form.hasta.value && form.hasta.value < form.desde.value) return "La fecha en que se saca tiene que ser igual o posterior a la fecha en que aparece.";
    return "";
  }

  var vistaVideo = form.querySelector("[data-vista-video]");
  function urlMedio(value, video) {
    try {
      var u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password && (!video || /\.mp4$/i.test(u.pathname));
    } catch (_) { return false; }
  }
  function actualizarVideoVista() {
    var activo = form.tipo_medio.value === "video";
    vistaOferta.querySelector(".jg-vista-foto").hidden = activo;
    form.querySelector("[data-video-campos]").hidden = !activo;
    var link = form.video_oferta.value.trim();
    vistaVideo.hidden = !activo || !urlMedio(link, true);
    if (vistaVideo.hidden) { vistaVideo.pause(); vistaVideo.removeAttribute("src"); }
    else if (vistaVideo.getAttribute("src") !== link) vistaVideo.src = link;
    fotoVista.hidden = !vistaVideo.hidden || !(fotoNueva || fotoOriginal);
    vistaOferta.querySelector(".jg-vista-foto > span").hidden = !vistaVideo.hidden || !!(fotoNueva || fotoOriginal);
    var poster = fotoNueva ? fotoNueva.vista : fotoOriginal;
    if (poster) vistaVideo.poster = poster; else vistaVideo.removeAttribute("poster");
  }
  form.tipo_medio.addEventListener("change", actualizarVideoVista);
  form.video_oferta.addEventListener("change", actualizarVideoVista);
  var cargaFotoId = 0;
  form.querySelector("[data-cargar-foto-url]").addEventListener("click", async function () {
    var link = form.foto_url.value.trim();
    var aviso = form.querySelector("[data-foto-url-msg]");
    if (!urlMedio(link, false)) { aviso.textContent = "Pegá un enlace HTTPS directo a una imagen."; return; }
    var carga = ++cargaFotoId;
    fotoEnProceso = true;
    aviso.textContent = "Descargando foto…";
    try {
      var r = await fetch(link, { credentials: "omit", signal: AbortSignal.timeout(20000) });
      if (!r.ok || !/^image\/(jpeg|png|webp)(;|$)/i.test(r.headers.get("content-type") || "")) throw new Error("imagen");
      if (+r.headers.get("content-length") > 15 * 1024 * 1024) throw new Error("tamaño");
      var blob = await r.blob();
      if (blob.size > 15 * 1024 * 1024) throw new Error("tamaño");
      var foto = await prepararFoto(new File([blob], "foto-enlace", { type: blob.type }));
      if (carga !== cargaFotoId) return;
      fotoNueva = foto;
      form.foto.value = "";
      actualizarFotoVista();
      actualizarVistaOferta();
      aviso.textContent = "Foto cargada. Se guardará al guardar la oferta.";
    } catch (_) {
      if (carga === cargaFotoId) aviso.textContent = "No se pudo descargar. El servidor puede bloquear la carga desde enlaces. Descargá la foto y subila como archivo.";
    } finally { if (carga === cargaFotoId) fotoEnProceso = false; }
  });

  function actualizarFotoVista() {
    var src = fotoNueva ? fotoNueva.vista : fotoOriginal;
    fotoVista.hidden = !src;
    if (src) fotoVista.setAttribute("src", src);
    else fotoVista.removeAttribute("src");
    actualizarVideoVista();
  }

  function hotelCoincideConOrigen(hotel, origen) {
    function palabras(lugar) {
      return new Set(lugar.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/)
        .filter(function (p) { return p.length > 2 && !/^(del|las|los|autonoma|autonomo|ciudad)$/.test(p); }));
    }
    var a = palabras(hotel);
    var b = palabras(origen);
    if (!a.size || !b.size) return false;
    var menor = a.size <= b.size ? a : b;
    var mayor = menor === a ? b : a;
    return Array.from(menor).every(function (p) { return mayor.has(p); });
  }

  function actualizarVistaOferta() {
    var d = datosDelForm();
    vistaOferta.querySelector("[data-vista-destino]").textContent = d.destino || "Nombre del destino";
    vistaOferta.querySelector("[data-vista-fechas]").textContent = [estadia(d.noches), d.fechas].filter(Boolean).join(" · ");
    var estrellas = vistaOferta.querySelector("[data-vista-estrellas]");
    estrellas.textContent = "★".repeat(d.estrellas);
    if (d.estrellas) estrellas.setAttribute("aria-label", d.estrellas + " estrellas");
    else estrellas.removeAttribute("aria-label");

    var precio = vistaOferta.querySelector("[data-vista-precio]");
    precio.textContent = d.precio ? precioTexto(d) : "";
    precio.hidden = !d.precio;
    if (d.precio && d.precio_antes && d.precio_antes !== d.precio) {
      var anterior = document.createElement("s");
      anterior.textContent = precioTexto({ precio: d.precio_antes, moneda: d.moneda });
      precio.prepend(anterior, " ");
    }

    var incluye = vistaOferta.querySelector("[data-vista-incluye]");
    incluye.textContent = "";
    incluye.hidden = !d.incluye.length;
    form.querySelectorAll('input[name="incluye"]:checked').forEach(function (input) {
      var chip = document.createElement("span");
      var icono = document.createElement("i");
      icono.className = "bi bi-" + input.dataset.icono;
      icono.setAttribute("aria-hidden", "true");
      chip.append(icono, " " + input.closest("label").textContent.trim());
      incluye.appendChild(chip);
    });

    var hotel = d.hotel && !hotelCoincideConOrigen(d.hotel, d.origen)
      ? (/^hotel\b/i.test(d.hotel) ? d.hotel : "Hotel " + d.hotel)
      : "";
    var detalle = vistaOferta.querySelector("[data-vista-detalle]");
    detalle.textContent = [d.regimen, d.origen && "Sale de " + d.origen, d.vuelo && "Vuelo " + d.vuelo, hotel, d.precio_nota]
      .filter(Boolean).map(function (texto) { return texto.endsWith(".") ? texto : texto + "."; }).join(" ");
    detalle.hidden = !detalle.textContent;
  }

  var propuestaTexto = null;
  var panelTexto = form.querySelector("[data-importar-texto]");
  var resultadoTexto = form.querySelector("[data-propuesta-texto]");
  var aplicarTexto = form.querySelector("[data-aplicar-texto]");
  form.querySelector("[data-analizar-texto]").addEventListener("click", function () {
    var texto = form.querySelector("[data-texto-proveedor]").value.trim();
    if (!texto) { resultadoTexto.textContent = "Pegá el texto de la oferta."; aplicarTexto.hidden = true; return; }
    propuestaTexto = window.JVTextoOferta(texto);
    var etiquetas = { destino: "Destino", noches: "Noches", origen: "Sale de", fechas: "Fecha de viaje", hotel: "Hotel", estrellas: "Estrellas", regimen: "Régimen", moneda: "Moneda", precio: "Precio", precio_nota: "Plan", vuelo: "Vuelo", incluye: "Incluye" };
    resultadoTexto.textContent = Object.keys(propuestaTexto.datos).map(function (k) {
      var v = propuestaTexto.datos[k];
      return etiquetas[k] + ": " + (Array.isArray(v) ? v.join(", ") || "Revisar manualmente" : v);
    }).join("\n") + "\n\nPara revisar:\n" + propuestaTexto.avisos.concat(["Agregá la foto y revisá todos los datos antes de publicar."]).join("\n");
    aplicarTexto.hidden = false;
  });
  aplicarTexto.addEventListener("click", function () {
    if (!propuestaTexto) return;
    if (!window.confirm("¿Reemplazar los datos de la oferta con esta propuesta? La foto y las fechas de publicación se conservan.")) return;
    ["destino", "noches", "origen", "fechas", "hotel", "estrellas", "regimen", "precio", "precio_antes", "precio_nota", "vuelo"].forEach(function (k) { form[k].value = propuestaTexto.datos[k] || ""; });
    form.moneda.value = propuestaTexto.datos.moneda || "USD";
    form.querySelectorAll('input[name="incluye"]').forEach(function (el) { el.checked = propuestaTexto.datos.incluye.indexOf(el.value) !== -1; });
    textoNoches();
    actualizarVistaOferta();
    say(avisoForm, "Propuesta cargada. Revisá los campos, la moneda, la foto y las fechas antes de guardar.", "warn");
    panelTexto.open = false;
    form.destino.focus();
  });

  function abrir(o) {
    propuestaTexto = null;
    panelTexto.open = false;
    form.querySelector("[data-texto-proveedor]").value = "";
    resultadoTexto.textContent = "";
    aplicarTexto.hidden = true;
    var d = o ? o.datos || {} : {};
    editando = o ? o.id : "";
    estadoEditando = o ? o.estado : "";
    fotoNueva = null;
    fotoEnProceso = false;
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
    form.desde.value = o && o.desde ? o.desde : "";
    form.hasta.value = o && o.hasta ? o.hasta : "";
    var keys = o ? d.incluye || [] : ["aereo", "hotel"];
    Array.prototype.forEach.call(form.querySelectorAll('input[name="incluye"]'), function (el) {
      el.checked = keys.indexOf(el.value) !== -1;
    });
    form.foto.value = "";
    cargaFotoId += 1;
    form.tipo_medio.value = o && o.video ? "video" : "foto";
    form.video_oferta.value = o && o.video || "";
    form.foto_url.value = "";
    form.querySelector("[data-foto-url-msg]").textContent = "El enlace debe permitir descargar la imagen. La foto se guarda en el sitio.";
    fotoOriginal = o && o.foto ? (fotosLocales[o.id] || RAW + RAMA + "/datos/fotos/" + o.foto) : "";
    actualizarFotoVista();
    actualizarVistaOferta();
    var pieza = form.querySelector(".jg-pieza");
    var pub = o ? publicado.ofertas[o.id] : null;
    pieza.hidden = !(pub && pub.card);
    pieza.open = false;
    pieza.querySelectorAll("[data-pieza]").forEach(function (img) {
      var ruta = pub && pub[img.dataset.pieza];
      img.parentElement.hidden = !ruta;
      if (ruta) img.setAttribute("src", "../" + ruta);
      else img.removeAttribute("src");
    });
    pieza.querySelector("[data-bajar]").innerHTML = pub ? descargas(pub, o.id) : "";
    textoNoches();
    say(avisoForm, "");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    form.destino.focus({ preventScroll: true });
  }

  function cerrar() {
    form.hidden = true;
    cargaFotoId += 1;
    vistaVideo.pause();
    editando = "";
    estadoEditando = "";
    fotoNueva = null;
    fotoEnProceso = false;
    form.foto.value = "";
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
    var videoOferta = form.tipo_medio.value === "video" ? form.video_oferta.value.trim() : "";
    var datos = datosDelForm();
    var error = soloLectura ? SIN_PERMISO : validar(datos);
    if (!error && form.tipo_medio.value === "video" && !urlMedio(videoOferta, true)) error = "Pegá un enlace HTTPS directo a un archivo .mp4.";
    if (!error && videoOferta && !fotoNueva && !fotoOriginal) error = "Agregá una foto de portada para el video y las piezas de redes.";
    if (!error && fotoEnProceso) error = "Esperá a que termine de cargar la foto.";
    if (error) { say(avisoForm, error, "warn"); return; }
    var id = editando || nuevoId();
    var esNueva = !editando;
    var foto = fotoNueva;
    var desde = form.desde.value;
    var hasta = form.hasta.value;
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
      if (videoOferta) o.video = videoOferta; else delete o.video;
      if (desde) o.desde = desde; else delete o.desde;
      if (hasta) o.hasta = hasta; else delete o.hasta;
      if (!foto) return { archivos: [] };
      var anterior = o.foto;
      o.foto = id + "-" + Date.now().toString(36) + ".jpg";
      var compartida = lista.some(function (x) { return x !== o && x.foto === anterior; });
      return {
        archivos: [{ path: "datos/fotos/" + o.foto, base64: foto.base64 }],
        borrar: anterior && !compartida ? ["datos/fotos/" + anterior] : []
      };
    }, (esNueva ? "nueva oferta " : "edita ") + datos.destino).then(function () {
      if (foto) fotosLocales[id] = foto.vista;
      cerrar();
      var texto = accion === "guardar" ? "Cambios guardados." : estado === "publicada" ? "Quedó publicada." : "Quedó como pendiente.";
      if (estado === "publicada" && desde && desde > hoyAr()) texto = "Quedó programada: aparece el " + diaCorto(desde) + ".";
      say(avisoApp, texto + " El sitio se actualiza en uno o dos minutos.", "ok");
    }).catch(function (err) {
      say(avisoForm, err.message, "warn");
    }).then(function () {
      Array.prototype.forEach.call(botones, function (b) { b.disabled = false; });
    });
  });

  form.foto.addEventListener("change", function () {
    cargaFotoId += 1;
    var file = form.foto.files[0];
    fotoNueva = null;
    fotoEnProceso = !!file;
    actualizarFotoVista();
    if (!file) return;
    prepararFoto(file).then(function (foto) {
      if (form.foto.files[0] !== file) return;
      fotoNueva = foto;
      fotoEnProceso = false;
      actualizarFotoVista();
      say(avisoForm, "");
    }).catch(function (err) {
      if (form.foto.files[0] !== file) return;
      fotoEnProceso = false;
      form.foto.value = "";
      say(avisoForm, err.message, "warn");
    });
  });

  [form.precio, form.precio_antes].forEach(function (input) {
    input.addEventListener("input", function () { input.value = input.value.replace(/\D/g, "").slice(0, 9); });
  });
  form.noches.addEventListener("input", textoNoches);
  form.addEventListener("input", actualizarVistaOferta);
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
      var compartida = lista.some(function (x) { return x.foto === o.foto; });
      return { borrar: o.foto && !compartida ? ["datos/fotos/" + o.foto] : [] };
    }, "quita " + nombre(id)).then(function () {
      say(avisoApp, "Oferta quitada.", "ok");
    });
  }

  /* La copia usa la misma foto y queda en pendientes, sin fechas ni destacado. */
  function duplicar(id) {
    var copia = nuevoId();
    return guardar(function (lista) {
      var o = lista.filter(function (x) { return x.id === id; })[0];
      if (!o) throw new Error("Esa oferta ya no existe. Tocá Actualizar.");
      var datos = JSON.parse(JSON.stringify(o.datos || {}));
      delete datos.destacada;
      lista.push({ id: copia, estado: "pendiente", orden: siguienteOrden(lista, "pendiente"), foto: o.foto || "", ...(o.video ? { video: o.video } : {}), datos: datos });
    }, "duplica " + nombre(id)).then(function () {
      if (fotosLocales[id]) fotosLocales[copia] = fotosLocales[id];
      abrir(ofertaPor(copia));
      say(avisoApp, "Copia lista en pendientes. Cambiá lo que necesites y publicala.", "ok");
    });
  }

  function ofertaPor(id) {
    return ofertas.filter(function (o) { return o.id === id; })[0] || { datos: {} };
  }

  function nombre(id) {
    return (ofertaPor(id).datos || {}).destino || "oferta";
  }

  document.querySelector("[data-panel=ofertas] .jv-cols").addEventListener("click", function (e) {
    var button = e.target.closest("button[data-act]");
    if (!button || button.disabled) return;
    var id = button.closest(".jv-item").getAttribute("data-id");
    var act = button.getAttribute("data-act");
    var job;
    if (act === "edit") { abrir(ofertaPor(id)); return; }
    if (soloLectura) { say(avisoApp, SIN_PERMISO, "warn"); return; }
    if (ocupado) return;
    if (act === "dup") job = duplicar(id);
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
    ocupado = true;
    button.disabled = true;
    button.classList.add("is-guardando");
    say(avisoApp, "Guardando…");
    job.then(function () {
      if (avisoApp.textContent === "Guardando…") say(avisoApp, "Guardado. El sitio se actualiza en uno o dos minutos.", "ok");
    }).catch(function (err) {
      say(avisoApp, err.message, "warn");
      render();
    }).then(function () {
      ocupado = false;
    });
  });

  document.querySelector("[data-panel=ofertas] .jv-nueva").addEventListener("click", function () { abrir(null); });
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
      return puedeGuardar();
    }).then(function (ok) {
      if (!ok) throw new Error(SIN_PERMISO.replace(" Después tocá Salir y volvé a entrar.", " Después pegala de nuevo acá."));
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

  /* Portada: carrusel del hero */

  var editandoPortada = "";
  var fotoPortada = null;
  var avisoPortada = formPortada.querySelector("[data-form-msg]");

  function sinViuda(texto) {
    return esc(texto).replace(/\s+(\S+)\s*$/, "&nbsp;$1");
  }

  function slides() {
    return (portada && portada.slides) || [];
  }

  function slidePor(id) {
    return slides().filter(function (s) { return s.id === id; })[0];
  }

  function urlFotoPortada(s) {
    return fotosLocales["portada-" + s.id] || RAW + RAMA + "/datos/hero/" + s.foto;
  }

  function filaPortada(s, index, total) {
    var art = document.createElement("article");
    art.className = "jv-item";
    art.setAttribute("data-id", s.id);
    var medio = s.foto
      ? '<img src="' + esc(urlFotoPortada(s)) + '" alt="" loading="lazy">'
      : s.video
        ? '<video src="' + esc(s.video) + '#t=2" muted playsinline preload="metadata" aria-hidden="true"></video>'
        : '<span class="jg-sin-foto" aria-hidden="true"><i class="bi bi-image"></i></span>';
    art.innerHTML = [
      medio,
      "<div><h3>" + sinViuda([s.titulo, s.destacado].filter(Boolean).join(" ") || "Sin título") + "</h3>",
      "<p>" + esc([s.lugar, s.foto ? "Foto" : s.video ? "Video" : ""].filter(Boolean).join(" · ")) + "</p>",
      s.bajada ? "<p>" + sinViuda(s.bajada) + "</p>" : "",
      "</div>",
      '<div class="jv-acts">',
      icono("edit", "Editar", "pencil"),
      s.archivada
        ? icono("restore", "Volver a mostrar", "arrow-counterclockwise") + icono("del", "Borrar para siempre", "trash")
        : icono("up", "Subir", "arrow-up", index === 0 ? " disabled" : "") +
          icono("down", "Bajar", "arrow-down", index === total - 1 ? " disabled" : "") +
          icono("archive", "Archivar", "archive", total <= 1 ? ' disabled title="La portada necesita al menos una diapositiva"' : ""),
      "</div>"
    ].join("");
    return art;
  }

  function enPortada() {
    return slides().filter(function (s) { return !s.archivada; });
  }

  function archivadas() {
    return slides().filter(function (s) { return s.archivada; });
  }

  function listarPortada(list, items, vacio) {
    list.innerHTML = "";
    if (!items.length) {
      var p = document.createElement("p");
      p.innerHTML = vacio;
      list.appendChild(p);
      return;
    }
    items.forEach(function (s, i) { list.appendChild(filaPortada(s, i, items.length)); });
  }

  function renderPortada() {
    var activas = enPortada();
    var guardadas = archivadas();
    document.querySelector("[data-panel=portada] [data-cuenta]").textContent = activas.length ? "(" + activas.length + ")" : "";
    document.querySelector("[data-cuenta-archivadas]").textContent = guardadas.length ? "(" + guardadas.length + ")" : "";
    listarPortada(document.querySelector("[data-list-portada]"), activas, "Sin diapositivas en la&nbsp;portada.");
    listarPortada(document.querySelector("[data-list-archivadas]"), guardadas, "Sin diapositivas&nbsp;archivadas.");
  }

  function vistaMedio(s) {
    var img = formPortada.querySelector("img.jv-preview");
    var video = formPortada.querySelector("video.jv-preview");
    var foto = fotoPortada ? fotoPortada.vista : s && s.foto && !formPortada.quitar_foto.checked ? urlFotoPortada(s) : "";
    var link = formPortada.video.value.trim();
    img.hidden = !foto;
    if (foto) img.src = foto; else img.removeAttribute("src");
    video.hidden = !!foto || !/^https:\/\//.test(link);
    if (!video.hidden && video.getAttribute("src") !== link + "#t=2") video.src = link + "#t=2";
  }

  function abrirPortada(s) {
    editandoPortada = s ? s.id : "";
    fotoPortada = null;
    formPortada.hidden = false;
    formPortada.querySelector("[data-form-title]").textContent = s ? "Editar diapositiva" : "Nueva diapositiva";
    ["titulo", "destacado", "bajada", "video", "lugar", "descripcion", "boton", "etiqueta", "mensaje", "estilo"].forEach(function (k) {
      formPortada[k].value = s ? s[k] || "" : "";
    });
    if (!s) {
      formPortada.boton.value = "Quiero viajar";
      formPortada.mensaje.value = "Hola, quiero consultar un pasaje al exterior";
    }
    var tags = s && s.etiquetas ? s.etiquetas : [];
    [1, 2, 3].forEach(function (n) { formPortada["etiqueta" + n].value = tags[n - 1] ? tags[n - 1].texto : ""; });
    formPortada.foto.value = "";
    formPortada.quitar_foto.checked = false;
    formPortada.querySelector("[data-quitar-foto]").hidden = !(s && s.foto);
    vistaMedio(s);
    say(avisoPortada, "");
    formPortada.scrollIntoView({ behavior: "smooth", block: "start" });
    formPortada.titulo.focus({ preventScroll: true });
  }

  function cerrarPortada() {
    formPortada.hidden = true;
    editandoPortada = "";
    fotoPortada = null;
  }

  formPortada.foto.addEventListener("change", function () {
    var file = formPortada.foto.files[0];
    fotoPortada = null;
    if (!file) { vistaMedio(slidePor(editandoPortada)); return; }
    prepararFoto(file, LADO_PORTADA).then(function (foto) {
      fotoPortada = foto;
      vistaMedio(slidePor(editandoPortada));
      say(avisoPortada, "");
    }).catch(function (err) {
      formPortada.foto.value = "";
      say(avisoPortada, err.message, "warn");
    });
  });
  formPortada.video.addEventListener("change", function () { vistaMedio(slidePor(editandoPortada)); });
  formPortada.quitar_foto.addEventListener("change", function () { vistaMedio(slidePor(editandoPortada)); });
  formPortada.querySelector("[data-cerrar]").addEventListener("click", cerrarPortada);
  document.querySelector("[data-nueva-portada]").addEventListener("click", function () { abrirPortada(null); });

  formPortada.addEventListener("submit", function (e) {
    e.preventDefault();
    var id = editandoPortada || "s" + nuevoId().slice(0, 10);
    var anterior = slidePor(editandoPortada) || {};
    var video = formPortada.video.value.trim();
    var quitarFoto = formPortada.quitar_foto.checked;
    var tieneFoto = !!fotoPortada || (!!anterior.foto && !quitarFoto);
    var error = "";
    if (soloLectura) error = SIN_PERMISO;
    else if (formPortada.titulo.value.trim().length < 2) error = "Escribí el título.";
    else if (video && !/^https:\/\/\S+$/.test(video)) error = "El video tiene que ser un link que empiece con https://";
    else if (!video && !tieneFoto) error = "Pegá el link de un video o cargá una foto.";
    if (error) { say(avisoPortada, error, "warn"); return; }

    var iconos = (anterior.etiquetas || []).map(function (t) { return t.icono; });
    var datos = {
      id: id,
      etiqueta: formPortada.etiqueta.value.trim(),
      video: video,
      foto: fotoPortada ? id + ".jpg" : quitarFoto ? "" : anterior.foto || "",
      descripcion: formPortada.descripcion.value.trim(),
      lugar: formPortada.lugar.value.trim(),
      titulo: formPortada.titulo.value.trim(),
      destacado: formPortada.destacado.value.trim(),
      bajada: formPortada.bajada.value.trim(),
      etiquetas: [1, 2, 3].map(function (n, i) {
        return { icono: iconos[i] || "bi-check2-circle", texto: formPortada["etiqueta" + n].value.trim() };
      }).filter(function (t) { return t.texto; }),
      boton: formPortada.boton.value.trim(),
      mensaje: formPortada.mensaje.value.trim(),
      estilo: formPortada.estilo.value
    };
    if (anterior.archivada) datos.archivada = true;
    var foto = fotoPortada;
    var esNueva = !editandoPortada;
    var botones = formPortada.querySelectorAll("button");
    Array.prototype.forEach.call(botones, function (b) { b.disabled = true; });
    say(avisoPortada, "Guardando…");
    guardarPortada(function (data) {
      data.slides = data.slides || [];
      var i = data.slides.findIndex(function (s) { return s.id === id; });
      var borrar = [];
      if (i === -1) {
        if (!esNueva) throw new Error("Esa diapositiva ya no existe. Tocá Actualizar.");
        data.slides.push(datos);
      } else {
        if (data.slides[i].foto && !datos.foto) borrar.push("datos/hero/" + data.slides[i].foto);
        data.slides[i] = datos;
      }
      return {
        archivos: foto ? [{ path: "datos/hero/" + id + ".jpg", base64: foto.base64 }] : [],
        borrar: borrar
      };
    }, (esNueva ? "nueva diapositiva " : "edita diapositiva ") + datos.titulo).then(function () {
      if (foto) fotosLocales["portada-" + id] = foto.vista;
      cerrarPortada();
      say(avisoApp, "Portada guardada. El sitio se actualiza en uno o dos minutos.", "ok");
    }).catch(function (err) {
      say(avisoPortada, err.message, "warn");
    }).then(function () {
      Array.prototype.forEach.call(botones, function (b) { b.disabled = false; });
    });
  });

  document.querySelector("[data-cols-portada]").addEventListener("click", function (e) {
    var button = e.target.closest("button[data-act]");
    if (!button || button.disabled) return;
    var id = button.closest(".jv-item").getAttribute("data-id");
    var act = button.getAttribute("data-act");
    var s = slidePor(id) || {};
    var nombreSlide = [s.titulo, s.destacado].filter(Boolean).join(" ") || "diapositiva";
    if (act === "edit") { abrirPortada(s); return; }
    if (soloLectura) { say(avisoApp, SIN_PERMISO, "warn"); return; }
    if (ocupado) return;
    var job;
    if (act === "up" || act === "down") {
      var dir = act === "up" ? -1 : 1;
      job = guardarPortada(function (data) {
        var lista = data.slides || [];
        var i = lista.findIndex(function (x) { return x.id === id; });
        if (i === -1) return;
        var j = i + dir;
        while (j >= 0 && j < lista.length && lista[j].archivada) j += dir;
        if (j < 0 || j >= lista.length) return;
        var tmp = lista[i];
        lista[i] = lista[j];
        lista[j] = tmp;
      }, "ordena diapositiva " + nombreSlide);
    }
    if (act === "archive") {
      job = guardarPortada(function (data) {
        var lista = data.slides || [];
        var activas = lista.filter(function (x) { return !x.archivada; });
        if (activas.length <= 1) throw new Error("La portada necesita al menos una diapositiva.");
        var slide = lista.filter(function (x) { return x.id === id; })[0];
        if (slide) slide.archivada = true;
      }, "archiva diapositiva " + nombreSlide);
    }
    if (act === "restore") {
      job = guardarPortada(function (data) {
        var lista = data.slides || [];
        var i = lista.findIndex(function (x) { return x.id === id; });
        if (i === -1) return;
        var slide = lista.splice(i, 1)[0];
        delete slide.archivada;
        lista.push(slide);
      }, "vuelve a mostrar diapositiva " + nombreSlide);
    }
    if (act === "del") {
      if (!window.confirm("¿Borrás para siempre la diapositiva \"" + nombreSlide + "\"? No se puede deshacer.")) return;
      job = guardarPortada(function (data) {
        var lista = data.slides || [];
        var i = lista.findIndex(function (x) { return x.id === id; });
        if (i === -1 || !lista[i].archivada) return;
        var quitada = lista.splice(i, 1)[0];
        return { borrar: quitada.foto ? ["datos/hero/" + quitada.foto] : [] };
      }, "borra diapositiva " + nombreSlide);
    }
    if (!job) return;
    ocupado = true;
    button.disabled = true;
    button.classList.add("is-guardando");
    say(avisoApp, "Guardando…");
    job.then(function () {
      say(avisoApp, "Guardado. El sitio se actualiza en uno o dos minutos.", "ok");
    }).catch(function (err) {
      say(avisoApp, err.message, "warn");
      renderPortada();
    }).then(function () {
      ocupado = false;
    });
  });

  /* Contacto */

  var formContacto = document.querySelector("[data-form-contacto]");
  var avisoContacto = formContacto.querySelector("[data-form-msg]");
  var CAMPOS_CONTACTO = ["telefono", "whatsapp", "mensaje", "horario", "respuesta", "email", "direccion", "localidad", "instagram", "facebook", "legajo"];

  function llenarContacto() {
    CAMPOS_CONTACTO.forEach(function (campo) { formContacto[campo].value = contacto[campo] || ""; });
    say(avisoContacto, "");
  }

  function digitos(texto) {
    return String(texto || "").replace(/\D/g, "");
  }

  function validarContacto(c) {
    if (digitos(c.telefono).length < 8) return "Revisá el teléfono: tiene que tener la característica.";
    var wa = digitos(c.whatsapp);
    if (wa.length < 11 || wa.length > 15) return "Revisá el WhatsApp: va con código de país, por ejemplo +54 9 341 555-1234.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) return "Revisá el email.";
    if (c.direccion.length < 4) return "Escribí la dirección.";
    if (c.localidad.length < 2) return "Escribí la localidad.";
    if (c.horario.length < 4) return "Escribí el horario de atención.";
    if (c.instagram && !/^https:\/\/(www\.)?instagram\.com\//.test(c.instagram)) return "El Instagram tiene que ser un link que empiece con https://www.instagram.com/";
    if (c.facebook && !/^https:\/\/(www\.)?facebook\.com\//.test(c.facebook)) return "El Facebook tiene que ser un link que empiece con https://facebook.com/";
    return "";
  }

  formContacto.addEventListener("submit", function (e) {
    e.preventDefault();
    var nuevo = {};
    CAMPOS_CONTACTO.forEach(function (campo) { nuevo[campo] = formContacto[campo].value.replace(/\s+/g, " ").trim(); });
    var error = soloLectura ? SIN_PERMISO : validarContacto(nuevo);
    if (error) { say(avisoContacto, error, "warn"); return; }
    var boton = formContacto.querySelector("button[type=submit]");
    var antes = contacto;
    boton.disabled = true;
    say(avisoContacto, "Guardando…");
    contacto = nuevo;
    guardarEn(CONTACTO, function (data) {
      CAMPOS_CONTACTO.forEach(function (campo) { data[campo] = nuevo[campo]; });
    }, "datos de contacto").then(function (r) {
      contacto = r.data;
      say(avisoContacto, "");
      say(avisoApp, "Datos de contacto guardados. El sitio se actualiza en uno o dos minutos.", "ok");
    }).catch(function (err) {
      contacto = antes;
      say(avisoContacto, err.message, "warn");
    }).then(function () {
      boton.disabled = false;
    });
  });

  formContacto.querySelector("[data-deshacer]").addEventListener("click", llenarContacto);

  /* Pestañas */

  function mostrarPestaña(nombre) {
    document.querySelectorAll("[data-tab]").forEach(function (tab) {
      tab.setAttribute("aria-selected", String(tab.getAttribute("data-tab") === nombre));
    });
    document.querySelectorAll("[data-panel]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== nombre;
    });
    if (history.replaceState) history.replaceState(null, "", nombre === "ofertas" ? location.pathname : "#" + nombre);
  }

  document.querySelectorAll("[data-tab]").forEach(function (tab) {
    tab.addEventListener("click", function () { mostrarPestaña(tab.getAttribute("data-tab")); });
  });
  if (location.hash === "#portada" || location.hash === "#contacto") mostrarPestaña(location.hash.slice(1));

  modo(!!token);
})();
