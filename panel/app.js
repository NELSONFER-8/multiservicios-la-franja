/* Panel propio de LA FRANJA — gestión completa de catálogo y contenidos.
   Todas las peticiones van a Pages Functions del mismo origen; el navegador
   nunca habla con GitHub directamente. */
(function () {
  'use strict';

  var API = {
    sesion: '/api/panel/sesion',
    datos: '/api/panel/datos',
    imagen: '/api/panel/imagen',
  };

  var UNIDADES = ['unidad', 'bolsa', 'rollo', 'mt2', 'pie'];
  var ETIQUETA_UNIDAD = {
    unidad: 'unidad', bolsa: 'bolsa', rollo: 'rollo', mt2: 'm²', pie: 'pie',
  };
  var ICONO_CAJA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM8 7V4h8v3M4 12h16"/></svg>';

  var CAMPOS_PRODUCTO = [
    { name: 'nombre', label: 'Nombre del producto', tipo: 'texto', ancho: true, requerido: true },
    { name: 'categoria', label: 'Categoría', tipo: 'texto', sugerencias: 'categorias', requerido: true },
    { name: 'subcategoria', label: 'Subcategoría', tipo: 'texto', sugerencias: 'subcategorias', requerido: true },
    { name: 'precio', label: 'Precio (Q)', tipo: 'numero', requerido: true },
    { name: 'unidad', label: 'Unidad de venta', tipo: 'opciones', opciones: UNIDADES },
    { name: 'sku', label: 'SKU (opcional)', tipo: 'texto' },
    { name: 'imagen', label: 'Imagen del producto', tipo: 'imagen', ancho: true, ayuda: 'Sube un archivo, pega un enlace o elige una imagen ya publicada.' },
    { name: 'descripcion', label: 'Descripción corta', tipo: 'area', ancho: true },
    { name: 'activo', label: 'Activo (visible en la web)', tipo: 'check' },
    { name: 'destacado', label: 'Destacado', tipo: 'check' },
  ];

  var SECCIONES = {
    productos: {
      titulo: 'Productos', seccion: 'CATÁLOGO',
      bajada: 'Agrega, edita y publica productos. Cada guardado crea un commit en GitHub.',
      archivo: 'data/catalogo.json', tipo: 'productos', clave: 'productos',
      singular: 'producto', campos: CAMPOS_PRODUCTO,
    },
    categorias: {
      titulo: 'Categorías', seccion: 'CATÁLOGO',
      bajada: 'Créalas aquí antes de usarlas en los productos.',
      archivo: 'data/categorias', tipo: 'carpeta', singular: 'categoría',
      campos: [
        { name: 'nombre', label: 'Nombre de la categoría', tipo: 'texto', requerido: true },
        { name: 'imagen', label: 'Imagen de la categoría', tipo: 'imagen', ancho: true, ayuda: 'Sube un archivo, pega un enlace o elige una imagen ya publicada.' },
      ],
    },
    subcategorias: {
      titulo: 'Subcategorías', seccion: 'CATÁLOGO',
      bajada: 'Asigna cada subcategoría a una categoría existente.',
      archivo: 'data/subcategorias', tipo: 'carpeta', singular: 'subcategoría',
      campos: [
        { name: 'nombre', label: 'Nombre de la subcategoría', tipo: 'texto', requerido: true },
        { name: 'categoria', label: 'Categoría a la que pertenece', tipo: 'texto', sugerencias: 'categorias', requerido: true },
      ],
    },
    servicios: {
      titulo: 'Servicios', seccion: 'CONTENIDO',
      bajada: 'Tarjetas de servicios y botones hacia su galería de trabajos.',
      archivo: 'data/servicios.json', tipo: 'lista', clave: 'servicios', singular: 'servicio',
      campos: [
        { name: 'titulo', label: 'Título', tipo: 'texto', requerido: true },
        { name: 'slug', label: 'Identificador (slug)', tipo: 'texto', requerido: true, ayuda: 'Ej. vidrieria, herreria' },
        { name: 'descripcion', label: 'Descripción', tipo: 'area', ancho: true },
        { name: 'imagen', label: 'Imagen del servicio', tipo: 'imagen', ancho: true },
        { name: 'verTrabajos', label: 'Mostrar botón «Ver trabajos»', tipo: 'check' },
      ],
    },
    trabajos: {
      titulo: 'Trabajos', seccion: 'CONTENIDO',
      bajada: 'Fotos de trabajos terminados, agrupadas por servicio.',
      archivo: 'data/trabajos.json', tipo: 'lista', clave: 'trabajos', singular: 'trabajo',
      campos: [
        { name: 'titulo', label: 'Título del trabajo', tipo: 'texto', ancho: true, requerido: true },
        { name: 'servicio', label: 'Servicio', tipo: 'texto', requerido: true, ayuda: 'vidrieria, herreria, laminas…' },
        { name: 'descripcion', label: 'Descripción', tipo: 'area', ancho: true },
        { name: 'imagen', label: 'Foto del trabajo', tipo: 'imagen', ancho: true },
      ],
    },
    negocio: {
      titulo: 'Datos del negocio', seccion: 'CONTENIDO',
      bajada: 'Logo, WhatsApp, dirección, horarios y colores del sitio.',
      archivo: 'data/site.json', tipo: 'json', singular: 'dato',
    },
    paginas: {
      titulo: 'Textos de páginas', seccion: 'CONTENIDO',
      bajada: 'Títulos y párrafos de todas las páginas públicas.',
      archivo: 'data/paginas.json', tipo: 'json', singular: 'texto',
    },
    resumen: {
      titulo: 'Resumen', seccion: 'PANORAMA',
      bajada: 'Una vista rápida del estado del catálogo.',
      tipo: 'resumen',
    },
  };

  var estado = {
    vista: 'productos',
    usuario: '',
    datos: null,
    sha: '',
    items: [],
    borrados: [],
    sucio: false,
    guardando: false,
    editando: -1,
    esNuevo: false,
    sugerencias: { categorias: [], subcategorias: [] },
    resumenProductos: [],
    resumenSha: '',
    timerAviso: null,
    timerCajon: null,
    galeriaCampo: '',
    galeriaImagenes: [],
  };

  function $(id) { return document.getElementById(id); }

  function esc(valor) {
    return String(valor == null ? '' : valor).replace(/[&<>"']/g, function (caracter) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter];
    });
  }

  function slug(texto) {
    return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function esActivo(producto) {
    return producto.activo !== false && String(producto.activo).toLowerCase() !== 'false';
  }

  function esDestacado(producto) {
    return producto.destacado === true || String(producto.destacado).toLowerCase() === 'true';
  }

  function etiquetaUnidad(valor) { return ETIQUETA_UNIDAD[valor] || String(valor || ''); }

  function textoPrecio(valor) {
    var numero = Number(valor);
    if (!isFinite(numero)) return 'Consultar';
    return 'Q ' + numero.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function rutaImagen(registro) {
    var imagen = String(registro && registro.imagen ? registro.imagen : '').trim();
    if (!imagen) return '';
    if (/^https?:\/\//i.test(imagen)) return esc(imagen);
    return '/' + esc(imagen.replace(/^\/+/, ''));
  }

  function imagenValida(valor) {
    if (!valor) return true;
    return /^\/[A-Za-z0-9._\/-]+$/.test(valor) || /^https?:\/\/[^\s"'<>]{1,490}$/i.test(valor);
  }

  function miniatura(registro, clase) {
    var imagen = rutaImagen(registro);
    return '<div class="' + (clase || 'miniatura') + '">' +
      (imagen ? '<img src="' + imagen + '" alt="" loading="lazy">' : ICONO_CAJA) + '</div>';
  }

  function pildoras(producto) {
    var html = esActivo(producto)
      ? '<span class="pildora activo">Activo</span>'
      : '<span class="pildora inactivo">Inactivo</span>';
    if (esDestacado(producto)) html += '<span class="pildora destacado">Destacado</span>';
    return '<div class="grupo-pildoras">' + html + '</div>';
  }

  function aviso(mensaje, tipo) {
    var caja = $('aviso');
    caja.textContent = String(mensaje || '').slice(0, 400);
    caja.className = 'aviso-flotante ' + (tipo === 'bad' ? 'bad' : 'ok');
    caja.hidden = false;
    if (estado.timerAviso) clearTimeout(estado.timerAviso);
    estado.timerAviso = setTimeout(function () { caja.hidden = true; }, 4200);
  }

  /* ---------- API ---------- */

  function apiGet(archivo) {
    return fetch(API.datos + '?archivo=' + encodeURIComponent(archivo), { cache: 'no-store' })
      .then(function (respuesta) {
        return respuesta.json().then(function (datos) {
          if (!respuesta.ok) {
            var error = new Error(datos.error || 'No se pudo leer ' + archivo);
            error.status = respuesta.status;
            throw error;
          }
          return datos;
        });
      });
  }

  function apiPost(archivo, cuerpo) {
    return fetch(API.datos + '?archivo=' + encodeURIComponent(archivo), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    }).then(function (respuesta) {
      return respuesta.json().then(function (datos) {
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar.');
        return datos;
      });
    });
  }

  /* ---------- Sesión ---------- */

  function mostrarAcceso(mensaje) {
    $('cargando').hidden = true;
    $('estructura').hidden = true;
    $('acceso').hidden = false;
    if (mensaje) {
      $('error-acceso').textContent = mensaje;
      $('error-acceso').hidden = false;
    }
  }

  function verificarSesion() {
    fetch(API.sesion, { cache: 'no-store' })
      .then(function (respuesta) {
        if (!respuesta.ok) throw new Error('No se pudo comprobar la sesión.');
        return respuesta.json();
      })
      .then(function (datos) {
        if (!datos.autenticado) { mostrarAcceso(); return; }
        estado.usuario = datos.usuario || 'Administrador';
        $('cargando').hidden = true;
        $('acceso').hidden = true;
        $('estructura').hidden = false;
        $('nombre-usuario').textContent = estado.usuario;
        $('avatar').textContent = estado.usuario.charAt(0).toUpperCase();
        cargarSugerencias();
        cargarSeccion();
      })
      .catch(function (error) { mostrarAcceso(error.message); });
  }

  function cargarSugerencias() {
    Promise.all([
      apiGet('data/categorias').catch(function () { return { items: [] }; }),
      apiGet('data/subcategorias').catch(function () { return { items: [] }; }),
    ]).then(function (resultados) {
      estado.sugerencias.categorias = (resultados[0].items || []).map(function (x) { return x.contenido.nombre; });
      estado.sugerencias.subcategorias = (resultados[1].items || []).map(function (x) { return x.contenido.nombre; });
    });
  }

  /* ---------- Carga y guardado ---------- */

  function cargarSeccion() {
    var cfg = SECCIONES[estado.vista];
    if (cfg.tipo === 'resumen') return cargarResumen();

    prepararVista();
    return apiGet(cfg.archivo).then(function (respuesta) {
      if (cfg.tipo === 'carpeta') {
        estado.items = respuesta.items || [];
      } else {
        estado.datos = respuesta.contenido;
      }
      estado.sha = respuesta.sha || '';
      estado.borrados = [];
      estado.sucio = false;
      estado.editando = -1;
      $('json-texto').value = cfg.tipo === 'json'
        ? JSON.stringify(estado.datos, null, 2) : '';
      dibujar();
    }).catch(function (error) {
      if (error.status === 401) {
        mostrarAcceso('Tu sesión venció. Vuelve a entrar con GitHub.');
        return;
      }
      aviso(error.message, 'bad');
      $('filas').innerHTML = '';
      $('vacio').hidden = false;
      $('vacio').textContent = error.message;
    });
  }

  function marcarSucio() {
    estado.sucio = true;
    actualizarBarra();
  }

  function actualizarBarra() {
    var barra = $('barra-acciones');
    var cfg = SECCIONES[estado.vista];
    barra.hidden = !estado.sucio || cfg.tipo === 'resumen';
    $('texto-cambios').textContent = estado.guardando
      ? 'Publicando en GitHub…'
      : 'Tienes cambios sin guardar en ' + cfg.titulo.toLowerCase() + '.';
    $('guardar').disabled = estado.guardando;
  }

  function guardarCambios() {
    if (estado.guardando) return Promise.resolve();
    var cfg = SECCIONES[estado.vista];
    if (!cfg.archivo) return Promise.resolve();
    var cuerpo = { mensaje: 'Panel: actualizar ' + cfg.titulo.toLowerCase() };

    if (cfg.tipo === 'carpeta') {
      cuerpo.cambios = {
        items: estado.items.map(function (item) {
          return { nombre: item.nombre, sha: item.sha, contenido: item.contenido };
        }),
        borrados: estado.borrados.slice(),
      };
    } else {
      if (cfg.tipo === 'json') {
        try {
          estado.datos = JSON.parse($('json-texto').value);
        } catch (error) {
          aviso('JSON no válido: ' + error.message, 'bad');
          return Promise.resolve();
        }
      }
      cuerpo.contenido = estado.datos;
      cuerpo.sha = estado.sha;
    }

    estado.guardando = true;
    actualizarBarra();
    return apiPost(cfg.archivo, cuerpo).then(function (respuesta) {
      estado.guardando = false;
      if (cfg.tipo !== 'carpeta') {
        estado.datos = respuesta.contenido || estado.datos;
        estado.sha = respuesta.sha || estado.sha;
      }
      estado.borrados = [];
      estado.sucio = false;
      return cargarSeccion().then(function () {
        actualizarBarra();
        aviso('Cambios publicados en GitHub.', 'ok');
      });
    }).catch(function (error) {
      estado.guardando = false;
      actualizarBarra();
      aviso(error.message, 'bad');
    });
  }

  function descartar() {
    aviso('Se descartaron los cambios locales.', 'ok');
    cargarSeccion();
  }

  /* ---------- Listas ---------- */

  function registros() {
    var cfg = SECCIONES[estado.vista];
    if (cfg.tipo === 'carpeta') {
      return estado.items.map(function (item, indice) {
        var copia = {};
        Object.keys(item.contenido || {}).forEach(function (clave) { copia[clave] = item.contenido[clave]; });
        copia._nombre = item.nombre;
        copia._sha = item.sha;
        copia._indice = indice;
        return copia;
      });
    }
    return (estado.datos && estado.datos[cfg.clave]) || [];
  }

  function productosFiltrados() {
    var texto = $('buscar').value.trim().toLowerCase();
    var categoria = $('filtro-categoria').value;
    var estadoFiltro = $('filtro-estado').value;
    return registros().filter(function (producto) {
      if (categoria && String(producto.categoria || '') !== categoria) return false;
      if (estadoFiltro === 'activo' && !esActivo(producto)) return false;
      if (estadoFiltro === 'inactivo' && esActivo(producto)) return false;
      if (estadoFiltro === 'destacado' && !esDestacado(producto)) return false;
      if (!texto) return true;
      return [producto.nombre, producto.descripcion, producto.sku, producto.categoria, producto.subcategoria]
        .join(' ').toLowerCase().indexOf(texto) !== -1;
    });
  }

  function listaFiltrada() {
    var cfg = SECCIONES[estado.vista];
    var texto = $('buscar').value.trim().toLowerCase();
    if (!texto) return registros();
    return registros().filter(function (registro) {
      return Object.keys(registro).map(function (clave) { return registro[clave]; })
        .join(' ').toLowerCase().indexOf(texto) !== -1;
    });
  }

  function accion(indice, nombre, simbolo, titulo, clase) {
    return '<button type="button" data-accion="' + nombre + '" data-indice="' + indice +
      '" title="' + esc(titulo) + '" class="' + (clase || '') + '">' + simbolo + '</button>';
  }

  function botonesFila(indice, opciones) {
    var html = accion(indice, 'editar', '✎', 'Editar');
    if (opciones.duplicar) html += accion(indice, 'duplicar', '⧉', 'Duplicar');
    if (opciones.reordenar) {
      html += accion(indice, 'arriba', '↑', 'Subir');
      html += accion(indice, 'abajo', '↓', 'Bajar');
    }
    html += accion(indice, 'borrar', '✕', 'Eliminar', 'borrar');
    return '<div class="acciones">' + html + '</div>';
  }

  function metrica(etiqueta, valor, nota, clase) {
    return '<div class="metrica ' + (clase || '') + '">' +
      '<span class="etiqueta">' + esc(etiqueta) + '</span>' +
      '<span class="valor">' + esc(valor) + '</span>' +
      '<span class="nota">' + esc(nota) + '</span></div>';
  }

  function dibujar() {
    var cfg = SECCIONES[estado.vista];
    actualizarBarra();
    if (cfg.tipo === 'json') { dibujarJson(); return; }
    if (cfg.tipo === 'resumen') { dibujarResumen(); return; }
    if (cfg.tipo === 'productos') { dibujarProductos(); return; }
    dibujarListaSimple();
  }

  function dibujarProductos() {
    var lista = productosFiltrados();
    var todos = registros();
    var activos = todos.filter(esActivo).length;
    var destacados = todos.filter(esDestacado).length;
    $('tarjetas').hidden = false;
    $('tarjetas').innerHTML =
      metrica('Productos', todos.length, 'en el catálogo', 'destacada') +
      metrica('Activos', activos, 'visibles en la tienda') +
      metrica('Destacados', destacados, 'aparecen primero', 'alerta') +
      metrica('Sin imagen', todos.filter(function (p) { return !rutaImagen(p); }).length, 'con tarjeta de texto');

    $('cabecera-tabla').innerHTML = '<th>Producto</th><th>Categoría</th><th>Precio</th><th>Unidad</th><th>Estado</th><th>Acciones</th>';
    $('filas').innerHTML = lista.map(function (producto) {
      var indice = todos.indexOf(producto);
      var sku = producto.sku ? '<small>SKU ' + esc(producto.sku) + '</small>' : '';
      return '<tr data-indice="' + indice + '">' +
        '<td><div class="celda-producto">' + miniatura(producto) +
        '<div><strong>' + esc(producto.nombre) + '</strong>' + sku + '</div></div></td>' +
        '<td><span class="subtexto">' + esc(producto.categoria) + '</span><br><small>' + esc(producto.subcategoria) + '</small></td>' +
        '<td><input class="celda-input" type="number" step="0.01" min="0" data-campo="precio" data-indice="' + indice + '" value="' + esc(producto.precio) + '" aria-label="Precio de ' + esc(producto.nombre) + '"></td>' +
        '<td><span class="subtexto">' + esc(etiquetaUnidad(producto.unidad)) + '</span></td>' +
        '<td><div class="grupo-pildoras">' +
        '<button type="button" class="pildora boton-pildora ' + (esActivo(producto) ? 'activo' : 'inactivo') + '" data-accion="activo" data-indice="' + indice + '">' + (esActivo(producto) ? 'Activo' : 'Inactivo') + '</button>' +
        (esDestacado(producto) ? '<button type="button" class="pildora boton-pildora destacado" data-accion="destacado" data-indice="' + indice + '">Destacado</button>' : '') +
        '</div></td>' +
        '<td>' + botonesFila(indice, { duplicar: true, reordenar: true }) + '</td>' +
        '</tr>';
    }).join('');

    $('vacio').hidden = lista.length > 0;
    if (!lista.length) $('vacio').textContent = 'No hay productos con esos filtros.';
    $('pie-tabla').textContent = 'Mostrando ' + lista.length + ' de ' + todos.length +
      ' productos · commit ' + (estado.sha ? estado.sha.slice(0, 7) : '—');
    $('contador-menu').textContent = String(todos.length);
  }

  function dibujarListaSimple() {
    var cfg = SECCIONES[estado.vista];
    var todos = registros();
    var lista = listaFiltrada();
    $('tarjetas').hidden = true;
    $('cabecera-tabla').innerHTML = '<th>Nombre</th><th>' +
      (estado.vista === 'subcategorias' ? 'Categoría' : estado.vista === 'servicios' ? 'Detalle' : 'Información') +
      '</th><th>Acciones</th>';

    $('filas').innerHTML = lista.map(function (registro) {
      var indice = cfg.tipo === 'carpeta' ? registro._indice : todos.indexOf(registro);
      var secundario = '';
      if (estado.vista === 'subcategorias') secundario = esc(registro.categoria);
      else if (estado.vista === 'categorias') secundario = esc(registro.imagen || 'Sin imagen');
      else if (estado.vista === 'servicios') secundario = esc(registro.slug) + (registro.verTrabajos ? ' · con galería' : '');
      else secundario = esc(registro.servicio || '') + (registro.imagen ? ' · con foto' : '');
      return '<tr class="no-click" data-indice="' + indice + '">' +
        '<td><strong>' + esc(registro.nombre || registro.titulo || 'Sin nombre') + '</strong></td>' +
        '<td><span class="subtexto">' + secundario + '</span></td>' +
        '<td>' + botonesFila(indice, { duplicar: cfg.tipo === 'lista', reordenar: cfg.tipo === 'lista' }) + '</td>' +
        '</tr>';
    }).join('');

    $('vacio').hidden = lista.length > 0;
    if (!lista.length) $('vacio').textContent = 'No hay registros. Pulsa «Agregar» para crear el primero.';
    $('pie-tabla').textContent = lista.length + ' de ' + todos.length + ' registros · ' + cfg.archivo;
    if (estado.vista !== 'productos') $('contador-menu').textContent = String(todos.length);
  }

  function dibujarJson() {
    $('cabecera-tabla').innerHTML = '';
    $('filas').innerHTML = '';
    $('vacio').hidden = true;
    $('pie-tabla').textContent = 'Archivo: ' + SECCIONES[estado.vista].archivo +
      ' · commit ' + (estado.sha ? estado.sha.slice(0, 7) : '—');
  }

  function cargarResumen() {
    $('vista-datos').hidden = true;
    $('vista-resumen').hidden = false;
    $('barra-acciones').hidden = true;
    return apiGet('data/catalogo.json').then(function (respuesta) {
      estado.resumenProductos = (respuesta.contenido && respuesta.contenido.productos) || [];
      estado.resumenSha = respuesta.sha || '';
      dibujarResumen();
    }).catch(function (error) { aviso(error.message, 'bad'); });
  }

  function dibujarResumen() {
    var productos = estado.resumenProductos;
    var activos = productos.filter(esActivo).length;
    var destacados = productos.filter(esDestacado).length;
    var categorias = [];
    var subcategorias = [];
    productos.forEach(function (producto) {
      var categoria = String(producto.categoria || 'Otros');
      if (categorias.indexOf(categoria) === -1) categorias.push(categoria);
      var sub = String(producto.subcategoria || 'General');
      if (subcategorias.indexOf(sub) === -1) subcategorias.push(sub);
    });

    $('tarjetas-resumen').innerHTML =
      metrica('Productos', productos.length, 'en el catálogo', 'destacada') +
      metrica('Activos', activos, 'visibles en la tienda') +
      metrica('Destacados', destacados, 'aparecen primero', 'alerta') +
      metrica('Categorías', categorias.length, 'en uso');

    var conteos = categorias.map(function (nombre) {
      return { nombre: nombre, total: productos.filter(function (p) { return String(p.categoria || 'Otros') === nombre; }).length };
    });
    var maximo = Math.max.apply(null, [1].concat(conteos.map(function (c) { return c.total; })));
    $('desglose-categorias').innerHTML = conteos.map(function (c) {
      return '<div class="barra-categoria"><div class="linea"><strong>' + esc(c.nombre) +
        '</strong><span>' + c.total + '</span></div><div class="camino"><i style="width:' +
        Math.round((c.total / maximo) * 100) + '%"></i></div></div>';
    }).join('') || '<p class="subtexto">Sin categorías.</p>';

    var filas = [
      ['Subcategorías en uso', subcategorias.length],
      ['Sin imagen', productos.filter(function (p) { return !rutaImagen(p); }).length],
      ['Rama', 'main'],
      ['Repositorio', 'NELSONFER-8/multiservicios-la-franja'],
      ['Último commit', estado.resumenSha ? estado.resumenSha.slice(0, 12) : '—'],
    ];
    $('detalles-catalogo').innerHTML = filas.map(function (fila) {
      return '<div><dt>' + esc(fila[0]) + '</dt><dd>' + esc(fila[1]) + '</dd></div>';
    }).join('');
  }

  /* ---------- Formulario lateral ---------- */

  function datalists() {
    return ['categorias', 'subcategorias'].map(function (clave) {
      return '<datalist id="dl-' + clave + '">' +
        (estado.sugerencias[clave] || []).map(function (valor) {
          return '<option value="' + esc(valor) + '"></option>';
        }).join('') + '</datalist>';
    }).join('');
  }

  function campoHtml(campo, valor) {
    var id = 'f-' + campo.name;
    var clase = 'campo ' + (campo.ancho ? 'ancho ' : '') +
      (campo.requerido ? 'requerido ' : '') + (campo.tipo === 'check' ? 'check ' : '');
    var inicio = '<label class="' + clase + '" for="' + id + '"><span>' + esc(campo.label) + '</span>';

    if (campo.tipo === 'check') {
      return inicio + '<input id="' + id + '" type="checkbox"' + (valor ? ' checked' : '') + '></label>';
    }

    if (campo.tipo === 'imagen') {
      var vista = valor ? rutaImagen({ imagen: valor }) : '';
      var ayudaImagen = campo.ayuda ? '<small class="ayuda-campo">' + esc(campo.ayuda) + '</small>' : '';
      return '<div class="campo ancho">' +
        '<span>' + esc(campo.label) + '</span>' +
        '<div class="vista-imagen" id="vista-' + id + '">' +
        (vista ? '<img src="' + vista + '" alt="Vista previa">' : ICONO_CAJA + '<span>Sin imagen</span>') +
        '</div>' +
        '<input id="' + id + '" type="text" value="' + esc(valor || '') + '" placeholder="/img/uploads/foto.jpg o https://…">' +
        '<div class="botones-imagen">' +
        '<button type="button" class="boton chico" data-accion="subir-imagen">Subir desde la PC</button>' +
        '<button type="button" class="boton chico" data-accion="galeria-imagen">Elegir del sitio</button>' +
        '<input id="' + id + '-archivo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>' +
        '</div>' +
        '<small class="estado-imagen" id="estado-' + id + '" hidden></small>' + ayudaImagen +
        '</div>';
    }

    var control;
    if (campo.tipo === 'area') {
      control = '<textarea id="' + id + '" rows="3">' + esc(valor || '') + '</textarea>';
    } else if (campo.tipo === 'opciones') {
      control = '<select id="' + id + '">' + (campo.opciones || []).map(function (opcion) {
        return '<option value="' + esc(opcion) + '"' + (String(valor || '') === opcion ? ' selected' : '') + '>' +
          esc(ETIQUETA_UNIDAD[opcion] || opcion) + '</option>';
      }).join('') + '</select>';
    } else {
      var lista = campo.sugerencias ? ' list="dl-' + campo.sugerencias + '"' : '';
      control = '<input id="' + id + '" type="' + (campo.tipo === 'numero' ? 'number' : 'text') + '"' +
        (campo.tipo === 'numero' ? ' step="0.01" min="0"' : '') + lista +
        ' value="' + esc(valor == null ? '' : valor) + '">';
    }
    var ayuda = campo.ayuda ? '<small class="ayuda-campo">' + esc(campo.ayuda) + '</small>' : '';
    return inicio + control + ayuda + '</label>';
  }

  function abrirFicha(indice) {
    var cfg = SECCIONES[estado.vista];
    var registro = indice >= 0 ? registros()[indice] : null;
    /* En listas simples el índice es real; en filtradas se recalcula. */
    if (indice >= 0 && !registro) registro = listaFiltrada()[indice] || null;
    estado.editando = indice;
    estado.esNuevo = indice < 0;

    if (estado.timerCajon) { clearTimeout(estado.timerCajon); estado.timerCajon = null; }
    $('cajon-eyebrow').textContent = estado.esNuevo ? 'NUEVO REGISTRO' : 'EDITAR REGISTRO';
    $('cajon-titulo').textContent = estado.esNuevo
      ? 'Agregar ' + cfg.singular
      : String((registro && (registro.nombre || registro.titulo)) || cfg.singular);
    $('eliminar-registro').hidden = estado.esNuevo;

    $('cajon-cuerpo').innerHTML =
      '<p class="error-ficha" id="error-ficha" hidden></p>' +
      datalists() + '<div class="campos">' +
      cfg.campos.map(function (campo) {
        var valor = registro ? registro[campo.name] : (campo.tipo === 'check' ? false : '');
        if (campo.name === 'unidad' && !valor) valor = 'unidad';
        if (campo.name === 'activo' && estado.esNuevo) valor = true;
        if (campo.name === 'precio' && !valor) valor = '';
        return campoHtml(campo, valor);
      }).join('') + '</div>';

    $('telon').hidden = false;
    $('cajon').hidden = false;
    requestAnimationFrame(function () {
      $('telon').classList.add('abierto');
      $('cajon').classList.add('abierto');
      var primerCampo = $('cajon-cuerpo').querySelector('input, select, textarea');
      if (primerCampo) primerCampo.focus();
    });
  }

  function estadoImagen(id, mensaje) {
    var caja = $('estado-' + id);
    if (!caja) return;
    caja.textContent = mensaje || '';
    caja.hidden = !mensaje;
  }

  function actualizarVistaImagen(id) {
    var entrada = $(id);
    var vista = $('vista-' + id);
    if (!entrada || !vista) return;
    var valor = entrada.value.trim();
    vista.innerHTML = valor
      ? '<img src="' + rutaImagen({ imagen: valor }) + '" alt="Vista previa">'
      : ICONO_CAJA + '<span>Sin imagen</span>';
  }

  function fijarImagen(id, ruta) {
    var entrada = $(id);
    if (!entrada) return;
    entrada.value = ruta;
    actualizarVistaImagen(id);
    marcarSucio();
  }

  function leerArchivoImagen(archivo) {
    return new Promise(function (resolve, reject) {
      var lector = new FileReader();
      lector.onload = function () { resolve(String(lector.result)); };
      lector.onerror = function () { reject(new Error('No se pudo leer el archivo.')); };
      lector.readAsDataURL(archivo);
    });
  }

  function subirImagenDesdePC(archivo, id) {
    if (!archivo) return;
    var extension = archivo.name.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].indexOf(extension) === -1) {
      aviso('Formato no permitido. Usa JPG, PNG, WEBP o GIF.', 'bad');
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      aviso('La imagen supera los 5 MB.', 'bad');
      return;
    }
    estadoImagen(id, 'Subiendo imagen…');
    leerArchivoImagen(archivo)
      .then(function (contenido) {
        return fetch(API.imagen, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ nombre: archivo.name, contenido: contenido }),
        });
      })
      .then(function (respuesta) {
        return respuesta.json().then(function (datos) {
          if (!respuesta.ok) throw new Error(datos.error || 'No se pudo subir la imagen.');
          return datos;
        });
      })
      .then(function (datos) {
        estadoImagen(id, '');
        fijarImagen(id, datos.ruta);
        aviso('Imagen subida: ' + datos.nombre, 'ok');
      })
      .catch(function (error) {
        estadoImagen(id, '');
        aviso(error.message, 'bad');
      });
  }

  function dibujarGaleria() {
    if (!$('galeria-grid')) return;
    var texto = $('buscar-galeria').value.trim().toLowerCase();
    var lista = estado.galeriaImagenes.filter(function (imagen) {
      return imagen.nombre.toLowerCase().indexOf(texto) !== -1;
    });
    if (!lista.length) {
      $('galeria-grid').innerHTML = '<p class="galeria-vacio">' +
        (texto ? 'No hay imágenes con ese nombre.' : 'Todavía no hay imágenes publicadas.') + '</p>';
      return;
    }
    $('galeria-grid').innerHTML = lista.map(function (imagen) {
      return '<button type="button" class="miniatura-opcion" data-ruta="' + esc(imagen.ruta) +
        '" title="' + esc(imagen.nombre) + '">' +
        '<img src="' + esc(imagen.url) + '" alt="" loading="lazy"><span>' + esc(imagen.nombre) + '</span></button>';
    }).join('');
  }

  function abrirGaleria(id) {
    estado.galeriaCampo = id;
    $('buscar-galeria').value = '';
    $('galeria-grid').innerHTML = '<p class="galeria-vacio">Cargando imágenes…</p>';
    $('telon').hidden = false;
    $('galeria').hidden = false;
    requestAnimationFrame(function () {
      $('telon').classList.add('abierto');
      $('galeria').classList.add('abierto');
      $('buscar-galeria').focus();
    });
    fetch(API.imagen, { cache: 'no-store' })
      .then(function (respuesta) {
        return respuesta.json().then(function (datos) {
          if (!respuesta.ok) throw new Error(datos.error || 'No se pudo cargar la galería.');
          return datos;
        });
      })
      .then(function (datos) {
        estado.galeriaImagenes = datos.imagenes || [];
        $('galeria-nota').textContent = estado.galeriaImagenes.length +
          (estado.galeriaImagenes.length === 1 ? ' imagen publicada' : ' imágenes publicadas') +
          ' en img/uploads.';
        dibujarGaleria();
      })
      .catch(function (error) {
        $('galeria-grid').innerHTML = '<p class="galeria-vacio">' + esc(error.message) + '</p>';
      });
  }

  function cerrarGaleria() {
    if ($('galeria').hidden) return;
    $('galeria').classList.remove('abierto');
    setTimeout(function () {
      $('galeria').hidden = true;
      estado.galeriaCampo = '';
      if ($('cajon').hidden) {
        $('telon').classList.remove('abierto');
        $('telon').hidden = true;
      }
    }, 220);
  }

  function leerFicha() {
    var cfg = SECCIONES[estado.vista];
    var registro = {};
    cfg.campos.forEach(function (campo) {
      var elemento = $('f-' + campo.name);
      if (!elemento) return;
      if (campo.tipo === 'check') registro[campo.name] = elemento.checked;
      else if (campo.tipo === 'numero') registro[campo.name] = Number(elemento.value);
      else registro[campo.name] = elemento.value.trim();
    });

    cfg.campos.forEach(function (campo) {
      var valor = registro[campo.name];
      if (!campo.requerido) return;
      if (valor === '' || valor == null || (campo.tipo === 'numero' && !isFinite(valor))) {
        throw new Error('Falta completar: ' + campo.label);
      }
    });

    if (registro.imagen && !imagenValida(registro.imagen)) {
      throw new Error('La imagen debe ser una ruta del sitio o un enlace http(s).');
    }

    if (cfg.tipo === 'productos') {
      if (!isFinite(registro.precio) || registro.precio < 0) throw new Error('El precio debe ser un número positivo.');
      if (UNIDADES.indexOf(registro.unidad) === -1) throw new Error('La unidad no es válida.');
      if (!registro.sku) delete registro.sku;
    }
    return registro;
  }

  function aplicarFicha(registro) {
    var cfg = SECCIONES[estado.vista];
    if (cfg.tipo === 'carpeta') {
      if (estado.esNuevo) estado.items.push({ nombre: slug(registro.nombre), sha: '', contenido: registro });
      else estado.items[estado.editando].contenido = registro;
    } else {
      var lista = estado.datos[cfg.clave];
      if (estado.esNuevo) lista.push(registro);
      else lista[estado.editando] = registro;
    }
    marcarSucio();
  }

  function errorFicha(mensaje) {
    var caja = $('error-ficha');
    if (!caja) return;
    caja.textContent = mensaje;
    caja.hidden = false;
  }

  function guardarFicha() {
    try {
      var registro = leerFicha();
      aplicarFicha(registro);
      cerrarFicha();
      guardarCambios();
    } catch (error) {
      errorFicha(error.message);
    }
  }

  function cerrarFicha() {
    if ($('cajon').hidden) return;
    $('telon').classList.remove('abierto');
    $('cajon').classList.remove('abierto');
    estado.timerCajon = setTimeout(function () {
      $('cajon').hidden = true;
      if ($('galeria').hidden) $('telon').hidden = true;
      estado.timerCajon = null;
    }, 240);
  }

  function eliminarFicha() {
    if (estado.esNuevo) { cerrarFicha(); return; }
    var cfg = SECCIONES[estado.vista];
    var registro = registros()[estado.editando];
    var nombre = registro && (registro.nombre || registro.titulo) || 'este registro';
    if (!window.confirm('¿Eliminar "' + nombre + '"? El cambio se publicará al guardar.')) return;

    if (cfg.tipo === 'carpeta') {
      estado.borrados.push(registro._nombre);
      estado.items.splice(estado.editando, 1);
    } else {
      estado.datos[cfg.clave].splice(estado.editando, 1);
    }
    cerrarFicha();
    marcarSucio();
    dibujar();
  }

  function duplicar(indice) {
    var cfg = SECCIONES[estado.vista];
    var original = registros()[indice];
    if (!original) return;
    var copia = JSON.parse(JSON.stringify(original));
    delete copia._nombre;
    delete copia._sha;
    delete copia._indice;
    if (copia.nombre) copia.nombre = copia.nombre + ' (copia)';
    if (copia.titulo) copia.titulo = copia.titulo + ' (copia)';
    if (copia.sku) copia.sku = copia.sku + '-copia';

    if (cfg.tipo === 'carpeta') {
      var base = slug(copia.nombre) || 'nuevo';
      var nombre = base;
      var sufijo = 2;
      while (estado.items.some(function (item) { return item.nombre === nombre; })) {
        nombre = base + '-' + sufijo;
        sufijo += 1;
      }
      estado.items.push({ nombre: nombre, sha: '', contenido: copia });
    } else {
      estado.datos[cfg.clave].splice(indice + 1, 0, copia);
    }
    marcarSucio();
    dibujar();
    aviso('Registro duplicado. Recuerda guardar.', 'ok');
  }

  function mover(indice, delta) {
    var cfg = SECCIONES[estado.vista];
    var destino = indice + delta;
    if (cfg.tipo === 'carpeta') {
      if (destino < 0 || destino >= estado.items.length) return;
      var temporal = estado.items[indice];
      estado.items[indice] = estado.items[destino];
      estado.items[destino] = temporal;
    } else {
      var lista = estado.datos[cfg.clave];
      if (destino < 0 || destino >= lista.length) return;
      var copia = lista[indice];
      lista[indice] = lista[destino];
      lista[destino] = copia;
    }
    marcarSucio();
    dibujar();
  }

  function alternar(indice, campo) {
    var registro = registros()[indice];
    if (!registro) return;
    var cfg = SECCIONES[estado.vista];
    registro[campo] = !(registro[campo] === true);
    marcarSucio();
    dibujar();
  }

  /* ---------- Navegación ---------- */

  function prepararVista() {
    var cfg = SECCIONES[estado.vista];
    $('seccion').textContent = cfg.seccion;
    $('titulo').textContent = cfg.titulo;
    $('bajada').textContent = cfg.bajada;
    $('vista-datos').hidden = false;
    $('vista-resumen').hidden = true;

    var gestionable = cfg.tipo === 'productos' || cfg.tipo === 'lista' || cfg.tipo === 'carpeta';
    $('env-buscador').hidden = !gestionable;
    $('filtro-categoria').hidden = cfg.tipo !== 'productos';
    $('filtro-estado').hidden = cfg.tipo !== 'productos';
    $('tabla-contenedor').hidden = cfg.tipo === 'json';
    $('editor-json').hidden = cfg.tipo !== 'json';
    $('agregar').hidden = !gestionable;
    $('actualizar').hidden = cfg.tipo === 'resumen';
    if (gestionable) $('agregar').textContent = '+ Agregar ' + cfg.singular;
    $('buscar').placeholder = cfg.tipo === 'productos' ? 'Buscar producto o SKU…' : 'Buscar…';
  }

  function cambiarVista(nombre) {
    if (!SECCIONES[nombre] || nombre === estado.vista) return;
    if (estado.sucio && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos y cambiar de sección?')) return;
    cerrarFicha();
    estado.vista = nombre;
    estado.sucio = false;
    Array.prototype.forEach.call(document.querySelectorAll('.menu-item[data-vista]'), function (boton) {
      boton.classList.toggle('activo', boton.getAttribute('data-vista') === nombre);
    });
    cargarSeccion();
  }

  /* ---------- Arranque ---------- */

  function iniciar() {
    $('entrar').addEventListener('click', function () { window.location.href = '/api/panel/auth'; });
    $('salir').addEventListener('click', function () { window.location.href = '/api/panel/salir'; });
    $('actualizar').addEventListener('click', function () { cargarSeccion(); });
    $('agregar').addEventListener('click', function () { abrirFicha(-1); });
    $('guardar').addEventListener('click', guardarCambios);
    $('descartar').addEventListener('click', descartar);
    $('guardar-ficha').addEventListener('click', guardarFicha);
    $('cancelar-ficha').addEventListener('click', cerrarFicha);
    $('eliminar-registro').addEventListener('click', eliminarFicha);
    $('cerrar-cajon').addEventListener('click', cerrarFicha);
    $('telon').addEventListener('click', function () {
      if (!$('galeria').hidden) cerrarGaleria();
      else cerrarFicha();
    });
    $('cerrar-galeria').addEventListener('click', cerrarGaleria);
    $('buscar-galeria').addEventListener('input', dibujarGaleria);
    $('galeria-grid').addEventListener('click', function (evento) {
      var boton = evento.target.closest('.miniatura-opcion[data-ruta]');
      if (!boton) return;
      var campo = estado.galeriaCampo;
      cerrarGaleria();
      fijarImagen(campo, boton.getAttribute('data-ruta'));
      aviso('Imagen seleccionada. Recuerda guardar.', 'ok');
    });

    $('cajon-cuerpo').addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-accion]');
      if (!boton) return;
      evento.preventDefault();
      evento.stopPropagation();
      var campo = boton.closest('.campo');
      if (!campo) return;
      var entrada = campo.querySelector('input[type="text"]');
      if (!entrada) return;
      if (boton.getAttribute('data-accion') === 'subir-imagen') {
        var archivo = campo.querySelector('input[type="file"]');
        if (archivo) archivo.click();
      } else if (boton.getAttribute('data-accion') === 'galeria-imagen') {
        abrirGaleria(entrada.id);
      }
    });

    $('cajon-cuerpo').addEventListener('change', function (evento) {
      if (!evento.target.matches('input[type="file"]')) return;
      var id = evento.target.id.replace(/-archivo$/, '');
      var archivo = evento.target.files && evento.target.files[0];
      evento.target.value = '';
      subirImagenDesdePC(archivo, id);
    });

    $('cajon-cuerpo').addEventListener('input', function (evento) {
      if (evento.target.type !== 'text' || !/^f-/.test(evento.target.id)) return;
      if ($('vista-' + evento.target.id)) actualizarVistaImagen(evento.target.id);
    });

    $('buscar').addEventListener('input', dibujar);
    $('filtro-categoria').addEventListener('change', dibujar);
    $('filtro-estado').addEventListener('change', dibujar);
    $('json-texto').addEventListener('input', marcarSucio);

    $('filas').addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-accion]');
      if (boton) {
        evento.stopPropagation();
        var indice = Number(boton.getAttribute('data-indice'));
        var accionNombre = boton.getAttribute('data-accion');
        if (accionNombre === 'editar') abrirFicha(indice);
        else if (accionNombre === 'borrar') {
          var cfg = SECCIONES[estado.vista];
          var registro = registros()[indice];
          var nombre = registro && (registro.nombre || registro.titulo) || 'este registro';
          if (window.confirm('¿Eliminar "' + nombre + '"? El cambio se publicará al guardar.')) {
            if (cfg.tipo === 'carpeta') {
              estado.borrados.push(registro._nombre);
              estado.items.splice(indice, 1);
            } else {
              estado.datos[cfg.clave].splice(indice, 1);
            }
            marcarSucio();
            dibujar();
          }
        } else if (accionNombre === 'duplicar') duplicar(indice);
        else if (accionNombre === 'arriba') mover(indice, -1);
        else if (accionNombre === 'abajo') mover(indice, 1);
        else if (accionNombre === 'activo' || accionNombre === 'destacado') alternar(indice, accionNombre);
        return;
      }
      var fila = evento.target.closest('tr[data-indice]');
      var cfgActual = SECCIONES[estado.vista];
      if (fila && (cfgActual.tipo === 'productos' || cfgActual.tipo === 'lista')) {
        abrirFicha(Number(fila.getAttribute('data-indice')));
      }
    });

    $('filas').addEventListener('change', function (evento) {
      var campo = evento.target.closest('.celda-input[data-campo]');
      if (!campo) return;
      var indice = Number(campo.getAttribute('data-indice'));
      var registro = registros()[indice];
      if (!registro) return;
      registro[campo.getAttribute('data-campo')] = Number(campo.value);
      marcarSucio();
    });

    Array.prototype.forEach.call(document.querySelectorAll('.menu-item[data-vista]'), function (boton) {
      boton.addEventListener('click', function () { cambiarVista(boton.getAttribute('data-vista')); });
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key !== 'Escape') return;
      if (!$('galeria').hidden) cerrarGaleria();
      else if (!$('cajon').hidden) cerrarFicha();
    });

    var parametros = new URLSearchParams(window.location.search);
    var error = parametros.get('error');
    if (error) {
      $('error-acceso').textContent = String(error).slice(0, 300);
      $('error-acceso').hidden = false;
    }

    verificarSesion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
}());
