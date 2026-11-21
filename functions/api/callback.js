// Canjea el código de GitHub y devuelve el token a Decap CMS mediante postMessage.
import {
  STATE_COOKIE,
  leerCookie,
  cookieEstado,
  paginaPostMessage,
} from '../lib/oauth.js';

function responder(status, contenido, origin, limpiarCookie) {
  return new Response(paginaPostMessage(status, contenido, origin), {
    status: 200,
    headers: {
      'content-type': 'text/html;charset=UTF-8',
      'cache-control': 'no-store',
      ...(limpiarCookie ? { 'Set-Cookie': limpiarCookie } : {}),
    },
  });
}

export async function onRequest({ request, env }) {
  const origin = new URL(request.url).origin;
  const limpiarCookie = cookieEstado('');

  try {
    const params = new URL(request.url).searchParams;
    const estado = params.get('state') || '';
    const esperado = leerCookie(request.headers.get('cookie'), STATE_COOKIE);

    if (!estado || !esperado || estado !== esperado) {
      return responder(
        'error',
        { message: 'Sesión de autorización inválida. Intenta iniciar sesión de nuevo.' },
        origin,
        limpiarCookie,
      );
    }

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return responder(
        'error',
        { message: 'Falta la configuración del servidor.' },
        origin,
        limpiarCookie,
      );
    }

    const code = params.get('code');
    if (!code) {
      return responder(
        'error',
        { message: 'GitHub no devolvió el código de autorización.' },
        origin,
        limpiarCookie,
      );
    }

    const respuesta = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'decap-cms-lafranja',
        accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const resultado = await respuesta.json();

    if (resultado.error || !resultado.access_token) {
      return responder('error', resultado, origin, limpiarCookie);
    }

    return responder(
      'success',
      { token: resultado.access_token, provider: 'github' },
      origin,
      limpiarCookie,
    );
  } catch (error) {
    console.error(error);
    return new Response('No se pudo completar la autorización.', {
      status: 500,
      headers: { 'cache-control': 'no-store' },
    });
  }
}
