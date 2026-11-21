# Panel propio de LA FRANJA

Convive con `/admin/` (Decap CMS), que sigue disponible como panel clásico y vía de respaldo. El panel nuevo vive en `/panel/` y no modifica el sitio público ni los archivos de Decap.

## Secciones

- **Catálogo:** Productos, Categorías y Subcategorías.
- **Contenido:** Servicios, Trabajos, Datos del negocio y Textos de páginas.
- **Panorama:** Resumen con métricas y desglose por categoría.

En Productos puedes agregar, editar, duplicar, reordenar, alternar activo/destacado, cambiar el precio desde la tabla y borrar. Cada guardado crea un commit en `main`. Las fichas usan exactamente los 10 campos del contrato: `nombre`, `categoria`, `subcategoria`, `precio`, `unidad`, `sku`, `activo`, `destacado`, `descripcion`, `imagen`. No existe el campo `marca`.

`unidad` es un `select` con `unidad`, `bolsa`, `rollo`, `mt2` y `pie`. `sku` es opcional; `activo` viene en `true` y `destacado` en `false` al crear.

## Imágenes

El campo de imagen acepta tres formas:

1. **Subir desde la PC:** el archivo se valida en el servidor (JPG, PNG, WEBP o GIF, máximo 5 MB, con comprobación de firma) y se sube a `img/uploads/` con un nombre normalizado y único. Cada subida crea un commit en `main`.
2. **Elegir del sitio:** galería con las imágenes ya publicadas en `img/uploads/`, con búsqueda por nombre.
3. **Pegar un enlace:** se aceptan URLs `http(s)`; el campo valida que no sea `javascript:` ni una ruta relativa.

La vista previa se actualiza al escribir, subir o seleccionar. El valor guardado es siempre la ruta `/img/uploads/...` o el enlace completo.

## Seguridad

- El token de GitHub se cifra con AES-GCM dentro de la cookie `HttpOnly; Secure; SameSite=Lax; Path=/api/panel`, con caducidad de 8 horas. El navegador nunca puede leerlo y no se usa `localStorage`.
- La clave se deriva de `PANEL_SESSION_SECRET` si existe; si no, de `GITHUB_CLIENT_SECRET` (ya configurado en Cloudflare). No hay secretos en el repo.
- El `state` OAuth lleva prefijo `p.` para que `/api/callback` distinga el panel de Decap sin registrar otra URL de autorización.
- Las peticiones del navegador van solo al mismo origen (`/api/panel/*`). El panel nunca llama a `api.github.com`.
- Escritura con allowlist de rutas y campos, validación de esquema y control de concurrencia por SHA: si el archivo cambió en GitHub mientras lo editabas, el guardado se rechaza en vez de sobrescribirlo.
- `noindex, nofollow` y `referrer no-referrer` en la página.

## Archivos

```text
panel/index.html                    interfaz
panel/panel.css                     estilos
panel/app.js                        lógica del panel
functions/lib/panel.js              sesión cifrada
functions/lib/almacen.js            allowlist, validación y commits
functions/lib/imagenes.js           validación, listado y subida de imágenes
functions/api/panel/imagen.js       galería y subida desde la PC
functions/api/panel/auth.js         inicio de sesión
functions/api/panel/sesion.js       estado de sesión
functions/api/panel/catalogo.js     lectura rápida del catálogo
functions/api/panel/datos.js        lectura y escritura del resto de archivos
functions/api/panel/salir.js        cierre de sesión
functions/api/callback.js           modificado: rama del panel + Decap
```

## Estado

Publicado en `https://lafranja.pages.dev/panel/`. `/admin/` sigue intacto como panel clásico. Los cambios de esta versión de imágenes están probados en local y pendientes de autorización para publicarse.
