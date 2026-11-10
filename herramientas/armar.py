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
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from html import escape
from urllib.parse import quote, quote_plus
from urllib.request import urlopen

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

import oferta as piezas  # noqa: E402

REPO = os.path.dirname(AQUI)
DATOS = os.path.join(REPO, "datos")
FOTOS = os.path.join(DATOS, "fotos")
SALIDA = os.path.join(REPO, "_site")
BASE_URL = "https://rosariogebala-cyber.github.io/jimenavidal/"
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


def hoy():
    """Fecha de hoy en Argentina (UTC-3, sin horario de verano)."""
    return datetime.now(timezone(timedelta(hours=-3))).date().isoformat()


def vencida(item, dia):
    return bool(item.get("hasta")) and item["hasta"] < dia


def destacadas(publicadas):
    """Igual que /gestion: sin marcas guardadas, las cuatro primeras van arriba."""
    explicit = any("destacada" in item["datos"] for item in publicadas)
    return {
        item["id"]: bool(item["datos"].get("destacada")) if explicit else index < 4
        for index, item in enumerate(publicadas)
    }


def motor():
    """Huella del código y las fuentes que dibujan las piezas: si cambian, se vuelven a dibujar todas."""
    h = hashlib.sha1()
    fuentes = os.path.join(AQUI, "fonts")
    for ruta in [os.path.join(AQUI, "oferta.py")] + sorted(os.path.join(fuentes, n) for n in os.listdir(fuentes)):
        with open(ruta, "rb") as f:
            h.update(f.read())
    return h.hexdigest()


def clave_de(item, brand, base):
    """Cambia solo si cambia algo que se ve en las imágenes (destacar u ordenar no cuenta)."""
    datos = {k: v for k, v in item["datos"].items() if k != "destacada"}
    h = hashlib.sha1((base + json.dumps([datos, brand], sort_keys=True, default=str)).encode())
    if item.get("foto"):
        ruta = os.path.join(FOTOS, item["foto"])
        if os.path.exists(ruta):
            with open(ruta, "rb") as f:
                h.update(f.read())
    return h.hexdigest()[:16]


def publicado_antes():
    """estado.json del sitio en vivo, para reusar las imágenes que no cambiaron."""
    try:
        with urlopen(BASE_URL + "gestion/estado.json?t=%d" % time.time(), timeout=8) as r:
            return json.load(r).get("ofertas", {})
    except Exception:
        return {}


def bajar_piezas(previo):
    """Las tres imágenes ya publicadas, verificadas contra su huella. None si falta alguna."""
    def una(ruta):
        camino, _, version = ruta.partition("?v=")
        with urlopen(BASE_URL + camino, timeout=8) as r:
            data = r.read()
        if huella(data) != version:
            raise ValueError(camino)
        return data
    try:
        return [una(previo[k]) for k in ("card", "post", "reel")]
    except Exception:
        return None


def piezas_de(sitio, ofertas, html):
    """Arma card, post y reel de cada promo. Devuelve las cards publicadas y el estado de cada una."""
    brand = piezas.brand_of(sitio["marca"])
    base = motor()
    previos = publicado_antes()
    reusadas = 0
    telefono = (re.search(r"wa\.me/(\d+)", html) or [None, ""])[1]
    dia = hoy()
    publicadas = sorted((o for o in ofertas if o["estado"] == "publicada" and not vencida(o, dia)), key=lambda o: o["orden"])
    flags = destacadas(publicadas)
    publicadas.sort(key=lambda o: (0 if flags[o["id"]] else 1, o["orden"]))
    ids_publicadas = [o["id"] for o in publicadas]
    pendientes = [o for o in ofertas if o["id"] not in ids_publicadas]
    claves = {o["id"]: clave_de(o, brand, base) for o in ofertas}
    iguales = [o["id"] for o in ofertas if (previos.get(o["id"]) or {}).get("clave") == claves[o["id"]]]
    with ThreadPoolExecutor(8) as pool:
        listas_previas = dict(zip(iguales, pool.map(lambda i: bajar_piezas(previos[i]), iguales)))

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
        clave = claves[item["id"]]
        listas = listas_previas.get(item["id"])
        if listas:
            card, post, reel = listas
            reusadas += 1
        else:
            foto = None
            if item.get("foto"):
                ruta_foto = os.path.join(FOTOS, item["foto"])
                if os.path.exists(ruta_foto):
                    with open(ruta_foto, "rb") as f:
                        foto = piezas.photo_from_bytes(f.read())
            card = piezas.card_bytes(offer, brand, foto)
            post = piezas.post_bytes(offer, brand, foto)
            reel = piezas.reel_bytes(offer, brand, foto)
        escribir(os.path.join(SALIDA, "img", "ofertas", item["id"] + ".jpg"), card)
        escribir(os.path.join(SALIDA, "piezas", item["id"] + "-post.jpg"), post)
        escribir(os.path.join(SALIDA, "piezas", item["id"] + "-reel.jpg"), reel)
        src = "img/ofertas/%s.jpg?v=%s" % (item["id"], huella(card))
        nombre = "jimena-vidal-%s" % slug(offer["destino"])
        estado[item["id"]] = {
            "card": src,
            "post": "piezas/%s-post.jpg?v=%s" % (item["id"], huella(post)),
            "archivo_post": nombre + "-post.jpg",
            "reel": "piezas/%s-reel.jpg?v=%s" % (item["id"], huella(reel)),
            "archivo_reel": nombre + "-reel.jpg",
            "clave": clave,
            "texto": piezas.caption(offer, brand, telefono),
        }
        if item["id"] in ids_publicadas:
            href = piezas.offer_href(html, offer["destino"], offer["estadia"], offer.get("fechas", ""), offer.get("precio", ""))
            cards.append(piezas.promo_card(
                item["id"], src, alt, piezas.card_meta_html(offer), offer["destino"],
                piezas.price_html(offer), piezas.includes_html(offer), detail, href,
                featured=flags[item["id"]], filtros=piezas.filter_tags(offer),
                desde=item.get("desde", ""), hasta=item.get("hasta", ""),
            ))
    if reusadas:
        print("Imágenes reusadas del sitio: %d de %d" % (reusadas, len(estado)))
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
        slides = [s for s in json.load(f).get("slides", []) if not s.get("archivada") and (s.get("video") or s.get("foto"))]
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
            boton = '<a class="btn-nx" href="%s" target="_blank" rel="noopener">%s <i class="bi bi-whatsapp" aria-hidden="true"></i></a>' % (
                escape(href), escape(s["boton"]))
        secundario = '<a class="btn-nx-outline" href="#productos">Ver promociones</a>' if activo else ""
        acciones = '<div class="d-flex flex-wrap gap-2 mt-4">%s%s</div>' % (boton, secundario) if boton or secundario else ""
        encabezado = "h1" if activo else "h2"
        items.append(
            '<div class="carousel-item%s%s"><div class="nx-hero-slide">%s%s<div class="container"><div class="col-lg-7">'
            '<%s class="nx-display">%s</%s>%s%s%s</div></div></div></div>' % (
                " jv-quince" if s.get("estilo") == "grande" else "", " active" if activo else "",
                medio, lugar, encabezado, titulo, encabezado, bajada, '<div class="nx-pills">%s</div>' % pills if pills else "", acciones))
    cuerpo = '<div class="carousel-indicators">%s</div><div class="carousel-inner">%s</div>' % ("".join(puntos), "".join(items))
    return HERO_RE.sub(lambda m: m.group(1) + cuerpo + m.group(3), html, count=1)


def solo_digitos(texto):
    return re.sub(r"\D", "", texto or "")


def datos_contacto():
    """Valores de datos/contacto.json listos para la plantilla ({{c.nombre}} en landing.html)."""
    c = leer_json("contacto.json")
    tel = solo_digitos(c.get("telefono"))
    direccion = " ".join((c.get("direccion") or "").split())
    localidad = " ".join((c.get("localidad") or "").split())
    return c, {
        "telefono": escape(c.get("telefono") or ""),
        "tel": ("+" if (c.get("telefono") or "").strip().startswith("+") else "") + tel,
        "wa": solo_digitos(c.get("whatsapp")),
        "wa_texto": quote(c.get("mensaje") or "Hola, quiero hacer una consulta"),
        "horario": sin_viuda(c.get("horario")),
        "respuesta": sin_viuda(c.get("respuesta")),
        "email": escape(c.get("email") or ""),
        "direccion": escape(direccion),
        "localidad": sin_viuda(localidad),
        "ciudad": escape(localidad.split(",")[0].strip()),
        "calle": escape(direccion.split(",")[0].strip()),
        "mapa": quote_plus("%s, %s" % (direccion.split(",")[0].strip(), localidad)),
        "instagram": escape(c.get("instagram") or ""),
        "facebook": escape(c.get("facebook") or ""),
        "legajo": escape(c.get("legajo") or ""),
    }


def con_contacto(html, valores):
    return re.sub(r"\{\{c\.(\w+)\}\}", lambda m: valores[m.group(1)], html)


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
    location.href = "mailto:{{c.email}}?subject=" + encodeURIComponent("Consulta desde la web") + "&body=" + encodeURIComponent(cuerpo);
  });
});
</script>"""


def armar():
    sitio = leer_json("sitio.json")
    ofertas = leer_json("ofertas.json")
    with open(os.path.join(DATOS, "landing.html"), encoding="utf-8") as f:
        html = f.read()
    contacto, valores = datos_contacto()
    sitio["marca"].update(telefono=contacto.get("telefono", ""), instagram=contacto.get("instagram", ""),
                          direccion=", ".join(p for p in (contacto.get("direccion"), contacto.get("localidad")) if p))
    html = con_contacto(html, valores)

    if os.path.isdir(SALIDA):
        shutil.rmtree(SALIDA)
    os.makedirs(SALIDA)

    html = portada(html)
    cards, estado = piezas_de(sitio, ofertas, html)
    html = piezas.apply_offers(html, cards, piezas.PUBLIC_NOTE)
    if html is None:
        sys.exit("La landing no tiene sección de promociones.")

    html = html.replace("</head>", cabecera(sitio) + "</head>", 1)
    html = html.replace("data-demo-form", "data-mailto-form")
    html = html.replace("</body>", '<script src="/assets/js/ofertas.js"></script>%s</body>' % MAILTO, 1)
    html = con_contacto(html, valores)
    html = re.sub(r'<a [^>]*href=""[^>]*>.*?</a>', "", html)
    if "{{c." in html:
        sys.exit("Quedó un dato de contacto sin completar en la landing.")

    def con_version(m):
        ruta = m.group(2).split("?", 1)[0].lstrip("/")
        origen = os.path.join(REPO, ruta)
        if not os.path.exists(origen):
            sys.exit("Falta %s" % ruta)
        if ruta.endswith((".css", ".js")):
            with open(origen, "rb") as f:
                ruta += "?v=" + huella(f.read())
        return m.group(1) + ruta

    html = re.sub(r'((?:src|href|poster)=")(/assets/[^"]+)', con_version, html)
    shutil.copytree(os.path.join(REPO, "assets"), os.path.join(SALIDA, "assets"))

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
