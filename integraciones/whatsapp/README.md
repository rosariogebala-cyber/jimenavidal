# Promos de Jimena Vidal por WhatsApp

El servicio recibe `Nueva promo` de los números autorizados, envía el formulario y procesa la respuesta. Para alojarlo, ejecutá `node integraciones/whatsapp/webhook.mjs` con Node.js 22 o superior y una URL pública HTTPS que dirija `/webhook` al puerto del servicio.

## Configuración

- `WA_APP_SECRET`, `WA_ACCESS_TOKEN` y `WA_VERIFY_TOKEN` van en los secretos del alojamiento. En Meta, usá ese último valor para verificar la URL de callback y suscribí el campo `messages`.
- `WA_BUSINESS_ID`, `WA_PHONE_NUMBER_ID` y `WA_FLOW_ID` deben corresponder a la misma cuenta de WhatsApp. El formulario comienza en `NUEVA_PROMO` y usa los campos del borrador de Jimena Vidal.
- `WA_ALLOWED_NUMBERS` contiene los números de los operadores, con código de país y sin espacios, separados por comas.
- `WA_MODE` queda en modo de prueba por defecto. Para probar en Gestión, usá `pendiente`. Para publicar en la web, usá `publicar` con un Flow publicado y con el botón final rotulado «Publicar en la web».
- Los modos `pendiente` y `publicar` requieren `GITHUB_REPO` (dueño y repositorio), `GITHUB_TOKEN` con permiso de escritura sobre ese repositorio y, si corresponde, `GITHUB_BRANCH` (por defecto, `main`). `PORT` tiene como valor predeterminado `8080`.

Primero probá la entrega del Flow y su respuesta en WhatsApp. Después, con `pendiente`, verificá que el panel reciba una sola ficha con su foto. En modo `publicar`, GitHub Pages muestra la promo cuando termina el despliegue de la rama.
