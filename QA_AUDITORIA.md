# Auditoría técnica integral — Jimena Vidal

**Fecha:** 20/11/2026. **Alcance:** landing pública, generador y panel /gestion/.

## Arquitectura verificada
- `datos/landing.html`, `datos/hero.json`, `datos/ofertas.json`, `datos/contacto.json` alimentan `herramientas/armar.py`.
- `publicar.yml` genera `_site`, incluyendo `gestion/estado.json`, y despliega GitHub Pages.
- `gestion/gestion.js` usa GitHub GraphQL `createCommitOnBranch` sobre **main**; el panel controla la publicación comparando el SHA del commit con `gestion/estado.json`.
- **Atención:** no utilizar una prueba de guardado real sin autorización: modificaría datos de producción en `main`. El QA de esta rama verifica el contrato de archivos de forma no destructiva.

## Correcciones en rama QA
1. Sincronizar `aria-pressed` al cambiar categoría de FAQ.
2. Ampliación de promociones como diálogo accesible con foco inicial, Escape, Tab y retorno del foco.
3. Corregir contraste de textos de precio y CTA FAQ, etiquetas accesibles de filtros y áreas táctiles de indicadores.
4. Permitir el salto de línea del email en footer para evitar overflow a 320 y 375 px.
5. Separar las flechas del carrusel del solapamiento de las tarjetas en mobile.
6. Pruebas de generación, recursos, SEO, enlaces, panel, JavaScript, responsive Chromium/axe, capturas y Lighthouse.

## Métricas de referencia (sintéticas; no son datos de usuarios reales)
- Una corrida anterior dio Mobile 73 y Desktop 94, SEO 100.
- Otra corrida varió hasta Mobile 45 por TBT 2430 ms, con LCP 9,38 s; muestra que las mediciones únicas son inestables y no deben confundirse con una mejora o regresión comprobada.
- La carga de imágenes hero es responsiva; las siguientes acciones de performance deben priorizar pintura del hero, código ejecutado durante carga y dependencia de recursos externos, sin eliminar las funciones del carrusel ni las promociones.

## Criterios de publicación
- Los jobs de build + pruebas Chromium/axe + Lighthouse deben completar correctamente.
- Revisar capturas móviles (320, 375), tablet (768) y desktop (1024, 1440).
- Verificar manualmente carga/edición/publicación de promoción con token de prueba y respaldo si se decide probar acciones reales.
- Confirmar que `main` no se modificó durante la auditoría.

## Riesgos pendientes
- Token personal de GitHub guardado en localStorage/sessionStorage por el navegador de gestión: evaluar autenticación por backend o GitHub App de permisos limitados antes de exponerlo a terceros. No se cambió en esta etapa.
- Una prueba de extremo a extremo de guardado + despliegue real exige operar sobre GitHub y publicar; se excluye del QA no destructivo.

## Resultado de QA tras optimización de video — ejecución #44776901806
- **Build y validaciones estáticas:** success.
- **Chromium, WCAG y responsive:** success a 320, 375, 768, 1024 y 1440 px. Sin desbordamiento horizontal y sin violaciones axe graves/críticas dentro de los criterios comprobados.
- **Lighthouse Mobile/Desktop:** job success. Mobile Performance **57**, Accesibilidad **98**, Buenas prácticas **96**, SEO **100**. Desktop Performance **90**, Accesibilidad **98**, Buenas prácticas **96**, SEO **100**.
- La puntuación sintética fluctúa (una corrida previa Mobile 74 y otra 45), por lo que no se atribuye una mejora de puntuación aislada a los cambios.
- **Transferencia real inicial de Lighthouse Mobile:** pasó de **4.744 KiB** a **1.865 KiB**, una reducción de unos **2.879 KiB (61 %)** en las mediciones comparadas. El MP4 externo de 2.949.841 bytes dejó de aparecer entre las solicitudes de red del inicio. El video sigue configurado para reproducirse al entrar en la zona visible.
- **LCP medido:** alrededor de 9,4 s en ambas corridas; continúa como oportunidad de mejora no bloqueante para el QA funcional. El hero usa WebP de ~26,6 KB con prioridad alta, por lo que no conviene modificarlo sin aislar el problema.
- Capturas full-page de los cinco anchos generadas; inspección de primeros 1500 px a 320 y 1440 px sin roturas visuales apreciables. La revisión humana de toda la página, contenido y panel autenticado sigue pendiente.
- **Publicación:** cambios aún en rama QA/PR borrador. No se modificaron `main` ni promociones reales.
