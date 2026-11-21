/* Acceso a los archivos del repositorio para el panel propio.
   Solo se permiten rutas de la allowlist y los contenidos se validan antes de
   escribir. El token llega desde la sesión cifrada, nunca desde el navegador. */

const REPO = 'NELSONFER-8/multiservicios-la-franja';
const RAMA = 'main';
const BASE = `https://api.github.com/repos/${REPO}/contents/`;

const ARCHIVOS = new Set([
  'data/catalogo.json',
  'data/servicios.json',
  'data/trabajos.json',
  'data/site.json',
  'data/paginas.json',
]);
const CARPETAS = new Set(['data/categorias', 'data/subcategorias']);
const UNIDADES = new Set(['unidad', 'bolsa', 'rollo', 'mt2', 'pie']);
const CAMPOS_PRODUCTO = new Set([
  'nombre', 'categoria', 'subcategoria', 'precio', 'unidad',
  'sku', 'descripcion', 'activo', 'destacado', 'imagen',
]);

export const RAMA_ACTUAL = RAMA;

export function rutaValida(ruta) {
  return ARCHIVOS.has(ruta) || CARPETAS.has(ruta);
}

export function esCarpeta(ruta) {
  return CARPETAS.has(ruta);
}

function texto(valor, limite, obligatorio) {
  const s = String(valor == null ? '' : valor).trim();
  if (obligatorio && !s) throw new Error('Hay un campo obligatorio vacío.');
  if (s.length > limite) throw new Error('Un texto es demasiado largo.');
  return s;
}

export function validarProducto(producto) {
  if (!producto || typeof producto !== 'object' || Array.isArray(producto)) {
    throw new Error('Cada producto debe ser un objeto.');
  }
  Object.keys(producto).forEach((clave) => {
    if (!CAMPOS_PRODUCTO.has(clave)) throw new Error(`Campo no permitido: ${clave}`);
  });
  const limpio = {
    nombre: texto(producto.nombre, 200, true),
    categoria: texto(producto.categoria, 120, true),
    subcategoria: texto(producto.subcategoria, 120, true),
    descripcion: texto(producto.descripcion, 2000, false),
    precio: Number(producto.precio),
    unidad: String(producto.unidad || 'unidad'),
    activo: producto.activo !== false,
    destacado: producto.destacado === true,
    imagen: texto(producto.imagen, 500, false),
  };
  if (!isFinite(limpio.precio) || limpio.precio < 0) throw new Error('El precio debe ser un número positivo.');
  if (!UNIDADES.has(limpio.unidad)) throw new Error('La unidad no es válida.');
  if (limpio.imagen && !/^\/[A-Za-z0-9._\/-]+$/.test(limpio.imagen)) {
    throw new Error('La ruta de la imagen no es válida.');
  }
  if (producto.sku != null && String(producto.sku).trim()) {
    limpio.sku = texto(producto.sku, 80, false);
  }
  return limpio;
}

export function validarContenido(ruta, datos) {
  const serialized = JSON.stringify(datos);
  if (serialized.length > 500000) throw new Error('El archivo es demasiado grande.');

  if (ruta === 'data/catalogo.json') {
    if (!datos || !Array.isArray(datos.productos)) throw new Error('Falta la lista de productos.');
    if (datos.productos.length > 500) throw new Error('Demasiados productos.');
    const productos = datos.productos.map(validarProducto);
    return { productos };
  }

  if (ruta === 'data/servicios.json') {
    if (!datos || !Array.isArray(datos.servicios)) throw new Error('Falta la lista de servicios.');
    return { servicios: datos.servicios.map((s) => ({
      titulo: texto(s.titulo, 200, true),
      slug: texto(s.slug, 100, true).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      descripcion: texto(s.descripcion, 2000, false),
      imagen: texto(s.imagen, 500, false),
      verTrabajos: s.verTrabajos === true,
    })) };
  }

  if (ruta === 'data/trabajos.json') {
    if (!datos || !Array.isArray(datos.trabajos)) throw new Error('Falta la lista de trabajos.');
    return { trabajos: datos.trabajos.map((t) => ({
      titulo: texto(t.titulo, 200, true),
      servicio: texto(t.servicio, 100, true),
      descripcion: texto(t.descripcion, 2000, false),
      imagen: texto(t.imagen, 500, false),
    })) };
  }

  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error('El contenido debe ser un objeto JSON.');
  }
  return datos;
}

export function validarItemCarpeta(ruta, item) {
  if (!item || typeof item !== 'object') throw new Error('Elemento no válido.');
  const nombre = texto(item.nombre, 120, true).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!nombre) throw new Error('El nombre no genera un identificador válido.');
  const contenido = { nombre: texto(item.nombre, 120, true) };

  if (ruta === 'data/categorias') {
    contenido.imagen = texto(item.imagen, 500, false);
  } else {
    contenido.categoria = texto(item.categoria, 120, true);
  }
  return { nombre, contenido };
}

function cabeceras(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'lf-panel',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function decodificar(contenido) {
  const limpio = String(contenido || '').replace(/\s/g, '');
  const binario = atob(limpio);
  return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
}

function codificar(texto) {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 1) binario += String.fromCharCode(bytes[i]);
  return btoa(binario);
}

function mensajeSeguro(mensaje) {
  return String(mensaje || 'Actualización desde el panel')
    .replace(/[\r\n]+/g, ' ').trim().slice(0, 180) || 'Actualización desde el panel';
}

export async function leerArchivo(token, ruta) {
  const respuesta = await fetch(`${BASE}${ruta}?ref=${encodeURIComponent(RAMA)}`, {
    headers: cabeceras(token),
  });
  if (!respuesta.ok) throw new Error(`No se pudo leer ${ruta} (HTTP ${respuesta.status}).`);
  const archivo = await respuesta.json();
  return {
    contenido: JSON.parse(decodificar(archivo.content)),
    sha: archivo.sha,
  };
}

export async function listarCarpeta(token, ruta) {
  const respuesta = await fetch(`${BASE}${ruta}?ref=${encodeURIComponent(RAMA)}`, {
    headers: cabeceras(token),
  });
  if (!respuesta.ok) throw new Error(`No se pudo listar ${ruta} (HTTP ${respuesta.status}).`);
  const lista = await respuesta.json();
  const archivos = (Array.isArray(lista) ? lista : []).filter((x) => x.type === 'file' && x.name.endsWith('.json'));
  return Promise.all(archivos.map(async (archivo) => {
    const datos = await leerArchivo(token, `${ruta}/${archivo.name}`);
    return { nombre: archivo.name.replace(/\.json$/, ''), sha: archivo.sha, contenido: datos.contenido };
  }));
}

async function escribir(token, ruta, contenido, sha, mensaje, borrar) {
  const cuerpo = { message: mensajeSeguro(mensaje), branch: RAMA };
  if (!borrar) cuerpo.content = codificar(JSON.stringify(contenido, null, 2) + '\n');
  if (sha) cuerpo.sha = sha;
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: 'PUT',
    headers: { ...cabeceras(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`GitHub rechazó el guardado (HTTP ${respuesta.status}). ${detalle.slice(0, 200)}`);
  }
  return respuesta.json();
}

export async function guardarArchivo(token, ruta, contenido, sha, mensaje) {
  return escribir(token, ruta, contenido, sha, mensaje, false);
}

export async function guardarCarpeta(token, ruta, cambios, mensaje) {
  if (!cambios || !Array.isArray(cambios.items) || !Array.isArray(cambios.borrados)) {
    throw new Error('Cambios de carpeta no válidos.');
  }
  const actuales = await listarCarpeta(token, ruta);
  const porNombre = new Map(actuales.map((item) => [item.nombre, item]));

  const items = cambios.items.map((item) => validarItemCarpeta(ruta, item));
  items.forEach((item) => {
    const actual = porNombre.get(item.nombre);
    if (actual && !item.sha) {
      throw new Error(`Ya existe "${item.nombre}". Cambia el nombre antes de guardar.`);
    }
    if (actual && item.sha !== actual.sha) {
      throw new Error(`"${item.nombre}" cambió en GitHub mientras lo editabas. Recarga antes de guardar.`);
    }
  });
  cambios.borrados.forEach((nombre) => {
    if (!porNombre.has(nombre)) throw new Error(`No existe "${nombre}".`);
  });

  for (const item of items) {
    const actual = porNombre.get(item.nombre);
    await escribir(
      token, `${ruta}/${item.nombre}.json`, item.contenido,
      actual ? actual.sha : null, mensaje, false,
    );
  }
  for (const nombre of cambios.borrados) {
    await escribir(token, `${ruta}/${nombre}.json`, null, porNombre.get(nombre).sha, mensaje, true);
  }
  return { guardados: items.length, borrados: cambios.borrados.length };
}
