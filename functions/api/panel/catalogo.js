/* Lectura del catálogo real desde GitHub. El navegador jamás habla con GitHub:
   esta función usa el token cifrado de la sesión y devuelve solo los productos. */
import { leerSesion, json } from '../../lib/panel.js';

const REPO = 'NELSONFER-8/multiservicios-la-franja';
const RAMA = 'main';
const ARCHIVO = 'data/catalogo.json';

function decodificarContenido(contenido) {
  const limpio = String(contenido || '').replace(/\s/g, '');
  const binario = atob(limpio);
  return new TextDecoder().decode(Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0)));
}

export async function onRequest({ request, env }) {
  let sesion;
  try {
    sesion = await leerSesion(request, env);
  } catch (error) {
    console.error(error);
    return json({ error: 'No se pudo leer la sesión.' }, 500);
  }
  if (!sesion) return json({ error: 'Tu sesión venció. Vuelve a entrar con GitHub.' }, 401);

  try {
    const respuesta = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${ARCHIVO}?ref=${encodeURIComponent(RAMA)}`,
      {
        headers: {
          Authorization: `Bearer ${sesion.token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'lf-panel',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    if (!respuesta.ok) {
      if (respuesta.status === 401 || respuesta.status === 403) {
        return json({ error: 'GitHub rechazó el acceso. Vuelve a entrar con GitHub.' }, 401);
      }
      return json({ error: `No se pudo leer el catálogo de GitHub (HTTP ${respuesta.status}).` }, 502);
    }

    const archivo = await respuesta.json();
    const datos = JSON.parse(decodificarContenido(archivo.content));
    return json({
      productos: Array.isArray(datos.productos) ? datos.productos : [],
      sha: archivo.sha,
      rama: RAMA,
      repo: REPO,
    });
  } catch (error) {
    console.error(error);
    return json({ error: 'No se pudo procesar el catálogo.' }, 502);
  }
}
