// OAuth proxy para Decap CMS en Cloudflare Pages.
// Guarda un estado aleatorio en una cookie y redirige al login de GitHub.
import { crearEstado, cookieEstado } from '../lib/oauth.js';

export async function onRequest({ request, env }) {
  try {
    if (!env.GITHUB_CLIENT_ID) {
      return new Response('Falta la configuración del servidor.', { status: 500 });
    }

    const url = new URL(request.url);
    const state = crearEstado();
    const destino = new URL('https://github.com/login/oauth/authorize');
    destino.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    destino.searchParams.set('redirect_uri', new URL('/api/callback', url.origin).href);
    destino.searchParams.set('scope', 'repo user');
    destino.searchParams.set('state', state);

    return new Response(null, {
      status: 302,
      headers: {
        Location: destino.href,
        'Set-Cookie': cookieEstado(state),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(error);
    return new Response('No se pudo iniciar sesión.', { status: 500 });
  }
}
