/* Lectura local de textos de proveedores. No envía datos a servicios externos. */
(function (root) {
  function extraer(texto) {
    var lineas = texto.split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    var t = texto.replace(/\r/g, ""), d = {}, avisos = [], m;
    function campo(k, re) { var x = t.match(re); if (x) d[k] = x[1].trim(); }
    campo("destino", /(?:^|\n)\s*destino\s*:\s*([^\n]+)/i);
    if (!d.destino && lineas.length) {
      var titulo = lineas[0].replace(/^[^\p{L}\p{N}]+/u, "").split(/[·|]/)[0].trim();
      if (titulo && titulo.length <= 40 && !/\d|oferta|promo|salida|precio|noches/i.test(titulo)) {
        d.destino = titulo; avisos.push("Confirmá el destino tomado de la primera línea.");
      }
    }
    m = t.match(/\b(\d{1,2})\s*noches?\b/i);
    if (m && +m[1] >= 1 && +m[1] <= 21) d.noches = m[1];
    campo("origen", /(?:salida\s+desde|sale\s+de|origen\s*:|desde)\s+([\p{L} .]+?)(?=\s+(?:el|del|\d)|[\n·|,;]|$)/iu);
    campo("fechas", /(?:^|\n)\s*(?:fechas?(?:\s+de\s+viaje)?|salida)\s*:\s*([^\n]+)/i);
    if (!d.fechas) campo("fechas", /\bel\s+(\d{1,2}\s+de\s+[\p{L}]+(?:\s+(?:de\s+)?\d{4})?)/iu);
    if (d.fechas && !/\b20\d{2}\b/.test(d.fechas)) avisos.push("La fecha de viaje no indica el año.");
    campo("hotel", /(?:^|\n)\s*hotel\s*:?\s+([^\n·|]+)/i);
    if (d.hotel) {
      m = d.hotel.match(/\s+(\d)\s*(?:★|\*|estrellas?)/i);
      if (m && +m[1] >= 3 && +m[1] <= 5) d.estrellas = m[1];
      d.hotel = d.hotel.replace(/\s+\d\s*(?:★|\*|estrellas?).*$/i, "").trim();
    }
    if (/all\s*inclusive/i.test(t)) d.regimen = "All inclusive";
    else if (/media\s+pensi[oó]n/i.test(t)) d.regimen = "Media pensión";
    else if (/desayuno/i.test(t) && !/sin\s+desayuno/i.test(t)) d.regimen = "Desayuno";
    var precios = Array.from(t.matchAll(/\b(USD|ARS|EUR|U\$S)\s*([\d][\d.,]*)/gi));
    if (precios.length === 1) {
      d.moneda = precios[0][1].toUpperCase().replace("U$S", "USD");
      var valor = precios[0][2];
      if (/^\d{1,3}(?:[.,]\d{3})+$/.test(valor)) d.precio = valor.replace(/[.,]/g, "");
      else if (/^\d+$/.test(valor)) d.precio = valor;
      else avisos.push("El precio tiene decimales o separadores ambiguos: completalo manualmente.");
    } else if (precios.length > 1) avisos.push("Hay varios precios: elegí manualmente cuál publicar.");
    if (/base\s+doble/i.test(t) && /por\s+persona|por\s+pasajero/i.test(t)) d.precio_nota = "Por pasajero adulto en base doble";
    if (/base\s+triple/i.test(t) && /por\s+persona|por\s+pasajero/i.test(t)) d.precio_nota = "Por pasajero adulto en base triple";
    d.incluye = [];
    var negacion = /\b(?:no|sin|excluye|no incluido|no incluye)\b/i.test(t);
    if (negacion) avisos.push("Hay exclusiones en el texto: revisá y marcá manualmente qué incluye.");
    else {
      var patrones = { aereo: /a[eé]reo|vuelos?/i, traslado: /traslados?/i, excursion: /excursi[oó]n|excursiones|visitas/i, hotel: /hotel|alojamiento/i, desayuno: /desayuno/i, asistencia: /asistencia/i, equipaje: /equipaje/i, guia: /gu[ií]a\s+en\s+espa[ñn]ol/i };
      Object.keys(patrones).forEach(function (k) { if (patrones[k].test(t)) d.incluye.push(k); });
      if (/vuelo\s+directo|a[eé]reo\s+directo/i.test(t)) d.vuelo = "directo";
      else if (/con\s+escala/i.test(t)) d.vuelo = "con escala";
    }
    ["destino", "noches", "origen", "fechas", "precio"].forEach(function (k) { if (!d[k]) avisos.push("Falta completar: " + k + "."); });
    Object.keys(d).forEach(function (k) {
      var max = { destino: 40, origen: 24, fechas: 28, hotel: 32 }[k];
      if (max && d[k].length > max) { delete d[k]; avisos.push("El campo " + k + " es demasiado largo: resumilo manualmente."); }
    });
    return { datos: d, avisos: avisos };
  }
  root.JVTextoOferta = extraer;
})(typeof module === "object" ? module.exports : window);
