/* Utilidades compartidas por los endpoints OAuth del panel (Cloudflare Pages Functions). */

export const STATE_COOKIE = 'lf_oauth_state';
export const STATE_MAX_AGE = 600;

export function crearEstado() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function leerCookie(cabecera, nombre) {
  const prefijo = nombre + '=';
  return String(cabecera || '')
    .split(';')
    .map((parte) => parte.trim())
    .filter((parte) => parte.startsWith(prefijo))
    .map((parte) => decodeURIComponent(parte.slice(prefijo.length)))[0] || '';
}

export function cookieEstado(valor) {
  const maxAge = valor ? STATE_MAX_AGE : 0;
  return `${STATE_COOKIE}=${encodeURIComponent(valor)}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/* Devuelve el token al panel solo al origen del sitio, nunca a un origin arbitrario. */
export function paginaPostMessage(status, contenido, origin) {
  const seguro = (valor) => JSON.stringify(valor).replace(/</g, '\\u003c');
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Autorizando…</title></head>
<body><p>Autorizando el panel…</p>
<script>
(function () {
  var origen = ${seguro(origin)};
  var estado = ${seguro(status)};
  var contenido = ${seguro(contenido)};
  function entregar(destino) {
    if (!window.opener) return;
    window.opener.postMessage('authorization:github:' + estado + ':' + JSON.stringify(contenido), destino);
    window.removeEventListener('message', recibir, false);
  }
  function recibir(evento) {
    if (evento.origin === origen) entregar(origen);
  }
  window.addEventListener('message', recibir, false);
  if (window.opener) window.opener.postMessage('authorizing:github', origen);
}());
<\/script></body></html>`;
  return new Blob([html], { type: 'text/html;charset=UTF-8' });
}
