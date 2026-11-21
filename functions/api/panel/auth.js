/* Inicio de sesión del panel propio. Reutiliza el OAuth de Decap: misma app de
   GitHub, mismo /api/callback y mismo state en cookie. Solo cambia el prefijo
   del state para que el callback sepa que debe devolvernos al panel. */
import { crearEstado, cookieEstado } from '../../lib/oauth.js';
import { PANEL_PREFIX } from '../../lib/panel.js';

export async function onRequest({ request, env }) {
  try {
    if (!env.GITHUB_CLIENT_ID) {
      return new Response('Falta la configuración del servidor.', { status: 500 });
    }

    const url = new URL(request.url);
    const estado = PANEL_PREFIX + crearEstado();
    const destino = new URL('https://github.com/login/oauth/authorize');
    destino.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    destino.searchParams.set('redirect_uri', new URL('/api/callback', url.origin).href);
    destino.searchParams.set('scope', 'repo user');
    destino.searchParams.set('state', estado);

    return new Response(null, {
      status: 302,
      headers: {
        Location: destino.href,
        'Set-Cookie': cookieEstado(estado),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(error);
    return new Response('No se pudo iniciar sesión.', { status: 500 });
  }
}
