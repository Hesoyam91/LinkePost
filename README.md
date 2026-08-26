# LinkePost

Extensión para generar publicaciones de LinkedIn con un backend público que utiliza un modelo Llama. La credencial del proveedor se queda en el servidor y no se solicita una API key al usuario.

## Backend

Requisitos: Node.js 18 o superior.

Variables de entorno:

```sh
export LLAMA_API_KEY="clave-del-proveedor"
export LLAMA_API_URL="https://api.groq.com/openai/v1/chat/completions"
export LLAMA_MODEL="llama-3.1-8b-instant"
export ALLOWED_ORIGINS="*"
export MAX_REQUESTS_PER_HOUR="30"
npm start
```

`LLAMA_API_URL` puede apuntar a Groq, Together, Fireworks, OpenRouter o un servidor propio compatible con `/chat/completions`. Para producción, configura `ALLOWED_ORIGINS` con el origen real de la extensión y reemplaza el límite en memoria por un rate limiter persistente.

Endpoints:

- `GET /health`
- `POST /generate` con `{ "promptInput": "..." }`

Despliega este directorio en Render, Railway, Fly.io, Northflank o un VPS. No subas un archivo `.env` ni la credencial del proveedor al repositorio.

## Extensión

Después de desplegar el backend, cambia `PUBLIC_BACKEND_URL` en `background.js` para que apunte a la URL pública, por ejemplo `https://tu-dominio.example/generate`. Actualiza también ese dominio en `host_permissions` de `manifest.json` y `manifest.firefox.json`.

### Chrome y Edge

Usan `manifest.json` o `manifest.chrome.json`, ambos con Manifest V3 y `background.service_worker`.

### Firefox

Usa `manifest.firefox.json`, que conserva `background.scripts` y `browser_action`. Empaqueta ese archivo como `manifest.json` antes de cargarlo o publicarlo en Firefox Add-ons.

### Safari

Safari Web Extensions requiere convertir el paquete mediante Xcode. La lógica JavaScript y el manifiesto Chrome son la base, pero el proyecto Safari, los iconos y la firma deben generarse en macOS con Apple Developer.

## Seguridad y cuotas

El endpoint público tiene un límite básico por IP. Para distribuirlo públicamente, añade autenticación de instalación o sesión, cuotas por usuario y un almacén persistente como Redis. El proveedor puede imponer su propia cuota y devolver `429`; la extensión mostrará el error recibido.