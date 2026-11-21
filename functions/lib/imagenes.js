/* Subida y selección de imágenes para el panel.
   El navegador envía el archivo en base64 a una Pages Function: es la función
   la que valida el tipo real del archivo y hace el commit a GitHub. */

const REPO = 'NELSONFER-8/multiservicios-la-franja';
const RAMA = 'main';
const CARPETA = 'img/uploads';
const BASE = `https://api.github.com/repos/${REPO}/contents/`;

const EXTENSIONES = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif',
};
const LIMITE = 5 * 1024 * 1024;

function cabeceras(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'lf-panel',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function sufijo() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function nombreSeguro(nombre) {
  const original = String(nombre || '').trim();
  const punto = original.lastIndexOf('.');
  if (punto < 1) throw new Error('El archivo debe tener extensión de imagen.');
  const extension = original.slice(punto + 1).toLowerCase();
  if (!EXTENSIONES[extension]) {
    throw new Error('Formato no permitido. Usa JPG, PNG, WEBP o GIF.');
  }
  const base = original.slice(0, punto).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 80) || 'imagen';
  return { nombre: `${base}-${sufijo()}.${extension}`, mime: EXTENSIONES[extension] };
}

export function validarImagen(nombre, contenido) {
  const { nombre: seguro, mime } = nombreSeguro(nombre);
  const limpio = String(contenido || '').replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '').replace(/\s/g, '');
  if (!limpio || !/^[A-Za-z0-9+/]+={0,2}$/.test(limpio)) {
    throw new Error('El archivo de imagen no es válido.');
  }
  let binario;
  try {
    binario = atob(limpio);
  } catch (error) {
    throw new Error('No se pudo leer la imagen.');
  }
  if (binario.length > LIMITE) throw new Error('La imagen supera los 5 MB.');
  if (binario.length < 16) throw new Error('La imagen está vacía.');

  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  const empieza = (...valores) => valores.every((valor, i) => bytes[i] === valor);
  const texto = (inicio, valor) => valor.split('').every((c, i) => bytes[inicio + i] === c.charCodeAt(0));
  const extension = seguro.split('.').pop();
  const firmaValida =
    (extension === 'png' && empieza(0x89, 0x50, 0x4e, 0x47)) ||
    (extension === 'jpg' && empieza(0xff, 0xd8, 0xff)) ||
    (extension === 'jpeg' && empieza(0xff, 0xd8, 0xff)) ||
    (extension === 'webp' && texto(0, 'RIFF') && texto(8, 'WEBP')) ||
    (extension === 'gif' && texto(0, 'GIF8'));
  if (!firmaValida) throw new Error('El contenido no coincide con una imagen válida.');

  return { nombre: seguro, contenido: limpio, mime, bytes: binario.length };
}

export async function listarImagenes(token) {
  const respuesta = await fetch(`${BASE}${CARPETA}?ref=${encodeURIComponent(RAMA)}&per_page=100`, {
    headers: cabeceras(token),
  });
  if (!respuesta.ok) throw new Error(`No se pudo listar ${CARPETA} (HTTP ${respuesta.status}).`);
  const lista = await respuesta.json();
  return (Array.isArray(lista) ? lista : [])
    .filter((archivo) => archivo.type === 'file' && /\.(jpe?g|png|webp|gif)$/i.test(archivo.name))
    .map((archivo) => ({
      nombre: archivo.name,
      ruta: `/${CARPETA}/${archivo.name}`,
      url: archivo.download_url || `/${CARPETA}/${archivo.name}`,
      size: archivo.size || 0,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export async function subirImagen(token, imagen) {
  const respuesta = await fetch(`${BASE}${CARPETA}/${encodeURIComponent(imagen.nombre)}`, {
    method: 'PUT',
    headers: { ...cabeceras(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Panel: subir imagen ${imagen.nombre}`,
      branch: RAMA,
      content: imagen.contenido,
    }),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`GitHub rechazó la imagen (HTTP ${respuesta.status}). ${detalle.slice(0, 160)}`);
  }
  return `/${CARPETA}/${imagen.nombre}`;
}
