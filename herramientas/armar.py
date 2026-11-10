"""Arma el sitio de Jimena Vidal en _site/ a partir de datos/.

Lo corre GitHub Actions en cada cambio de main (también los que guarda /gestion).
Para verlo en la compu:

  pip install -r herramientas/requirements.txt
  python3 herramientas/armar.py
  python3 -m http.server 8890 -d _site
"""

import hashlib
import json
import os
import re
import shutil
import sys
import unicodedata
from html import escape
from urllib.parse import quote

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

import oferta as piezas  # noqa: E402

REPO = os.path.dirname(AQUI)
DATOS = os.path.join(REPO, "datos")
FOTOS = os.path.join(DATOS, "fotos")
SALIDA = os.path.join(REPO, "_site")
BASE_URL = "https://rosariogebala-cyber.github.io/jimenavidal/"
EMAIL = "info@jimenavidal.tur.ar"
LARGO_MAXIMO = 320


def leer_json(nombre):
    with open(os.path.join(DATOS, nombre), encoding="utf-8") as f:
        return json.load(f)


def escribir(ruta, data):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, "wb") as f:
        f.write(data)


def slug(text):
    text = unicodedata.normalize("NFD", text or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "salida"


def huella(data):
    return hashlib.sha1(data).hexdigest()[:8]


def destacadas(publicadas):
    """Igual que /gestion: sin marcas guardadas, las cuatro primeras van arriba."""
    explicit = any("destacada" in item["datos"] for item in publicadas)
    return {
        item["id"]: bool(item["datos"].get("destacada")) if explicit else index < 4
        for index, item in enumerate(publicadas)
    }


def piezas_de(sitio, ofertas, html):
    """Arma card y PNG de cada promo. Devuelve las cards publicadas y el estado de cada una."""
    brand = piezas.brand_of(sitio["marca"])
    publicadas = sorted((o for o in ofertas if o["estado"] == "publicada"), key=lambda o: o["orden"])
    flags = destacadas(publicadas)
    publicadas.sort(key=lambda o: (0 if flags[o["id"]] else 1, o["orden"]))
    ids_publicadas = [o["id"] for o in publicadas]
    pendientes = [o for o in ofertas if o["estado"] != "publicada"]

    cards, estado = [], {}
    for item in publicadas + pendientes:
        try:
            offer = piezas.build_offer(item["datos"])
        except ValueError as err:
            estado[item["id"]] = {"error": str(err)}
            continue
        meta, detail, alt = piezas.promo_copy(offer)
        if len(detail) > LARGO_MAXIMO or len(meta) > LARGO_MAXIMO or len(offer["destino"]) > 48:
            estado[item["id"]] = {"error": "Los textos quedan muy largos para la pieza."}
            continue
        foto = None
        if item.get("foto"):
            ruta_foto = os.path.join(FOTOS, item["foto"])
            if os.path.exists(ruta_foto):
                with open(ruta_foto, "rb") as f:
                    foto = piezas.photo_from_bytes(f.read())
        card = piezas.card_bytes(offer, brand, foto)
        png = piezas.png_bytes(offer, brand, foto)
        reel = piezas.reel_bytes(offer, brand, foto)
        escribir(os.path.join(SALIDA, "img", "ofertas", item["id"] + ".jpg"), card)
        escribir(os.path.join(SALIDA, "piezas", item["id"] + ".png"), png)
        escribir(os.path.join(SALIDA, "piezas", item["id"] + "-reel.png"), reel)
        src = "img/ofertas/%s.jpg?v=%s" % (item["id"], huella(card))
        nombre = "jimena-vidal-%s" % slug(offer["destino"])
        estado[item["id"]] = {
            "card": src,
            "png": "piezas/%s.png?v=%s" % (item["id"], huella(png)),
            "archivo": nombre + "-post.png",
            "reel": "piezas/%s-reel.png?v=%s" % (item["id"], huella(reel)),
            "archivo_reel": nombre + "-reel.png",
        }
        if item["id"] in ids_publicadas:
            href = piezas.offer_href(html, offer["destino"], offer["estadia"], offer.get("fechas", ""), offer.get("precio", ""))
            cards.append(piezas.promo_card(
                item["id"], src, alt, piezas.card_meta_html(offer), offer["destino"],
                piezas.price_html(offer), piezas.includes_html(offer), detail, href,
                featured=flags[item["id"]], filtros=piezas.filter_tags(offer),
            ))
    return cards, estado


HERO_RE = re.compile(r'(<div id="heroJimena"[^>]*>)(.*?)(<button class="carousel-control-prev")', re.S)


def sin_viuda(texto):
    """Une las dos últimas palabras para que no quede una sola en la última línea."""
    texto = escape(" ".join((texto or "").split()))
    partes = texto.rsplit(" ", 1)
    return "&nbsp;".join(partes) if len(partes) == 2 else texto


def portada(html):
    """Arma el carrusel del hero con datos/hero.json. Sin ese archivo deja el de la landing."""
    ruta = os.path.join(DATOS, "hero.json")
    if not os.path.exists(ruta):
        return html
    with open(ruta, encoding="utf-8") as f:
        slides = [s for s in json.load(f).get("slides", []) if s.get("video") or s.get("foto")]
    if not slides or not HERO_RE.search(html):
        return html
    telefono = (re.search(r"wa\.me/(\d+)", html) or [None, ""])[1]
    puntos, items = [], []
    for i, s in enumerate(slides):
        activo = i == 0
        etiqueta = escape(s.get("etiqueta") or s.get("lugar") or "Portada %d" % (i + 1))
        puntos.append(
            '<button type="button" data-bs-target="#heroJimena" data-bs-slide-to="%d" class="%s"%s aria-label="%s"></button>'
            % (i, "active" if activo else "", ' aria-current="true"' if activo else "", etiqueta))
        descripcion = escape(s.get("descripcion") or "")
        if s.get("foto") and os.path.exists(os.path.join(DATOS, "hero", s["foto"])):
            with open(os.path.join(DATOS, "hero", s["foto"]), "rb") as f:
                data = f.read()
            escribir(os.path.join(SALIDA, "img", "hero", s["foto"]), data)
            medio = '<img class="jv-hero-video" src="img/hero/%s?v=%s" alt="%s">' % (s["foto"], huella(data), descripcion)
        else:
            medio = '<video class="jv-hero-video" muted playsinline loop preload="none" src="%s" aria-label="%s"></video>' % (
                escape(s["video"]), descripcion)
        lugar = '<p class="jv-hero-lugar" aria-hidden="true">%s</p>' % sin_viuda(s["lugar"]) if s.get("lugar") else ""
        if s.get("destacado"):
            titulo = '%s <span class="em">%s</span>' % (escape(s.get("titulo") or ""), sin_viuda(s["destacado"]))
        else:
            titulo = sin_viuda(s.get("titulo"))
        bajada = '<p class="nx-lead">%s</p>' % sin_viuda(s["bajada"]) if s.get("bajada") else ""
        pills = "".join(
            '<span class="nx-pill"><i class="bi %s"></i> %s</span>' % (escape(p.get("icono") or "bi-check2-circle"), escape(p["texto"]))
            for p in s.get("etiquetas") or [] if p.get("texto"))
        boton = ""
        if s.get("boton") and telefono:
            href = "https://wa.me/%s?text=%s" % (telefono, quote(s.get("mensaje") or "Hola, quiero consultar un viaje"))
            boton = '<a class="btn-nx mt-4" href="%s" target="_blank" rel="noopener">%s <i class="bi bi-whatsapp"></i></a>' % (
                escape(href), escape(s["boton"]))
        items.append(
            '<div class="carousel-item%s%s"><div class="nx-hero-slide">%s%s<div class="container"><div class="col-lg-7">'
            '<h2 class="nx-display">%s</h2>%s%s%s</div></div></div></div>' % (
                " jv-quince" if s.get("estilo") == "grande" else "", " active" if activo else "",
                medio, lugar, titulo, bajada, '<div class="nx-pills">%s</div>' % pills if pills else "", boton))
    cuerpo = '<div class="carousel-indicators">%s</div><div class="carousel-inner">%s</div>' % ("".join(puntos), "".join(items))
    return HERO_RE.sub(lambda m: m.group(1) + cuerpo + m.group(3), html, count=1)


def cabecera(sitio):
    imagen = BASE_URL + sitio["imagen"].lstrip("/") if sitio.get("imagen") else ""
    tags = [
        ("name", "description", sitio["descripcion"]),
        ("property", "og:type", "website"),
        ("property", "og:locale", "es_AR"),
        ("property", "og:title", sitio["titulo"]),
        ("property", "og:description", sitio["descripcion"]),
        ("property", "og:site_name", sitio["marca"]["nombre"]),
        ("property", "og:url", BASE_URL),
        ("property", "og:image", imagen),
        ("property", "og:image:alt", sitio["titulo"] if imagen else ""),
        ("name", "twitter:card", "summary_large_image" if imagen else "summary"),
    ]
    out = "".join('<meta %s="%s" content="%s">' % (a, k, escape(v)) for a, k, v in tags if v)
    return out + '<link rel="canonical" href="%s">' % escape(BASE_URL)


MAILTO = """<script>
document.querySelectorAll("[data-mailto-form]").forEach(function (form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = form.querySelector('input[type="email"]');
    var cuerpo = "Hola, quiero que me escriban a " + (email ? email.value : "") + ".";
    location.href = "mailto:%s?subject=" + encodeURIComponent("Consulta desde la web") + "&body=" + encodeURIComponent(cuerpo);
  });
});
</script>""" % EMAIL


def copiar(ruta):
    origen = os.path.join(REPO, ruta)
    if not os.path.exists(origen):
        print("  falta %s" % ruta)
        return
    destino = os.path.join(SALIDA, ruta)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    shutil.copy2(origen, destino)


def armar():
    sitio = leer_json("sitio.json")
    ofertas = leer_json("ofertas.json")
    with open(os.path.join(DATOS, "landing.html"), encoding="utf-8") as f:
        html = f.read()

    if os.path.isdir(SALIDA):
        shutil.rmtree(SALIDA)
    os.makedirs(SALIDA)

    html = portada(html)
    cards, estado = piezas_de(sitio, ofertas, html)
    html = piezas.apply_offers(html, cards, piezas.PUBLIC_NOTE)
    if html is None:
        sys.exit("La landing no tiene sección de promociones.")

    with open(os.path.join(REPO, "maquetas", "js", "oferta-landing.js"), "rb") as f:
        version = huella(f.read())
    html = re.sub(r"<html\b", "<html data-estatico", html, count=1)
    html = html.replace("</head>", cabecera(sitio) + "</head>", 1)
    html = html.replace("data-demo-form", "data-mailto-form")
    html = html.replace(
        "</body>",
        '<script src="maquetas/js/oferta-landing.js?v=%s"></script>%s</body>' % (version, MAILTO),
        1,
    )

    rutas = set()

    def relativa(m):
        ruta = m.group(2)
        rutas.add(ruta.split("?", 1)[0].lstrip("/"))
        return m.group(1) + ruta.lstrip("/")

    html = re.sub(r'((?:src|href|poster)=")(/maquetas/[^"]+)', relativa, html)
    for ruta in sorted(rutas | {"maquetas/js/oferta-landing.js", "assets/modulos/navegacion/compleja.png"}):
        copiar(ruta)
    if sitio.get("imagen"):
        copiar(sitio["imagen"].lstrip("/"))

    gestion = os.path.join(SALIDA, "gestion")
    shutil.copytree(os.path.join(REPO, "gestion"), gestion)
    with open(os.path.join(gestion, "index.html"), encoding="utf-8") as f:
        pagina = f.read()
    for nombre in ("gestion.css", "gestion.js"):
        with open(os.path.join(gestion, nombre), "rb") as f:
            pagina = pagina.replace('"%s"' % nombre, '"%s?v=%s"' % (nombre, huella(f.read())))
    with open(os.path.join(gestion, "index.html"), "w", encoding="utf-8") as f:
        f.write(pagina)
    with open(os.path.join(SALIDA, "gestion", "estado.json"), "w", encoding="utf-8") as f:
        json.dump({"commit": os.environ.get("GITHUB_SHA", ""), "ofertas": estado}, f, ensure_ascii=False)

    with open(os.path.join(SALIDA, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)
    open(os.path.join(SALIDA, ".nojekyll"), "w").close()
    salteadas = [k for k, v in estado.items() if "error" in v]
    print("Listo: %d promos publicadas en _site%s" % (
        len(cards), " (%d sin armar)" % len(salteadas) if salteadas else ""))


if __name__ == "__main__":
    armar()
