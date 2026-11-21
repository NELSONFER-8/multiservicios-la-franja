/* Galería y subida de imágenes del panel.
   GET  -> lista las imágenes publicadas en img/uploads.
   POST -> valida y sube un archivo desde la PC, devuelve su ruta pública. */
import { leerSesion, json } from '../../lib/panel.js';
import * as imagenes from '../../lib/imagenes.js';

export async function onRequest({ request, env }) {
  let sesion;
  try {
    sesion = await leerSesion(request, env);
  } catch (error) {
    return json({ error: 'No se pudo leer la sesión.' }, 500);
  }
  if (!sesion) return json({ error: 'Tu sesión venció. Vuelve a entrar con GitHub.' }, 401);

  try {
    if (request.method === 'GET') {
      return json({ imagenes: await imagenes.listarImagenes(sesion.token) });
    }
    if (request.method === 'POST') {
      const cuerpo = await request.json();
      if (!cuerpo || typeof cuerpo !== 'object') throw new Error('Datos no válidos.');
      const imagen = imagenes.validarImagen(cuerpo.nombre, cuerpo.contenido);
      const ruta = await imagenes.subirImagen(sesion.token, imagen);
      return json({ ok: true, ruta, nombre: imagen.nombre, mime: imagen.mime });
    }
    return json({ error: 'Método no permitido.' }, 405);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'No se pudo completar la operación.';
    if (/HTTP 401|HTTP 403/.test(mensaje)) {
      return json({ error: 'GitHub rechazó el acceso. Vuelve a entrar con GitHub.' }, 401);
    }
    return json({ error: mensaje }, 400);
  }
}
