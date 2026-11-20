"""QA de artefacto real generado por herramientas/armar.py, sin navegador."""
import os
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "_site"

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.ids = set()
        self.links = []
        self.local_resources = []
        self.h1 = 0
        self.images_missing_alt = []
        self.meta = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append(tag)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "h1":
            self.h1 += 1
        if tag == "img" and "alt" not in attrs:
            self.images_missing_alt.append(attrs.get("src", "(sin src)"))
        if tag == "meta":
            self.meta.add(attrs.get("name") or attrs.get("property"))
        if tag == "a" and attrs.get("href", "").startswith("#"):
            self.links.append(attrs["href"][1:])
        for key in ("src", "href", "poster"):
            value = attrs.get(key, "")
            if value and (tag in ("script", "img", "source", "video") or tag == "link" and attrs.get("rel") == "stylesheet"):
                if not value.startswith(("http://", "https://", "data:", "//", "#")):
                    self.local_resources.append(value)

class Publicado(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (SITE / "index.html").read_text(encoding="utf-8")
        cls.page = Page()
        cls.page.feed(cls.html)

    def test_semantica_y_seo(self):
        self.assertEqual(self.page.h1, 1, "Se espera un único H1 en la portada")
        self.assertIn('name="viewport"', self.html)
        self.assertIn('rel="canonical"', self.html)
        self.assertIn("description", self.page.meta)
        self.assertIn("og:title", self.page.meta)
        self.assertFalse(self.page.images_missing_alt, self.page.images_missing_alt)
        self.assertNotIn("{{c.", self.html)

    def test_recursos_del_sitio(self):
        missing = []
        for value in self.page.local_resources:
            # Assets del proyecto deben ser relativos a la carpeta /jimenavidal/.
            self.assertFalse(value.startswith("/assets/"), value)
            path = urlsplit(value).path.lstrip("/")
            if not (SITE / path).is_file():
                missing.append(value)
        self.assertFalse(missing, "Recursos locales faltantes: " + ", ".join(missing))
        self.assertNotIn('src="/api/', self.html)

    def test_enlaces_internos(self):
        broken = [h for h in self.page.links if h and h not in self.page.ids]
        self.assertFalse(broken, "Anclas sin destino: " + ", ".join(broken))

    def test_circuito_de_gestion_y_publicacion(self):
        # El panel no es un backend tradicional: guarda con GitHub GraphQL
        # en main y GitHub Actions genera _site y gestion/estado.json.
        gestion = (SITE / "gestion" / "index.html").read_text(encoding="utf-8")
        js = (SITE / "gestion" / "gestion.js").read_text(encoding="utf-8")
        self.assertIn('data-entrar', gestion)
        self.assertIn('var RAMA = "main"', js)
        self.assertIn('datos/ofertas.json', js)
        self.assertIn('datos/hero.json', js)
        self.assertIn('datos/contacto.json', js)
        self.assertIn('createCommitOnBranch', js)
        self.assertIn('publicar.yml', js)
        self.assertTrue((SITE / "gestion" / "estado.json").is_file())
        import json
        estado = json.loads((SITE / "gestion" / "estado.json").read_text(encoding="utf-8"))
        self.assertIn("ofertas", estado)
        self.assertIn("commit", estado)
        workflow = (ROOT / ".github" / "workflows" / "publicar.yml").read_text(encoding="utf-8")
        self.assertIn("python herramientas/armar.py", workflow)
        self.assertIn("actions/deploy-pages", workflow)

    def test_videos_promociones_no_descargan_antes_de_tiempo(self):
        # Los videos pueden ser enormes: deben esperar al IntersectionObserver.
        import re
        seccion = self.html.split('id="productos"', 1)[-1].split('id="resenas-de-google"', 1)[0]
        videos = re.findall(r'<video[^>]*>', seccion)
        self.assertTrue(videos, "El fixture publicado debe incluir promociones con video")
        for video in videos:
            self.assertIn('data-src=', video)
            self.assertIn('preload="none"', video)
            self.assertNotIn(' autoplay', video)
            self.assertNotRegex(video, r'\\ssrc=')

    def test_archivos_publicacion(self):
        for f in ("robots.txt", "sitemap.xml", "assets/js/sitio.js", "assets/js/ofertas.js"):
            self.assertTrue((SITE / f).is_file(), f)

if __name__ == "__main__":
    unittest.main()
