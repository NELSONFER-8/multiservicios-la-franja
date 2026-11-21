/* Lectura y escritura genérica de los archivos del panel.
   El navegador envía solo el contenido validado: esta función comprueba la
   ruta contra una allowlist, el esquema de los datos y el SHA antes de hacer
   un commit a GitHub. */
import { leerSesion, json } from '../../lib/panel.js';
import * as almacen from '../../lib/almacen.js';

export async function onRequest({ request, env }) {
  let sesion;
  try {
    sesion = await leerSesion(request, env);
  } catch (error) {
    return json({ error: 'No se pudo leer la sesión.' }, 500);
  }
  if (!sesion) return json({ error: 'Tu sesión venció. Vuelve a entrar con GitHub.' }, 401);

  const url = new URL(request.url);
  const ruta = url.searchParams.get('archivo') || '';
  if (!almacen.rutaValida(ruta)) {
    return json({ error: 'Ese archivo no se puede editar desde el panel.' }, 400);
  }

  try {
    if (request.method === 'GET') {
      if (almacen.esCarpeta(ruta)) {
        return json({ items: await almacen.listarCarpeta(sesion.token, ruta) });
      }
      return json(await almacen.leerArchivo(sesion.token, ruta));
    }

    if (request.method === 'POST') {
      const cuerpo = await request.json();
      if (!cuerpo || typeof cuerpo !== 'object') throw new Error('Datos no válidos.');
      const mensaje = String(cuerpo.mensaje || '').slice(0, 180);

      if (almacen.esCarpeta(ruta)) {
        const resultado = await almacen.guardarCarpeta(sesion.token, ruta, cuerpo.cambios, mensaje);
        return json({ ok: true, ...resultado });
      }

      const contenido = almacen.validarContenido(ruta, cuerpo.contenido);
      const actual = await almacen.leerArchivo(sesion.token, ruta);
      if (cuerpo.sha && cuerpo.sha !== actual.sha) {
        return json({
          error: 'El archivo cambió en GitHub mientras lo editabas. Recarga antes de guardar.',
          conflicto: true,
        }, 409);
      }
      const guardado = await almacen.guardarArchivo(sesion.token, ruta, contenido, actual.sha, mensaje);
      return json({
        ok: true,
        contenido,
        sha: (guardado && guardado.content && guardado.content.sha) || actual.sha,
      });
    }

    return json({ error: 'Método no permitido.' }, 405);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'No se pudo completar la operación.';
    if (/HTTP 401|HTTP 403/.test(mensaje)) {
      return json({ error: 'GitHub rechazó el acceso. Vuelve a entrar con GitHub.' }, 401);
    }
    return json({ error: mensaje }, 502);
  }
}
