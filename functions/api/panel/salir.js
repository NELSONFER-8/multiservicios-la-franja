/* Cierra la sesión del panel borrando la cookie cifrada. */
import { limpiarSesion } from '../../lib/panel.js';

export async function onRequest() {
  const cabeceras = new Headers({ 'Cache-Control': 'no-store', Location: '/panel/' });
  cabeceras.append('Set-Cookie', limpiarSesion());
  return new Response(null, { status: 302, headers: cabeceras });
}
