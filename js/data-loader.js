/* data-loader.js - Lee data/catalogo.json y data/servicios.json y dibuja las páginas.
   En http(s) siempre lee el JSON real (sin copias ocultas). La copia integrada solo se usa en file://. */
(function () {
  /* Ruta basada en la ubicación de este script: funciona con URLs limpias y con barras finales. */
  var script = document.currentScript || (function () {
    var s = document.querySelectorAll("script");
    return s[s.length - 1];
  })();
  var SRC = script && script.getAttribute("src") ? script.getAttribute("src") : "js/data-loader.js";
  /* Los JSON están al mismo nivel que la carpeta js/, no dentro de ella. */
  var BASE = SRC.replace(/^(.*\/)?js\/[^/]*$/, function (_, prefix) { return prefix || ""; });
  if (BASE === SRC) BASE = "";

  /* Unidades permitidas por el CMS. m² se muestra con su símbolo, el resto tal cual. */
  var ETIQUETAS_UNIDAD = { unidad: "unidad", bolsa: "bolsa", rollo: "rollo", mt2: "m²", pie: "pie" };
  function etiquetaUnidad(valor) {
    return ETIQUETAS_UNIDAD[valor] || String(valor || "");
  }
  function estaActivo(p) {
    return p && p.activo !== false && String(p.activo).toLowerCase() !== "false";
  }
  function esDestacado(p) {
    return Boolean(p && (p.destacado === true || String(p.destacado).toLowerCase() === "true"));
  }

  var FALLBACK = {
    catalogo: {"categorias":[{"nombre":"FERRETERÍA GENERAL","subcategorias":[{"nombre":"Herramientas manuales","productos":[{"nombre":"Martillo de uña 16 oz","descripcion":"Mango antideslizante, ideal para carpintería y construcción.","precio":65,"unidad":"unidad","imagen":""},{"nombre":"Alicate universal 8\"","descripcion":"Acero forjado con mangos aislados.","precio":55,"unidad":"unidad","imagen":""}]},{"nombre":"Clavos y tornillos","productos":[{"nombre":"Clavo de acero 3\"","descripcion":"Clavo común para construcción.","precio":8,"unidad":"unidad","imagen":""},{"nombre":"Tornillo para madera 2\"","descripcion":"Cabeza plana, paquete surtido.","precio":20,"unidad":"bolsa","imagen":""}]}]},{"nombre":"VIDRIERÍA","subcategorias":[{"nombre":"Vidrio plano","productos":[{"nombre":"Vidrio claro 3 mm","descripcion":"Corte a la medida para ventanas y puertas.","precio":90,"unidad":"mt2","imagen":""},{"nombre":"Vidrio claro 6 mm","descripcion":"Mayor resistencia para mesas y divisiones.","precio":150,"unidad":"mt2","imagen":""}]},{"nombre":"Espejos","productos":[{"nombre":"Espejo 4 mm","descripcion":"Espejo a la medida con bordes pulidos.","precio":180,"unidad":"mt2","imagen":""}]}]},{"nombre":"HERRERÍA","subcategorias":[{"nombre":"Puertas y portones","productos":[{"nombre":"Portón metálico","descripcion":"Fabricado a la medida, con pintura anticorrosiva.","precio":1200,"unidad":"unidad","imagen":""}]},{"nombre":"Ventanas y balcones","productos":[{"nombre":"Balcón de hierro","descripcion":"Diseño según tu espacio.","precio":350,"unidad":"mt2","imagen":""}]}]},{"nombre":"LÁMINAS Y PERFILES","subcategorias":[{"nombre":"Láminas","productos":[{"nombre":"Lámina galvanizada calibre 28","descripcion":"Para techos, 10 pies.","precio":95,"unidad":"unidad","imagen":""},{"nombre":"Lámina troquelada","descripcion":"Acabado resistente a la intemperie.","precio":110,"unidad":"unidad","imagen":""}]},{"nombre":"Perfiles","productos":[{"nombre":"Perfil tubular cuadrado 1\"","descripcion":"Tubo estructural de 6 metros.","precio":140,"unidad":"unidad","imagen":""},{"nombre":"Ángulo de hierro 1\"","descripcion":"Para estructuras y marcos.","precio":85,"unidad":"unidad","imagen":""}]}]},{"nombre":"MOLDURA","subcategorias":[{"nombre":"Molduras de madera","productos":[{"nombre":"Moldura de pared","descripcion":"Acabado liso, ideal para marcos y decoración.","precio":25,"unidad":"unidad","imagen":""},{"nombre":"Moldura para cuadros","descripcion":"Varios estilos disponibles.","precio":18,"unidad":"unidad","imagen":""}]}]}]},
    servicios: {"servicios":[{"titulo":"Vidriería","slug":"vidrieria","descripcion":"Ventanas, mostradores, vitrinas y cielo raso.","imagen":"","verTrabajos":true},{"titulo":"Trabajos de herrería","slug":"herreria","descripcion":"Puertas, portones, balcones y estructuras metálicas a la medida.","imagen":"","verTrabajos":true},{"titulo":"Venta de láminas y perfiles","slug":"laminas","descripcion":"Láminas para techo, tubos y ángulos.","imagen":"","verTrabajos":false},{"titulo":"Molduras y marcos","slug":"moldura","descripcion":"Molduras, marcos y acabados.","imagen":"","verTrabajos":false},{"titulo":"Ferretería en general","slug":"ferreteria","descripcion":"Herramientas y materiales de construcción.","imagen":"","verTrabajos":false},{"titulo":"Cotizaciones por WhatsApp","slug":"cotizaciones","descripcion":"Cotizaciones rápidas por WhatsApp.","imagen":"","verTrabajos":false}]},
    trabajos: {"trabajos":[]}
  };

  function slug(t) {
    return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* window.LAFRANJA.resolve(objeto, ruta): se usa con settings para textos editables. */
  function txt(path, fallback) {
    var v = window.LAFRANJA.resolve(window.LAFRANJA.settings, path);
    return (v === "" || v == null) ? fallback : v;
  }
  function avisoError(url) {
    return '<div class="aviso-error"><strong>No se pudo cargar ' + esc(url) + '</strong><br>' +
      'Revisa que el archivo exista en el servidor y que el despliegue haya terminado. ' +
      'No se están mostrando datos de respaldo.</div>';
  }

  function cargar(url, clave) {
    var full = BASE + url + "?v=" + Date.now(); /* evita caché: siempre datos recientes del CMS */
    return fetch(full, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " al cargar " + full);
      return r.json();
    }).catch(function (err) {
      if (location.protocol === "file:") {
        console.warn("[LA FRANJA] Modo local: se usan datos de respaldo.", err);
        return FALLBACK[clave];
      }
      console.error("[LA FRANJA] No se pudo cargar " + full, err);
      return null;
    });
  }
  /* El CMS guarda una lista plana de productos; se agrupan por categoría/subcategoría.
     También acepta el formato anterior por categorías anidadas. */
  /* Prepara una lista plana: oculta inactivos, conserva los campos del CMS y
     coloca los destacados primero manteniendo el orden original de los demás. */
  function prepararProductos(lista) {
    return (lista || []).filter(estaActivo).map(function (p) {
      return {
        nombre: p.nombre, descripcion: p.descripcion, precio: p.precio,
        categoria: p.categoria, subcategoria: p.subcategoria,
        unidad: p.unidad, imagen: p.imagen, sku: p.sku,
        activo: true, destacado: esDestacado(p)
      };
    }).sort(function (a, b) { return Number(b.destacado) - Number(a.destacado); });
  }

  function normalizar(data) {
    if (!data) return { categorias: [] };
    if (data.categorias) {
      return { categorias: (data.categorias || []).map(function (c) {
        return {
          nombre: c.nombre,
          subcategorias: (c.subcategorias || []).map(function (s) {
            return { nombre: s.nombre, productos: prepararProductos(s.productos) };
          })
        };
      }) };
    }
    var cats = [];
    prepararProductos(data.productos).forEach(function (p) {
      var nc = p.categoria || "Otros";
      var ns = p.subcategoria || "General";
      /* Une variantes del mismo nombre (mayúsculas, tildes, espacios) para no
         crear categorías duplicadas cuando se escriben de forma distinta. */
      var kc = slug(nc), ks = slug(ns);
      var c = cats.filter(function (x) { return slug(x.nombre) === kc; })[0];
      if (!c) { c = { nombre: nc, subcategorias: [] }; cats.push(c); }
      var s = c.subcategorias.filter(function (x) { return slug(x.nombre) === ks; })[0];
      if (!s) { s = { nombre: ns, productos: [] }; c.subcategorias.push(s); }
      s.productos.push(p);
    });
    return { categorias: cats };
  }

  function precio(p) {
    var n = Number(p);
    return isFinite(n) ? "Q " + n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Consultar";
  }

  /* Mantiene el filtro en la URL para poder compartirlo y usar el botón "atrás". */
  function setCatParam(cat) {
    var u = new URL(location.href);
    if (cat === "todos") u.searchParams.delete("cat");
    else u.searchParams.set("cat", cat);
    history.replaceState(null, "", u.pathname + u.search + u.hash);
  }

  /* ---------- Productos ---------- */
  function iniciarProductos(contenedor) {
    Promise.all([cargar("data/catalogo.json", "catalogo"), window.LAFRANJA.ready]).then(function (res) {
      var data = res[0];
      if (!data) { contenedor.innerHTML = avisoError("data/catalogo.json"); return; }
      var cats = normalizar(data).categorias || [];
      var filtros = document.getElementById("filtros");
      var buscador = document.getElementById("buscador");
      var params = new URLSearchParams(location.search);
      var activa = params.get("cat") || "todos";
      var texto = "";

      function dibujarFiltros() {
        var html = '<button class="chip' + (activa === "todos" ? " active" : "") + '" data-cat="todos">Todos</button>';
        cats.forEach(function (c) {
          var s = slug(c.nombre);
          html += '<button class="chip' + (activa === s ? " active" : "") + '" data-cat="' + s + '">' + esc(c.nombre) + "</button>";
        });
        filtros.innerHTML = html;
      }

      function dibujar() {
        var html = "";
        cats.forEach(function (c) {
          var s = slug(c.nombre);
          if (activa !== "todos" && activa !== s) return;
          var bloqueSubs = "";
          (c.subcategorias || []).forEach(function (sub) {
            var prods = (sub.productos || []).filter(function (p) {
              var buscable = [p.nombre, p.descripcion, sub.nombre, p.sku].join(" ").toLowerCase();
              return !texto || buscable.indexOf(texto) !== -1;
            });
            if (!prods.length) return;
            var tarjetas = prods.map(function (p) {
              var img = p.imagen
                ? '<img src="' + esc(String(p.imagen).replace(/^\//, "")) + '" alt="' + esc(p.nombre) + '" loading="lazy">'
                : "";
              var sku = p.sku ? '<p class="sku">SKU: ' + esc(p.sku) + "</p>" : "";
              var destacado = p.destacado ? '<span class="badge-destacado">Destacado</span>' : "";
              var msg = "Hola, quisiera cotizar: " + p.nombre + " (" + c.nombre + ").";
              return '<article class="glass product"><div class="thumb">' + img + '</div><div class="body">' +
                "<h4>" + esc(p.nombre) + destacado + "</h4>" + sku +
                '<p class="desc">' + esc(p.descripcion) + "</p>" +
                '<div class="price">' + precio(p.precio) + (p.unidad ? " <small>/ " + esc(etiquetaUnidad(p.unidad)) + "</small>" : "") + "</div>" +
                '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="' + window.LAFRANJA.waLink(msg) + '">Consultar por WhatsApp</a>' +
                "</div></article>";
            }).join("");
            bloqueSubs += '<div class="sub-block"><h3>' + esc(sub.nombre) + '</h3><div class="grid grid-products">' + tarjetas + "</div></div>";
          });
          if (bloqueSubs) html += '<div class="cat-block" id="' + s + '"><h2>' + esc(c.nombre) + "</h2>" + bloqueSubs + "</div>";
        });
        contenedor.innerHTML = html || '<p class="empty">' + esc(txt("paginas.productos.vacio", "No se encontraron productos.")) + "</p>";
      }

      dibujarFiltros();
      dibujar();
      filtros.addEventListener("click", function (e) {
        var b = e.target.closest(".chip");
        if (!b) return;
        activa = b.getAttribute("data-cat");
        Array.prototype.forEach.call(filtros.querySelectorAll(".chip"), function (chip) {
          chip.classList.toggle("active", chip === b);
        });
        setCatParam(activa);
        dibujar();
      });
      if (buscador) buscador.addEventListener("input", function () {
        texto = buscador.value.trim().toLowerCase();
        dibujar();
      });
    });
  }

  /* ---------- Servicios ---------- */
  function iniciarServicios(contenedor) {
    Promise.all([cargar("data/servicios.json", "servicios"), window.LAFRANJA.ready]).then(function (res) {
      var data = res[0];
      if (!data) { contenedor.innerHTML = avisoError("data/servicios.json"); return; }
      var lista = (data && data.servicios) || [];
      var textoBoton = txt("paginas.servicios.verTrabajos", "Ver trabajos realizados");
      contenedor.innerHTML = lista.map(function (s) {
        var img = s.imagen
          ? '<div class="card-image"><img src="' + esc(window.LAFRANJA.asset(s.imagen)) + '" alt="' + esc(s.titulo) + '" loading="lazy"></div>'
          : "";
        var srv = String(s.slug || slug(s.titulo));
        var btn = s.verTrabajos
          ? '<a class="btn btn-ghost btn-sm" href="trabajos.html?servicio=' + encodeURIComponent(srv) + '">' + esc(textoBoton) + "</a>"
          : "";
        return '<article class="glass card service-card">' + img + "<h3>" + esc(s.titulo) + "</h3><p>" +
          esc(s.descripcion).replace(/\r?\n/g, "<br>") + "</p>" + btn + "</article>";
      }).join("") || '<p class="empty">' + esc(txt("paginas.servicios.vacio", "Pronto publicaremos nuestros servicios.")) + "</p>";
    });
  }

  /* Lee la imagen configurada para cada categoría en data/categorias/*.json */
  function imagenCategoria(s) {
    return fetch(BASE + "data/categorias/" + s + ".json?v=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; });
  }

  /* ---------- Categorías en Inicio ---------- */
  function iniciarCategorias(contenedor) {
    Promise.all([cargar("data/catalogo.json", "catalogo"), window.LAFRANJA.ready]).then(function (res) {
      var data = res[0];
      if (!data) { contenedor.innerHTML = avisoError("data/catalogo.json"); return; }
      var cats = normalizar(data).categorias || [];
      Promise.all(cats.map(function (c) { return imagenCategoria(slug(c.nombre)); })).then(function (detalles) {
        contenedor.innerHTML = cats.map(function (c, i) {
          var s = slug(c.nombre);
          var img = detalles[i] && detalles[i].imagen
            ? '<div class="card-image"><img src="' + esc(window.LAFRANJA.asset(detalles[i].imagen)) + '" alt="' + esc(c.nombre) + '" loading="lazy"></div>'
            : "";
          return '<a class="glass card cat-card" href="productos.html?cat=' + s + '">' + img +
            "<h3>" + esc(c.nombre) + "</h3><p>" + esc(txt("paginas.inicio.verCategoria", "Ver productos →")) + "</p></a>";
        }).join("");
      });
    });
  }

  /* ---------- Trabajos realizados ---------- */
  function iniciarTrabajos(contenedor) {
    Promise.all([cargar("data/trabajos.json", "trabajos"), window.LAFRANJA.ready]).then(function (res) {
      var data = res[0];
      if (!data) { contenedor.innerHTML = avisoError("data/trabajos.json"); return; }
      var servicio = new URLSearchParams(location.search).get("servicio") || "";
      var nombres = {
        vidrieria: "Vidriería", herreria: "Herrería", laminas: "Láminas y perfiles",
        moldura: "Moldura", ferreteria: "Ferretería general", cotizaciones: "Cotizaciones"
      };
      var tituloServicio = document.getElementById("trabajos-servicio");
      if (tituloServicio && nombres[servicio]) tituloServicio.textContent = nombres[servicio];
      var lista = ((data && data.trabajos) || []).filter(function (t) {
        return !servicio || t.servicio === servicio;
      });
      contenedor.innerHTML = lista.map(function (t) {
        var img = t.imagen
          ? '<div class="work-photo"><img src="' + esc(window.LAFRANJA.asset(t.imagen)) + '" alt="' + esc(t.titulo) + '" loading="lazy"></div>'
          : "";
        return '<article class="glass card work-card">' + img + '<div class="work-body"><h3>' + esc(t.titulo) +
          "</h3><p>" + esc(t.descripcion).replace(/\r?\n/g, "<br>") + "</p></div></article>";
      }).join("") || '<p class="empty">' + esc(txt("paginas.trabajos.vacio", "Aún no hay trabajos publicados.")) + "</p>";
    });
  }

  var elP = document.getElementById("catalogo");
  var elS = document.getElementById("servicios-lista");
  var elC = document.getElementById("categorias-home");
  var elT = document.getElementById("trabajos-lista");
  if (elP) iniciarProductos(elP);
  if (elS) iniciarServicios(elS);
  if (elC) iniciarCategorias(elC);
  if (elT) iniciarTrabajos(elT);
})();
