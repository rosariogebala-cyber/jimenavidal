"""Pieza de oferta para Instagram y la tarjeta de la landing.

Una imagen de 1080×1350 y otra de 1080×1920 para reels. La foto se ve, con un degradé suave arriba
y un negro al 50% detrás de los íconos. Van juntos al pie, todos del
mismo tamaño y con borde redondeado: el dibujo arriba y el texto debajo.
El precio queda sobre la foto. La tarjeta cuadrada usa la misma pieza.
"""

import base64
import io
import math
import os
import re
import unicodedata
from html import escape
from urllib.parse import quote

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(ROOT, "fonts")

NAVY = (11, 31, 56)
NAVY_DEEP = (7, 20, 38)
ORANGE = (242, 106, 27)
WHITE = (255, 248, 242)
INK = (255, 255, 255)
GRAY = (116, 122, 130)
SAND = (232, 214, 196)
MONEDAS = ("USD", "ARS", "EUR")
STORY = (1080, 1350)
REEL = (1080, 1920)
REEL_SAFE = (250, 340)
CARD = (1200, 1200)

CARD_RE = re.compile(
    r'(<article class="prod-card">.*?<img\b[^>]*\bsrc=")([^"]*)("[^>]*\balt=")([^"]*)("[^>]*>)'
    r'(.*?<p class="meta">)(.*?)(</p>\s*<h3[^>]*>)(.*?)(</h3>\s*<p class="prod-price"[^>]*>)(.*?)(</p>)',
    re.S,
)
NOTE_RE = re.compile(r'(<p class="nx-note">)(.*?)(</p>)', re.S)


def font(name, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)


def clean(value, limit):
    text = " ".join(str(value or "").split())
    if len(text) > limit:
        text = text[:limit].rstrip()
    return text


INCLUYE = (
    ("aereo", "Aéreo", "VUELO"),
    ("equipaje", "Equipaje", "EQUIPAJE"),
    ("traslado", "Traslado", "TRASLADOS"),
    ("excursion", "Excursión", "VISITAS"),
    ("guia", "Guía en español", "GUÍA HABLA HISPANA"),
    ("hotel", "Hotel", "ALOJAMIENTO"),
    ("desayuno", "Desayuno", "DESAYUNO"),
    ("asistencia", "Asistencia", "ASISTENCIA"),
)
PLANES = (
    "",
    "Por pasajero adulto en base doble",
    "Por pasajero adulto en base triple",
    "Plan familiar (2 adulto + 1 menor hasta 11 años)",
    "Plan familiar (2 adulto + 2 menores hasta 11 años)",
)
WEB_ICONS = (
    ("aereo", "airplane", "Vuelo"),
    ("equipaje", "suitcase-lg", "Equipaje"),
    ("traslado", "bus-front", "Traslados"),
    ("excursion", "geo-alt", "Visitas"),
    ("guia", "person", "Guía en español"),
    ("hotel", "building", "Alojamiento"),
    ("desayuno", "cup-hot", "Desayuno"),
    ("asistencia", "plus-lg", "Asistencia"),
)
REGIMENES = ("", "Desayuno", "Media pensión", "All inclusive")


def stay_label(nights):
    days = nights + 1
    day = "1 día" if days == 1 else "%d días" % days
    night = "1 noche" if nights == 1 else "%d noches" % nights
    return "%s / %s" % (day, night)


def phrase(labels):
    words = [label.lower() for label in labels]
    if len(words) <= 1:
        return words[0] if words else ""
    if len(words) == 2:
        return "%s y %s" % (words[0], words[1])
    return "%s y %s" % (", ".join(words[:-1]), words[-1])


def amount_of(value):
    if value is None or value is False or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = int(round(float(value)))
        return number if number > 0 else None
    digits = re.sub(r"\D", "", str(value))
    if not digits:
        return None
    number = int(digits)
    return number if 0 < number <= 999999999 else None


def money(amount, moneda):
    grouped = "{:,}".format(int(amount)).replace(",", ".")
    return "%s %s" % (moneda, grouped)


def build_offer(data):
    """Arma los textos de la pieza a partir del formulario. Lanza ValueError si falta un dato."""
    destino = clean(data.get("destino"), 40)
    origen = clean(data.get("origen"), 24)
    fechas = clean(data.get("fechas"), 28)
    hotel = clean(data.get("hotel"), 32)
    vuelo = vuelo_of(data.get("vuelo"))
    precio_nota = plan_of(data.get("precio_nota"))
    moneda = clean(data.get("moneda") or "USD", 3).upper()
    if moneda not in MONEDAS:
        moneda = "USD"
    antes = amount_of(data.get("precio_antes"))
    ahora = amount_of(data.get("precio"))
    try:
        noches = int(data.get("noches"))
    except (TypeError, ValueError):
        noches = 0
    chosen = data.get("incluye") or []
    if isinstance(chosen, str):
        chosen = [part.strip() for part in chosen.split(",") if part.strip()]
    allowed = {key: (card, flyer) for key, card, flyer in INCLUYE}
    keys, labels, flyer = [], [], []
    for item in chosen:
        key = str(item).strip().lower()
        if key in allowed and key not in keys:
            keys.append(key)
            labels.append(allowed[key][0])
            flyer.append((key, "", allowed[key][1]))
    regimen = clean(data.get("regimen"), 20)
    if regimen not in REGIMENES:
        regimen = ""
    try:
        estrellas = int(data.get("estrellas") or 0)
    except (TypeError, ValueError):
        estrellas = 0
    if estrellas not in (0, 3, 4, 5):
        estrellas = 0
    if len(destino) < 2:
        raise ValueError("Escribí el destino.")
    if noches and not 1 <= noches <= 21:
        raise ValueError("Las noches tienen que estar entre 1 y 21.")
    if origen and len(origen) < 2:
        raise ValueError("Escribí desde dónde sale.")
    if antes and not ahora:
        raise ValueError("Cargá el precio de ahora. El anterior va tachado al lado.")
    if antes and ahora and antes == ahora:
        antes = None
    hotel_linea = ""
    if hotel and estrellas:
        hotel_linea = "%s · %d estrellas" % (hotel, estrellas)
    elif hotel:
        hotel_linea = hotel
    elif estrellas:
        hotel_linea = "%d estrellas" % estrellas
    salida = ""
    if origen and fechas:
        salida = "Sale de %s · %s" % (origen, fechas)
    elif origen:
        salida = "Sale de " + origen
    elif fechas:
        salida = fechas
    return {
        "destino": destino,
        "noches": noches,
        "estadia": stay_label(noches) if noches else "",
        "origen": origen,
        "fechas": fechas,
        "incluye": keys,
        "incluye_linea": " + ".join(labels),
        "incluye_frase": phrase(labels),
        "flyer": flyer_items(flyer, noches, hotel, estrellas, vuelo, origen),
        "regimen": regimen,
        "moneda": moneda,
        "precio_antes": antes,
        "precio_ahora": ahora,
        "precio_antes_texto": money(antes, moneda) if antes and ahora else "",
        "precio": money(ahora, moneda) if ahora else "",
        "consultar": ahora is None,
        "hotel": hotel,
        "estrellas": estrellas,
        "vuelo": vuelo,
        "salida": salida,
        "hotel_linea": hotel_linea,
        "precio_nota": precio_nota,
    }


def vuelo_of(value):
    """Solo dos opciones: directo o con escala."""
    text = clean(value, 28).lower().strip(" .")
    if not text:
        return ""
    if "escala" in text:
        return "con escala"
    if "direct" in text or text.startswith("direc"):
        return "directo"
    return ""


def plan_of(value):
    """Acepta el plan en mayúsculas o en minúsculas y lo deja en minúscula."""
    text = clean(value, 80)
    if not text:
        return ""
    for plan in PLANES:
        if plan and text.lower() == plan.lower():
            return plan
    return ""


def place_words(text):
    """Palabras del lugar, sin tildes ni 'ciudad' o 'autónoma'."""
    raw = unicodedata.normalize("NFKD", str(text or ""))
    raw = "".join(ch for ch in raw if not unicodedata.combining(ch)).lower()
    raw = re.sub(r"[^a-z0-9]+", " ", raw)
    skip = {"de", "del", "la", "las", "el", "los", "y", "en", "al", "autonoma", "autonomo", "ciudad"}
    return {word for word in raw.split() if word not in skip and len(word) > 2}


def same_place(left, right):
    """True si el hotel nombra el mismo lugar que el origen."""
    a, b = place_words(left), place_words(right)
    if not a or not b:
        return False
    small, big = (a, b) if len(a) <= len(b) else (b, a)
    return small <= big


def flyer_items(checked, nights, hotel="", estrellas=0, vuelo="", origen=""):
    """Listado de la pieza. Las noches salen del campo de arriba, no de una tilde."""
    items = list(checked)
    if vuelo and not any(item[0] == "aereo" for item in items):
        items.insert(0, ("aereo", "", "VUELOS"))
    if (hotel or estrellas) and not any(item[0] == "hotel" for item in items):
        items.append(("hotel", "", "ALOJAMIENTO"))
    if nights:
        badge = "%dN" % nights
        label = "1 NOCHE" if nights == 1 else "%d NOCHES" % nights
        items.insert(1 if items else 0, ("nights", badge, label))
    listed = []
    for key, badge, label in items:
        caption, stars = "", 0
        if key == "aereo":
            caption = vuelo
        elif key == "hotel":
            caption = "" if same_place(hotel, origen) else hotel.upper()
            stars = estrellas
        listed.append((key, badge, label, caption, stars))
    return listed


def nb_html(text):
    safe = escape(text)
    cut = safe.rfind(" ")
    if cut < 0:
        return safe
    return safe[:cut] + "&nbsp;" + safe[cut + 1:]


def ig_handle(value):
    text = str(value or "").strip().split("?")[0].rstrip("/")
    if "instagram.com" in text:
        text = text.split("/")[-1]
    text = text.lstrip("@")
    return "@" + text if text else ""


def place_of(client):
    address = client.get("direccion") or ""
    if re.search(r"funes", address, re.I):
        return "Funes"
    parts = [part.strip() for part in address.split(",") if part.strip() and not re.search(r"\d", part)]
    return parts[-1] if parts else ""


def brand_of(client):
    """Colores y firma. Jimena usa el monograma de la cuenta; el resto, su color."""
    primary = str(client.get("color_primario") or "")
    orange = ORANGE
    if re.fullmatch(r"#[0-9a-fA-F]{6}", primary) and client.get("slug") != "jimena-vidal":
        orange = tuple(int(primary[i:i + 2], 16) for i in (1, 3, 5))
    mark = client.get("slug") == "jimena-vidal" or "jimena vidal" in (client.get("nombre") or "").lower()
    return {
        "nombre": clean(client.get("nombre") or "Tu viaje", 40),
        "lugar": place_of(client),
        "telefono": clean(client.get("telefono") or "", 28),
        "instagram": ig_handle(client.get("instagram")),
        "orange": orange,
        "mark": mark,
    }


def wrap(draw, text, face, width):
    lines, current = [], ""
    for word in text.split():
        trial = (current + " " + word).strip()
        if draw.textlength(trial, font=face) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


def fit_lines(draw, text, width, start, minimum, max_lines):
    size = start
    face = font("Montserrat-ExtraBold.ttf", size)
    lines = wrap(draw, text, face, width)
    while (len(lines) > max_lines or any(draw.textlength(line, font=face) > width for line in lines)) and size > minimum:
        size -= 4
        face = font("Montserrat-ExtraBold.ttf", size)
        lines = wrap(draw, text, face, width)
    return face, lines[:max_lines]


def text_width(draw, text, face):
    return draw.textlength(text, font=face)


def center(draw, text, face, y, fill, width):
    draw.text(((width - text_width(draw, text, face)) / 2, y), text, font=face, fill=fill)


def draw_plane(draw, x, y, size, fill):
    """Avión chico, nariz arriba a la derecha, para el monograma."""
    nose = (x + size * 0.55, y - size * 0.42)
    wing = (x - size * 0.5, y + size * 0.08)
    fold = (x - size * 0.02, y + size * 0.02)
    tail = (x - size * 0.28, y + size * 0.5)
    draw.polygon((nose, wing, fold, tail, (x + size * 0.08, y)), fill=fill)


def draw_mark(image, cx, cy, radius, orange):
    draw = ImageDraw.Draw(image)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=WHITE)
    ring = max(4, radius // 16)
    inset = ring + 3
    draw.ellipse(
        (cx - radius + inset, cy - radius + inset, cx + radius - inset, cy + radius - inset),
        outline=orange, width=ring,
    )
    face = font("Montserrat-ExtraBold.ttf", int(radius * 1.12))
    join = radius * 0.04
    jay = text_width(draw, "J", face)
    vee = text_width(draw, "V", face)
    box = face.getbbox("JV")
    height = box[3] - box[1]
    left = cx - (jay + vee - join) / 2
    top = cy - height / 2 - box[1] + radius * 0.08
    draw.text((left, top), "J", font=face, fill=GRAY)
    draw.text((left + jay - join, top), "V", font=face, fill=orange)
    draw_plane(draw, cx + radius * 0.42, cy - radius * 0.72, radius * 0.42, orange)


def cover(photo, width, height):
    scale = max(width / photo.width, height / photo.height)
    resized = photo.resize((max(width, int(photo.width * scale)), max(height, int(photo.height * scale))), Image.Resampling.LANCZOS)
    left = max(0, (resized.width - width) // 2)
    top = max(0, (resized.height - height) // 2)
    return resized.crop((left, top, left + width, top + height))


def photo_from_bytes(blob):
    if not blob:
        return None
    try:
        return ImageOps.exif_transpose(Image.open(io.BytesIO(blob))).convert("RGB")
    except Exception:
        return None


def store_photo(photo):
    if photo is None:
        return None
    image = photo.copy()
    image.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    image.save(out, "JPEG", quality=86, optimize=True)
    return out.getvalue()


def photo_from_upload(raw):
    if not raw:
        return None
    text = str(raw)
    if text.startswith("data:"):
        text = text.split(",", 1)[-1]
    try:
        blob = base64.b64decode(text)
    except (ValueError, TypeError):
        raise ValueError("No se pudo leer la foto.")
    if len(blob) > 8 * 1024 * 1024:
        raise ValueError("La foto pesa más de 8 MB. Usá una más liviana.")
    try:
        photo = ImageOps.exif_transpose(Image.open(io.BytesIO(blob))).convert("RGB")
    except Exception:
        raise ValueError("El archivo tiene que ser una foto JPG, PNG o WEBP.")
    if photo.width < 2 or photo.height < 2:
        raise ValueError("Esa foto es demasiado chica.")
    return photo


def accent_font(size):
    path = os.path.join(FONT_DIR, "Yellowtail-Regular.ttf")
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    return font("Montserrat-ExtraBold.ttf", max(12, int(size * 0.72)))


def shrink(draw, text, loader, start, minimum, max_width):
    size = start
    face = loader(size)
    while draw.textlength(text, font=face) > max_width and size > minimum:
        size -= 2
        face = loader(size)
    return face


def letter(image, xy, text, face, fill, tracking=0, shadow=True):
    """Texto blanco o naranja, con una sombra corta para que se lea sobre la foto."""
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    x, y = xy
    ink = fill + (255,)

    def place(dx, dy, color):
        if tracking:
            cursor = x + dx
            for char in text:
                draw.text((cursor, y + dy), char, font=face, fill=color)
                cursor += draw.textlength(char, font=face) + tracking
        else:
            draw.text((x + dx, y + dy), text, font=face, fill=color)

    if shadow:
        place(2, 3, (0, 0, 0, 110))
    place(0, 0, ink)
    return Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")


def canvas(size, photo):
    if photo is None:
        return Image.new("RGB", size, NAVY)
    image = cover(photo, size[0], size[1]).convert("RGBA")
    width, height = size
    mask = Image.new("L", (1, height))
    top = int(height * 0.46)
    for row in range(height):
        if row < top:
            fade = 1 - row / top
            alpha = int(168 * fade * fade)
        else:
            alpha = 0
        mask.putpixel((0, row), alpha)
    veil = Image.new("RGBA", size, (0, 0, 0, 255))
    veil.putalpha(mask.resize(size))
    image = Image.alpha_composite(image, veil)
    return image.convert("RGB")


def price_corner(size, bottom):
    """Degradé suave detrás del precio, para que el número se lea."""
    width, height = size
    sample = (150, 190)
    mask = Image.new("L", sample, 0)
    pixels = mask.load()
    sw, sh = sample
    for y in range(sh):
        for x in range(sw):
            dx = (sw - 1 - x) / sw
            dy = (sh - 1 - y) / sh
            dist = (dx * dx + dy * dy) ** 0.5
            fade = max(0.0, 1 - dist / 1.05)
            pixels[x, y] = int(188 * fade * fade)
    corner = mask.resize((int(width * 0.62), int(height * 0.3)), Image.Resampling.LANCZOS)
    full = Image.new("L", size, 0)
    full.paste(corner, (width - corner.size[0], max(0, int(bottom) - corner.size[1])))
    veil = Image.new("RGBA", size, (0, 0, 0, 255))
    veil.putalpha(full)
    return veil


def paint_price(image, offer, right, bottom, width):
    """El de ahora en naranja: la moneda chica y el número grande, en negrita."""
    if offer.get("consultar"):
        return image, bottom
    moneda, numero = offer["precio"].split(" ", 1)
    draw = ImageDraw.Draw(image)
    num_face = shrink(
        draw, numero, lambda size: font("Montserrat-ExtraBold.ttf", size),
        int(width * 0.086), 32, int(width * 0.34),
    )
    cur_face = font("Montserrat-Bold.ttf", max(16, int(num_face.size * 0.38)))
    space = int(width * 0.012)
    num_box = draw.textbbox((0, 0), numero, font=num_face)
    cur_box = draw.textbbox((0, 0), moneda, font=cur_face)
    num_w, num_h = num_box[2] - num_box[0], num_box[3] - num_box[1]
    cur_w, cur_h = cur_box[2] - cur_box[0], cur_box[3] - cur_box[1]
    row_top = bottom - num_h
    top = row_top
    if offer.get("precio_antes_texto"):
        antes = "ANTES " + offer["precio_antes_texto"]
        antes_face = shrink(
            draw, antes, lambda size: font("Montserrat-Bold.ttf", size),
            int(width * 0.02), 12, int(width * 0.42),
        )
        antes_box = draw.textbbox((0, 0), antes, font=antes_face)
        antes_h = antes_box[3] - antes_box[1]
        antes_y = row_top - space - antes_h
        antes_x = right - (antes_box[2] - antes_box[0]) - antes_box[0]
        image = letter(image, (antes_x, antes_y - antes_box[1]), antes, antes_face, (255, 255, 255), shadow=False)
        strike = ImageDraw.Draw(image)
        prefix = strike.textlength("ANTES ", font=antes_face)
        mid = antes_y + antes_h * 0.52
        strike.line(
            (antes_x + prefix, mid, antes_x + (antes_box[2] - antes_box[0]), mid),
            fill=(28, 32, 38), width=max(1, antes_face.size // 14),
        )
        top = antes_y
    num_x = right - num_w - num_box[0]
    cur_x = num_x - space - cur_w - cur_box[0]
    cur_y = row_top + (num_h - cur_h)
    image = letter(image, (cur_x, cur_y - cur_box[1]), moneda, cur_face, ORANGE)
    image = letter(image, (num_x, row_top - num_box[1]), numero, num_face, ORANGE)
    return image, top


def symbol(draw, kind, box, fill, stroke):
    """Trazo fino, el mismo en todos. Sin siluetas llenas."""
    x0, y0, x1, y1 = box
    width = max(1, int(stroke))

    def p(u, v):
        return (x0 + (x1 - x0) * u, y0 + (y1 - y0) * v)

    def line(*pts):
        draw.line([p(u, v) for u, v in pts], fill=fill, width=width, joint="curve")

    def oval(u0, v0, u1, v1):
        draw.ellipse([p(u0, v0), p(u1, v1)], outline=fill, width=width)

    def frame(u0, v0, u1, v1, radius):
        draw.rounded_rectangle([p(u0, v0), p(u1, v1)], radius=radius, outline=fill, width=width)

    span = x1 - x0
    if kind == "aereo":
        line(
            (0.50, 0.05), (0.58, 0.20), (0.58, 0.34), (0.96, 0.58), (0.58, 0.48),
            (0.58, 0.66), (0.80, 0.84), (0.56, 0.74), (0.54, 0.93),
            (0.46, 0.93), (0.44, 0.74), (0.20, 0.84), (0.42, 0.66),
            (0.42, 0.48), (0.04, 0.58), (0.42, 0.34), (0.42, 0.20), (0.50, 0.05),
        )
    elif kind == "equipaje":
        frame(0.26, 0.34, 0.74, 0.90, max(3, span * 0.12))
        draw.arc([p(0.36, 0.10), p(0.64, 0.42)], 200, 340, fill=fill, width=width)
    elif kind == "traslado":
        frame(0.08, 0.24, 0.92, 0.62, max(3, span * 0.12))
        line((0.22, 0.24), (0.22, 0.46))
        line((0.78, 0.24), (0.78, 0.46))
        oval(0.16, 0.50, 0.36, 0.78)
        oval(0.64, 0.50, 0.84, 0.78)
    elif kind == "excursion":
        oval(0.66, 0.08, 0.86, 0.30)
        line((0.04, 0.88), (0.36, 0.30), (0.60, 0.88))
        line((0.36, 0.88), (0.68, 0.42), (0.98, 0.88))
    elif kind == "guia":
        oval(0.34, 0.06, 0.66, 0.40)
        line((0.16, 0.92), (0.30, 0.56), (0.70, 0.56), (0.84, 0.92))
    elif kind == "hotel":
        line((0.10, 0.44), (0.50, 0.08), (0.90, 0.44))
        frame(0.24, 0.42, 0.76, 0.92, max(2, span * 0.06))
    elif kind == "desayuno":
        line((0.16, 0.34), (0.58, 0.34), (0.50, 0.80), (0.24, 0.80), (0.16, 0.34))
        draw.arc([p(0.50, 0.40), p(0.86, 0.74)], 280, 80, fill=fill, width=width)
        draw.arc([p(0.28, 0.08), p(0.42, 0.28)], 200, 340, fill=fill, width=width)
    elif kind == "asistencia":
        line((0.50, 0.12), (0.50, 0.88))
        line((0.12, 0.50), (0.88, 0.50))
    else:
        oval(0.22, 0.22, 0.78, 0.78)


def center_text(image, box, text, face, fill, shadow=True):
    draw = ImageDraw.Draw(image)
    bbox = draw.textbbox((0, 0), text, font=face)
    x = box[0] + (box[2] - box[0] - (bbox[2] - bbox[0])) / 2 - bbox[0]
    y = box[1] + (box[3] - box[1] - (bbox[3] - bbox[1])) / 2 - bbox[1]
    return letter(image, (x, y), text, face, fill, shadow=shadow)


def centered_line(image, cx, y, text, face, fill, shadow=False):
    draw = ImageDraw.Draw(image)
    bbox = draw.textbbox((0, 0), text, font=face)
    x = cx - (bbox[2] - bbox[0]) / 2 - bbox[0]
    return letter(image, (x, y - bbox[1]), text, face, fill, shadow=shadow)


def paint_stars(image, x, y, count, radius):
    draw = ImageDraw.Draw(image)
    for index in range(count):
        cx = x + radius + index * int(radius * 2.35)
        cy = y + radius
        points = []
        for step in range(10):
            angle = -math.pi / 2 + step * math.pi / 5
            dist = radius if step % 2 == 0 else radius * 0.4
            points.append((cx + dist * math.cos(angle), cy + dist * math.sin(angle)))
        draw.polygon(points, fill=ORANGE)
    return image


def _fit_face(draw, text, width, start, minimum, max_lines):
    face = font("Montserrat-Bold.ttf", start)
    lines = wrap(draw, text, face, width)
    while (len(lines) > max_lines or any(draw.textlength(line, font=face) > width for line in lines)) and face.size > minimum:
        face = font("Montserrat-Bold.ttf", face.size - 1)
        lines = wrap(draw, text, face, width)
    return face, lines[:max_lines]


def _cell_block(draw, item, col_w, icon):
    label_face, label_lines = _fit_face(draw, item[2], col_w, max(14, int(icon * 0.34)), 12, 2)
    cap_face, cap_lines = (None, [])
    if item[3]:
        cap_face, cap_lines = _fit_face(draw, item[3], col_w, max(11, int(icon * 0.22)), 10, 2)
    label_h = len(label_lines) * int(label_face.size * 1.15)
    cap_h = len(cap_lines) * int(cap_face.size * 1.15) if cap_lines else 0
    star_r = max(5, int(icon * 0.14)) if item[4] else 0
    gap = int(icon * 0.16)
    height = icon + gap + label_h
    if cap_h:
        height += int(icon * 0.08) + cap_h
    if star_r:
        height += int(icon * 0.1) + star_r * 2
    return label_face, label_lines, cap_face, cap_lines, star_r, height


def paint_cell(image, item, x, y, col_w, icon):
    """Ícono arriba, con borde redondeado, y el texto justo debajo."""
    kind, badge, _label, _caption, stars = item
    draw = ImageDraw.Draw(image)
    label_face, label_lines, cap_face, cap_lines, star_r, _height = _cell_block(draw, item, col_w, icon)
    cx = x + col_w / 2
    box = (int(cx - icon / 2), int(y), int(cx + icon / 2), int(y + icon))
    stroke = max(2, icon // 18)
    radius = max(8, int(icon * 0.28))
    ImageDraw.Draw(image).rounded_rectangle(box, radius=radius, outline=INK, width=stroke)
    if badge:
        face = shrink(
            ImageDraw.Draw(image), badge, lambda size: font("Montserrat-ExtraBold.ttf", size),
            int(icon * 0.40), 12, icon - stroke * 3,
        )
        image = center_text(image, box, badge, face, INK, shadow=False)
    else:
        pad = stroke + int(icon * 0.08)
        inner = (box[0] + pad, box[1] + pad, box[2] - pad, box[3] - pad)
        symbol(ImageDraw.Draw(image), kind, inner, INK, stroke)
    text_y = y + icon + int(icon * 0.14)
    for line in label_lines:
        image = centered_line(image, cx, text_y, line, label_face, INK)
        text_y += int(label_face.size * 1.12)
    if cap_lines:
        text_y += int(icon * 0.06)
        for line in cap_lines:
            image = centered_line(image, cx, text_y, line, cap_face, INK)
            text_y += int(cap_face.size * 1.12)
    if star_r:
        text_y += int(icon * 0.08)
        span = star_r * (2 + (stars - 1) * 2.35)
        image = paint_stars(image, cx - span / 2, text_y, stars, star_r)
    return image


def _icon_size(size):
    """Mismo tamaño en todas las piezas, sin importar cuántos íconos haya."""
    return int(min(size) * 0.058)


def _icon_shade(image, top):
    """Negro al 50% detrás de la fila de íconos."""
    width, height = image.size
    top = max(0, min(height - 1, int(top)))
    span = height - top
    layer = Image.new("RGBA", (width, span), (0, 0, 0, 128))
    plate = Image.new("RGBA", image.size, (0, 0, 0, 0))
    plate.paste(layer, (0, top))
    return Image.alpha_composite(image.convert("RGBA"), plate).convert("RGB")


def _strip(image, items, pool=False):
    """Íconos juntos al pie. Devuelve la imagen y el borde superior del grupo."""
    width, height = image.size
    icon = _icon_size(image.size)
    rows = 1
    per = len(items)
    gap = max(4, int(icon * 0.12))
    pad = int(width * 0.035)
    available = width - pad * 2
    fit = int((available - gap * max(0, per - 1)) / max(per, 1))
    col_w = max(icon + 4, min(int(icon * 1.85), fit))
    probe = ImageDraw.Draw(image)
    content = max(_cell_block(probe, item, col_w - 4, icon)[5] for item in items)
    row_gap = int(icon * 0.22) if rows > 1 else 0
    pad_y = int(icon * 0.28)
    strip_h = pad_y * 2 + rows * content + row_gap * (rows - 1)
    strip_top = height - strip_h
    if pool:
        image = Image.alpha_composite(image.convert("RGBA"), price_corner(image.size, strip_top)).convert("RGB")
    image = _icon_shade(image, strip_top)
    cursor = strip_top + pad_y
    for row in range(rows):
        chunk = items[row * per:(row + 1) * per]
        chunk_w = len(chunk) * col_w + max(0, len(chunk) - 1) * gap
        origin = (width - chunk_w) / 2
        for index, item in enumerate(chunk):
            image = paint_cell(image, item, origin + index * (col_w + gap), cursor, col_w, icon)
        cursor += content + row_gap
    return image, strip_top


def paint_listing(image, offer, brand):
    """Tira de íconos al pie. El precio queda arriba de esa tira."""
    width, height = image.size
    items = offer.get("flyer") or []
    note = offer.get("precio_nota") or ""
    right = width - int(width * 0.06)
    strip_top = height
    if items:
        image, strip_top = _strip(image, items, pool=not offer.get("consultar"))
    elif not offer.get("consultar"):
        image = Image.alpha_composite(image.convert("RGBA"), price_corner(image.size, strip_top)).convert("RGB")
    lift = int(min(width, height) * 0.045)
    anchor = strip_top - lift
    if note:
        face = shrink(
            ImageDraw.Draw(image), note, lambda size: font("Montserrat-Bold.ttf", size),
            int(width * 0.022), 12, int(width * 0.7),
        )
        box = ImageDraw.Draw(image).textbbox((0, 0), note, font=face)
        note_h = box[3] - box[1]
        note_y = anchor - note_h
        image = letter(image, (right - (box[2] - box[0]) - box[0], note_y - box[1]), note, face, INK, shadow=False)
        price_bottom = note_y - int(height * 0.012)
    else:
        price_bottom = anchor
    image, _top = paint_price(image, offer, right, price_bottom, width)
    return image


def paint_portada(image, offer, brand):
    width, height = image.size
    rule_x = int(width * 0.072)
    text_x = rule_x + int(width * 0.05)
    max_width = width - text_x - int(width * 0.06)
    y = int(height * 0.085)
    rule_top = y
    draw = ImageDraw.Draw(image)
    face, lines = fit_lines(draw, offer["destino"].upper(), max_width, int(width * 0.145), int(width * 0.062), 2)
    leading = int(face.size * 0.9)
    for line in lines:
        image = letter(image, (text_x, y), line, face, INK)
        y += leading
    accent = offer.get("regimen") or offer.get("estadia") or ""
    if accent:
        y -= int(face.size * 0.16)
        accent_x = text_x + int(width * 0.02)
        accent_face = shrink(
            ImageDraw.Draw(image), accent, accent_font, int(width * 0.11), int(width * 0.055), max_width - int(width * 0.02),
        )
        accent_box = ImageDraw.Draw(image).textbbox((accent_x, y), accent, font=accent_face)
        image = letter(image, (accent_x, y), accent, accent_face, brand["orange"])
        y = accent_box[3] + int(height * 0.018)
    if offer.get("origen"):
        desde = "DESDE " + offer["origen"].upper()
        desde_face = shrink(
            ImageDraw.Draw(image), desde, lambda size: font("Montserrat-Bold.ttf", size), int(width * 0.042), int(width * 0.024), max_width,
        )
        tracking = max(1, int(desde_face.size * 0.12))
        if ImageDraw.Draw(image).textlength(desde, font=desde_face) + tracking * (len(desde) - 1) > max_width:
            tracking = 0
        image = letter(image, (text_x, y), desde, desde_face, INK, tracking)
        y += int(desde_face.size * 1.15)
    if offer.get("fechas"):
        fecha = offer["fechas"].upper()
        fecha_face = shrink(
            ImageDraw.Draw(image), fecha, lambda size: font("Montserrat-Bold.ttf", size),
            int(width * 0.036), int(width * 0.02), max_width,
        )
        tracking = max(1, int(fecha_face.size * 0.08))
        if ImageDraw.Draw(image).textlength(fecha, font=fecha_face) + tracking * (len(fecha) - 1) > max_width:
            tracking = 0
        image = letter(image, (text_x, y), fecha, fecha_face, INK, tracking)
        y += int(fecha_face.size * 1.3)
    ImageDraw.Draw(image).line((rule_x, rule_top, rule_x, y), fill=INK, width=max(4, width // 140))
    return paint_listing(image, offer, brand)


def render(offer, brand, size, photo=None):
    return paint_portada(canvas(size, photo), offer, brand)


def preview_bytes(offer, brand, photo=None):
    image = render(offer, brand, STORY, photo)
    image.thumbnail((540, 680), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    image.save(out, "JPEG", quality=76, optimize=True)
    return out.getvalue()


def jpeg_alta(image):
    """Para bajar y subir a Instagram: sin submuestreo de color, así el texto queda nítido."""
    out = io.BytesIO()
    image.save(out, "JPEG", quality=92, subsampling=0, optimize=True)
    return out.getvalue()


def post_bytes(offer, brand, photo=None):
    return jpeg_alta(render(offer, brand, STORY, photo))


def render_reel(offer, brand, photo=None):
    """Foto a pantalla completa. La pieza va entre los márgenes que tapa Instagram."""
    width, height = REEL
    top, bottom = REEL_SAFE
    image = canvas(REEL, photo)
    zona = paint_portada(image.crop((0, top, width, height - bottom)), offer, brand)
    image.paste(zona, (0, top))
    image = _icon_shade(image, height - bottom)
    return paint_reel_footer(image, brand, height - bottom)


def paint_reel_footer(image, brand, top):
    """Pie del reel: monograma y nombre a la izquierda, botón de mensaje a la derecha."""
    width, height = image.size
    draw = ImageDraw.Draw(image)
    radius = 50
    name_face = font("Fraunces-SemiBold.ttf", 56)
    label = "Dejanos tu mensaje"
    button_face = font("Montserrat-Bold.ttf", 32)
    name_w = text_width(draw, brand["nombre"], name_face)
    label_box = draw.textbbox((0, 0), label, font=button_face)
    pad_x, pad_y = 34, 22
    button_w = label_box[2] - label_box[0] + pad_x * 2
    button_h = label_box[3] - label_box[1] + pad_y * 2
    mark_w = radius * 2 + 20 if brand.get("mark") else 0
    gap = 48
    row_w = mark_w + name_w + gap + button_w
    cy = top + int((height - top) * 0.42)
    x = (width - row_w) / 2
    if brand.get("mark"):
        draw_mark(image, int(x + radius), cy, radius, brand["orange"])
        x += mark_w
    name_box = draw.textbbox((0, 0), brand["nombre"], font=name_face)
    image = letter(image, (x, cy - (name_box[1] + name_box[3]) / 2), brand["nombre"], name_face, WHITE, shadow=False)
    bx = x + name_w + gap
    box = (int(bx), int(cy - button_h / 2), int(bx + button_w), int(cy + button_h / 2))
    ImageDraw.Draw(image).rounded_rectangle(box, radius=button_h // 2, fill=brand["orange"])
    return center_text(image, box, label, button_face, INK, shadow=False)


def reel_bytes(offer, brand, photo=None):
    return jpeg_alta(render_reel(offer, brand, photo))


def card_bytes(offer, brand, photo=None):
    image = render(offer, brand, CARD, photo)
    quality = 86
    data = b""
    while quality >= 60:
        out = io.BytesIO()
        image.save(out, "JPEG", quality=quality, optimize=True)
        data = out.getvalue()
        if len(data) <= 250 * 1024:
            break
        quality -= 6
    return data


ROW_RE = re.compile(
    r'(<div class="row g-4 mt-2">)(.*?)(</div>\s*)'
    r'(?:<p class="(?:nx-note|prod-bajada)">.*?</p>|<div class="foot-cta jv-cierre">.*?<!--/jv-cierre-->)',
    re.S,
)
SECTION_RE = re.compile(r'(<section\b[^>]*\bid="productos"[^>]*>)(.*?)(</section>)', re.S)
PUBLIC_NOTE = "Escribinos y te cotizamos cada salida."


def note_title_html():
    """El cierre de promociones, con las dos últimas palabras juntas."""
    return 'Escribinos y te cotizamos <span class="em">cada&nbsp;salida</span>.'


def note_band(html):
    """Banda naranja: el título, el horario, WhatsApp o el email."""
    match = re.search(r"https://wa\.me/(\d+)", html or "")
    phone = match.group(1) if match else "5493416953818"
    href = "https://wa.me/%s?text=%s" % (phone, quote("Hola, quiero consultar una salida."))
    return (
        '<div class="foot-cta jv-cierre"><div class="container">'
        '<div><h2>%s</h2>'
        '<p>Contanos qué necesitás y te respondemos {{c.respuesta}}.</p></div>'
        '<div class="jv-cierre-side">'
        '<p class="jv-cierre-hint">Escribinos por WhatsApp o dejanos tu&nbsp;email.</p>'
        '<a class="jv-wa" href="%s" target="_blank" rel="noopener" aria-label="Escribir por WhatsApp"><i class="bi bi-whatsapp"></i></a>'
        '<form data-demo-form>'
        '<label class="visually-hidden" for="jv-email">Tu email</label>'
        '<div class="foot-form">'
        '<input id="jv-email" type="email" name="email" placeholder="Tu email" autocomplete="email" required>'
        '<input type="text" name="web" tabindex="-1" autocomplete="off" class="visually-hidden" aria-hidden="true">'
        '<button class="btn-nx-light" type="submit">Enviar</button>'
        '</div>'
        '<p class="foot-form-note" data-form-msg aria-live="polite"></p>'
        '</form></div>'
        '</div></div><!--/jv-cierre-->'
    ) % (note_title_html(), escape(href, quote=True))


def price_html(offer):
    if offer.get("consultar"):
        return '<p class="prod-price" hidden></p>'
    parts = []
    if offer.get("precio_antes_texto"):
        parts.append("<s>%s</s>" % escape(offer["precio_antes_texto"]).replace(" ", "&nbsp;"))
    parts.append(escape(offer["precio"]).replace(" ", "&nbsp;"))
    return '<p class="prod-price">%s</p>' % " ".join(parts)


def card_line(offer):
    parts = []
    if offer.get("regimen"):
        parts.append(offer["regimen"] + ".")
    if offer.get("origen"):
        parts.append("Sale de " + offer["origen"] + ".")
    if offer.get("vuelo"):
        parts.append("Vuelo " + offer["vuelo"] + ".")
    if offer.get("hotel") and not same_place(offer.get("hotel"), offer.get("origen")):
        hotel = offer["hotel"]
        if not re.match(r"(?i)hotel\b", hotel):
            hotel = "Hotel " + hotel
        parts.append(hotel + ".")
    if offer.get("precio_nota"):
        parts.append(offer["precio_nota"] if offer["precio_nota"].endswith(".") else offer["precio_nota"] + ".")
    line = " ".join(parts)
    if len(line) > 320:
        line = line[:317].rsplit(" ", 1)[0] + "."
    return line


def filter_tags(offer):
    """Etiquetas que usan los filtros de la landing: qué incluye, comidas, vuelo y duración."""
    tags = list(offer.get("incluye") or [])
    regimen = {"Desayuno": "desayuno", "Media pensión": "media-pension", "All inclusive": "all-inclusive"}.get(offer.get("regimen"))
    if regimen and regimen not in tags:
        tags.append(regimen)
    if offer.get("vuelo"):
        tags.append(offer["vuelo"].replace(" ", "-"))
    noches = offer.get("noches") or 0
    if noches:
        tags += [t for t, tope in (("noches-5", 5), ("noches-10", 10)) if noches <= tope]
    return " ".join(tags)


def promo_card(oid, src, alt, meta_html, title, price_html, includes_html, detail, href, featured=False, filtros="", desde="", hasta=""):
    """Entran de a cuatro. Las destacadas llevan jv-destacada y la landing las sube sobre el hero."""
    meta = '<p class="meta">%s</p>' % meta_html if meta_html else ""
    sale = '<p class="prod-sale">%s</p>' % nb_html(detail) if detail else ""
    col = "col-6 col-lg-3 jv-destacada" if featured else "col-6 col-lg-3"
    fechas = "".join(' data-%s="%s"' % (k, escape(v, quote=True)) for k, v in (("desde", desde), ("hasta", hasta)) if v)
    return (
        '<div class="%s"><article class="prod-card prod-card-xl" data-oferta="%s" data-filtros="%s"%s>'
        '<div class="nx-frame ratio-1">'
        '<button type="button" class="jv-zoom" data-zoom="%s" aria-label="%s">'
        '<img src="%s" alt="%s"></button></div>'
        '<div class="pad"><h3>%s</h3>%s%s%s%s'
        '<a class="prod-more" href="%s" target="_blank" rel="noopener">Escribinos <i class="bi bi-whatsapp"></i></a>'
        "</div></article></div>"
    ) % (
        col, escape(oid, quote=True), escape(filtros, quote=True), fechas, escape(src, quote=True), escape("Ver " + title, quote=True),
        escape(src, quote=True), escape(alt, quote=True),
        nb_html(title), meta, price_html, includes_html, sale, escape(href, quote=True),
    )


def _apply_row(html, cards, note):
    match = ROW_RE.search(html)
    if not match:
        return None
    inner = "\n" + "\n".join(cards) + "\n          "
    return html[:match.start(2)] + inner + match.group(3) + note_band(html) + html[match.end():]


def apply_offers(html, cards, note):
    """Deja solo las promos cargadas en el gestor."""
    match = SECTION_RE.search(html)
    if not match:
        return _apply_row(html, cards, note)
    inner = _apply_row(match.group(2), cards, note)
    if inner is None:
        return None
    return html[:match.start(2)] + inner + html[match.end(2):]


def offer_href(html, destino, estadia, fechas="", precio=""):
    match = re.search(r"https://wa\.me/(\d+)", html or "")
    phone = match.group(1) if match else "5493416953818"
    detalle = ", ".join(part for part in (destino, estadia, fechas) if part)
    text = "Hola, quiero consultar la promo a %s" % detalle
    if precio:
        text += " (%s)" % precio
    return "https://wa.me/%s?text=%s" % (phone, quote(text + "."))


def patch_promo(html, src, alt, meta, title, price, note):
    def card(match):
        return "".join((
            match.group(1), src, match.group(3), escape(alt, quote=True), match.group(5),
            match.group(6), nb_html(meta), match.group(8), nb_html(title),
            '</h3><p class="prod-price">' if price else '</h3><p class="prod-price" hidden>',
            escape(price), match.group(12),
        ))

    updated, count = CARD_RE.subn(card, html, count=1)
    if not count:
        return None
    return NOTE_RE.sub(lambda match: match.group(1) + nb_html(note) + match.group(3), updated, count=1)


def card_meta_text(offer):
    parts = []
    if offer.get("estadia"):
        parts.append(offer["estadia"])
    if offer.get("fechas"):
        parts.append(offer["fechas"])
    return " · ".join(parts)


def card_meta_html(offer):
    text = card_meta_text(offer)
    html = nb_html(text) if text else ""
    stars = offer.get("estrellas") or 0
    if stars in (3, 4, 5):
        icons = "".join('<i class="bi bi-star-fill"></i>' for _ in range(stars))
        mark = '<span class="jv-stars" aria-label="%d estrellas">%s</span>' % (stars, icons)
        html = (html + " " + mark).strip()
    return html


def includes_html(offer):
    chosen = set(offer.get("incluye") or [])
    chips = []
    for key, icon, label in WEB_ICONS:
        if key not in chosen:
            continue
        chips.append(
            '<span class="jv-inc"><i class="bi bi-%s" aria-hidden="true"></i> %s</span>'
            % (icon, nb_html(label))
        )
    if not chips:
        return ""
    return '<p class="jv-incs">%s</p>' % "".join(chips)


def hashtag(text):
    words = unicodedata.normalize("NFKD", str(text or ""))
    words = "".join(ch for ch in words if not unicodedata.combining(ch))
    return "#" + "".join(w[:1].upper() + w[1:] for w in re.findall(r"[A-Za-z0-9]+", words))


def caption(offer, brand, phone=""):
    """Epígrafe para Instagram con los mismos datos que la pieza."""
    title = offer["destino"].upper()
    if offer.get("regimen"):
        title += " · " + offer["regimen"]
    lines = [title]
    for part in (offer.get("estadia"), offer.get("salida")):
        if part:
            lines.append(part)
    if offer.get("vuelo"):
        lines.append("Vuelo " + offer["vuelo"])
    if offer.get("incluye_frase"):
        lines.append("Incluye " + offer["incluye_frase"] + ".")
    if offer.get("hotel_linea"):
        lines.append(offer["hotel_linea"])
    if offer.get("precio"):
        price = "Desde " + offer["precio"]
        if offer.get("precio_antes_texto"):
            price = "Antes %s. Ahora %s" % (offer["precio_antes_texto"], offer["precio"])
        lines.append("")
        lines.append(price)
        if offer.get("precio_nota"):
            lines.append(offer["precio_nota"])
    lines.append("")
    lines.append("Dejanos tu mensaje por WhatsApp: wa.me/" + phone if phone else "Dejanos tu mensaje.")
    tags = [hashtag(brand["nombre"]), hashtag(offer["destino"])]
    if offer.get("origen"):
        tags.append(hashtag("desde " + offer["origen"]))
    lines.append("")
    lines.append(" ".join(tags))
    return "\n".join(lines)


def promo_copy(offer):
    meta = card_meta_text(offer)
    note = card_line(offer)
    alt = "Oferta a %s" % offer["destino"]
    if offer.get("estadia"):
        alt = "%s, %s" % (alt, offer["estadia"])
    if len(alt) > 125:
        alt = alt[:125].rsplit(" ", 1)[0]
    return meta, note, alt
