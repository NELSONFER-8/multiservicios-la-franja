/* Mejoras de interfaz para el panel Decap CMS de LA FRANJA.
   Solo manipula el DOM: no escribe datos, no hace peticiones y escapa
   cualquier valor usando textContent (nunca innerHTML). */
(function () {
  'use strict';

  var ETIQUETA = '[class*="NestedObjectLabel"]';
  var ITEM = '[class*="listControlItem"]';

  function mejorarBotonAgregar() {
    try {
      var botones = document.querySelectorAll('button');
      for (var i = 0; i < botones.length; i++) {
        var b = botones[i];
        if (b.firstChild && b.firstChild.nodeType === 3 && /Add productos/i.test(b.firstChild.nodeValue)) {
          b.firstChild.nodeValue = '+ Agregar producto';
        }
      }
    } catch (e) { /* el CMS sigue funcionando si falla un adorno */ }
  }

  function parsearResumen(texto) {
    var m = String(texto || '').match(/^(.*?)\s*\|\s*(.*?)\s*›\s*(.*?)\s*—\s*Q([\d.,]+)(.*)$/);
    if (!m) return null;
    var datos = {
      nombre: m[1].trim(),
      categoria: m[2].trim(),
      subcategoria: m[3].trim(),
      precio: m[4].trim(),
      sku: '',
      activo: null,
      destacado: false
    };
    var tokens = m[5].split('·');
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i].trim();
      if (!t) continue;
      if (t.indexOf('SKU ') === 0) datos.sku = t.slice(4).trim();
      else if (t === 'ACTIVO') datos.activo = true;
      else if (t === 'INACTIVO') datos.activo = false;
      else if (t === 'DESTACADO') datos.destacado = true;
    }
    return datos;
  }

  function span(clase, texto) {
    var e = document.createElement('span');
    e.className = clase;
    e.textContent = texto;
    return e;
  }

  function mejorarEtiqueta(etiqueta) {
    var texto = etiqueta.textContent || '';
    if (etiqueta.getAttribute('data-lf-rendered') === texto) return;
    var d = parsearResumen(texto);
    if (!d) return;
    etiqueta.setAttribute('data-lf-raw', texto);

    var frag = document.createDocumentFragment();
    frag.appendChild(span('lf-card-name', d.nombre));

    var meta = document.createElement('span');
    meta.className = 'lf-card-meta';
    meta.appendChild(span('lf-chip lf-chip-cat', d.categoria));
    meta.appendChild(span('lf-chip lf-chip-sub', d.subcategoria));
    meta.appendChild(span('lf-chip lf-chip-price', 'Q' + d.precio));
    if (d.sku) meta.appendChild(span('lf-chip lf-chip-sku', 'SKU ' + d.sku));
    if (d.activo === false) meta.appendChild(span('lf-chip lf-chip-off', 'Inactivo'));
    else if (d.activo === true) meta.appendChild(span('lf-chip lf-chip-on', 'Activo'));
    if (d.destacado) meta.appendChild(span('lf-chip lf-chip-star', 'Destacado'));
    frag.appendChild(meta);

    etiqueta.textContent = '';
    etiqueta.appendChild(frag);
    etiqueta.classList.add('lf-card-label');
    etiqueta.setAttribute('data-lf-rendered', etiqueta.textContent);
  }

  function mejorarFicha(item) {
    var hijos = Array.from(item.children || []);
    var wrapper = hijos.find(function (h) {
      return h.querySelector && h.querySelector('label[for^="nombre-field-"]');
    });
    var etiqueta = hijos.find(function (h) {
      return h.matches && h.matches(ETIQUETA);
    });
    /* Decap oculta la etiqueta resumen cuando el producto está abierto. */
    if (!wrapper || !etiqueta || etiqueta.getBoundingClientRect().height > 0) return;
    wrapper.classList.add('lf-form-abierta');
    if (wrapper.querySelector(':scope > .lf-editor-head')) return;

    var texto = etiqueta.getAttribute('data-lf-raw') || etiqueta.textContent || '';
    var d = parsearResumen(texto);
    var head = document.createElement('div');
    head.className = 'lf-editor-head';
    var titulo = document.createElement('h3');
    titulo.className = 'lf-editor-title';
    titulo.textContent = d ? d.nombre : 'Ficha de producto';
    var sub = document.createElement('span');
    sub.className = 'lf-editor-subtitle';
    sub.textContent = 'Datos del producto';
    head.appendChild(titulo);
    head.appendChild(sub);
    wrapper.insertBefore(head, wrapper.firstChild);
  }

  function mejorarTodo() {
    mejorarBotonAgregar();
    var etiquetas = document.querySelectorAll(ETIQUETA);
    for (var i = 0; i < etiquetas.length; i++) mejorarEtiqueta(etiquetas[i]);
    var items = document.querySelectorAll(ITEM);
    for (var j = 0; j < items.length; j++) mejorarFicha(items[j]);
  }

  function iniciar() {
    try { mejorarTodo(); } catch (e) { /* no interrumpir Decap CMS */ }
    var pendiente = false;
    var obs = new MutationObserver(function () {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(function () {
        pendiente = false;
        try { mejorarTodo(); } catch (e) { /* ignorar */ }
        requestAnimationFrame(function () {
          try { mejorarTodo(); } catch (e) { /* ignorar */ }
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
}());
