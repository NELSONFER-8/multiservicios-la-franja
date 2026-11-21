/* Estado de sesión del panel. Nunca devuelve el token de GitHub. */
import { leerSesion, json } from '../../lib/panel.js';

export async function onRequest({ request, env }) {
  try {
    const sesion = await leerSesion(request, env);
    return json({
      autenticado: Boolean(sesion),
      usuario: sesion ? sesion.usuario : null,
    });
  } catch (error) {
    console.error(error);
    return json({ autenticado: false, usuario: null });
  }
}
