// Canjea el código de GitHub. Con Decap entrega el token por postMessage como
// siempre; con el panel propio lo guarda cifrado en una cookie HttpOnly y
// redirige a /panel/, para que el navegador nunca vea el token.
import {
  STATE_COOKIE,
  leerCookie,
  cookieEstado,
  paginaPostMessage,
} from '../lib/oauth.js';
import {
  esEstadoPanel,
  cifrar,
  cookieSesion,
  PANEL_MAX_AGE,
} from '../lib/panel.js';

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

function responderPanelError(mensaje, origin, limpiarCookie) {
  const destino = new URL('/panel/', origin);
  destino.searchParams.set('error', mensaje);
  const cabeceras = new Headers({ 'Cache-Control': 'no-store', Location: destino.href });
  cabeceras.append('Set-Cookie', limpiarCookie);
  return new Response(null, { status: 302, headers: cabeceras });
}

async function responderPanelExito(token, origin, limpiarCookie, env) {
  let usuario = 'Administrador';
  try {
    const respuesta = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'lf-panel',
      },
    });
    if (respuesta.ok) {
      const perfil = await respuesta.json();
      usuario = perfil.name || perfil.login || usuario;
    }
  } catch (error) {
    /* El nombre es solo decorativo: no bloquea el acceso si falla. */
  }

  const valor = await cifrar({
    token,
    usuario,
    exp: Math.floor(Date.now() / 1000) + PANEL_MAX_AGE,
  }, env);

  const cabeceras = new Headers({
    'Cache-Control': 'no-store',
    Location: new URL('/panel/', origin).href,
  });
  cabeceras.append('Set-Cookie', limpiarCookie);
  cabeceras.append('Set-Cookie', cookieSesion(valor));
  return new Response(null, { status: 302, headers: cabeceras });
}

export async function onRequest({ request, env }) {
  const origin = new URL(request.url).origin;
  const limpiarCookie = cookieEstado('');

  try {
    const params = new URL(request.url).searchParams;
    const estado = params.get('state') || '';
    const esperado = leerCookie(request.headers.get('cookie'), STATE_COOKIE);
    const esPanel = esEstadoPanel(estado || esperado);

    if (!estado || !esperado || estado !== esperado) {
      const mensaje = 'Sesión de autorización inválida. Intenta iniciar sesión de nuevo.';
      return esPanel
        ? responderPanelError(mensaje, origin, limpiarCookie)
        : responder('error', { message: mensaje }, origin, limpiarCookie);
    }

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      const mensaje = 'Falta la configuración del servidor.';
      return esPanel
        ? responderPanelError(mensaje, origin, limpiarCookie)
        : responder('error', { message: mensaje }, origin, limpiarCookie);
    }

    const code = params.get('code');
    if (!code) {
      const mensaje = 'GitHub no devolvió el código de autorización.';
      return esPanel
        ? responderPanelError(mensaje, origin, limpiarCookie)
        : responder('error', { message: mensaje }, origin, limpiarCookie);
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
      const mensaje = 'GitHub no pudo completar la autorización. Intenta de nuevo.';
      return esPanel
        ? responderPanelError(mensaje, origin, limpiarCookie)
        : responder('error', resultado, origin, limpiarCookie);
    }

    if (esPanel) {
      return responderPanelExito(resultado.access_token, origin, limpiarCookie, env);
    }

    return responder(
      'success',
      { token: resultado.access_token, provider: 'github' },
      origin,
      limpiarCookie,
    );
  } catch (error) {
    console.error(error);
    if (esEstadoPanel(new URL(request.url).searchParams.get('state'))) {
      return responderPanelError('No se pudo completar la autorización.', origin, limpiarCookie);
    }
    return new Response('No se pudo completar la autorización.', {
      status: 500,
      headers: { 'cache-control': 'no-store' },
    });
  }
}
