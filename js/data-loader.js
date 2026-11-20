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

  var FALLBACK = {
    catalogo: {"categorias":[{"nombre":"FERRETERÍA GENERAL","subcategorias":[{"nombre":"Herramientas manuales","productos":[{"nombre":"Martillo de uña 16 oz","descripcion":"Mango antideslizante, ideal para carpintería y construcción.","precio":65,"unidad":"unidad","imagen":""},{"nombre":"Alicate universal 8\"","descripcion":"Acero forjado con mangos aislados.","precio":55,"unidad":"unidad","imagen":""}]},{"nombre":"Clavos y tornillos","productos":[{"nombre":"Clavo de acero 3\"","descripcion":"Clavo común para construcción.","precio":8,"unidad":"libra","imagen":""},{"nombre":"Tornillo para madera 2\"","descripcion":"Cabeza plana, paquete surtido.","precio":20,"unidad":"caja","imagen":""}]}]},{"nombre":"VIDRIERÍA","subcategorias":[{"nombre":"Vidrio plano","productos":[{"nombre":"Vidrio claro 3 mm","descripcion":"Corte a la medida para ventanas y puertas.","precio":90,"unidad":"m²","imagen":""},{"nombre":"Vidrio claro 6 mm","descripcion":"Mayor resistencia para mesas y divisiones.","precio":150,"unidad":"m²","imagen":""}]},{"nombre":"Espejos","productos":[{"nombre":"Espejo 4 mm","descripcion":"Espejo a la medida con bordes pulidos.","precio":180,"unidad":"m²","imagen":""}]}]},{"nombre":"HERRERÍA","subcategorias":[{"nombre":"Puertas y portones","productos":[{"nombre":"Portón metálico","descripcion":"Fabricado a la medida, con pintura anticorrosiva.","precio":1200,"unidad":"unidad","imagen":""}]},{"nombre":"Ventanas y balcones","productos":[{"nombre":"Balcón de hierro","descripcion":"Diseño según tu espacio.","precio":350,"unidad":"m²","imagen":""}]}]},{"nombre":"LÁMINAS Y PERFILES","subcategorias":[{"nombre":"Láminas","productos":[{"nombre":"Lámina galvanizada calibre 28","descripcion":"Para techos, 10 pies.","precio":95,"unidad":"unidad","imagen":""},{"nombre":"Lámina troquelada","descripcion":"Acabado resistente a la intemperie.","precio":110,"unidad":"unidad","imagen":""}]},{"nombre":"Perfiles","productos":[{"nombre":"Perfil tubular cuadrado 1\"","descripcion":"Tubo estructural de 6 metros.","precio":140,"unidad":"unidad","imagen":""},{"nombre":"Ángulo de hierro 1\"","descripcion":"Para estructuras y marcos.","precio":85,"unidad":"unidad","imagen":""}]}]},{"nombre":"MOLDURA","subcategorias":[{"nombre":"Molduras de madera","productos":[{"nombre":"Moldura de pared","descripcion":"Acabado liso, ideal para marcos y decoración.","precio":25,"unidad":"metro","imagen":""},{"nombre":"Moldura para cuadros","descripcion":"Varios estilos disponibles.","precio":18,"unidad":"metro","imagen":""}]}]}]},
    servicios: {"servicios":[{"titulo":"Corte de vidrio a la medida","descripcion":"Vidrio claro, espejos y divisiones cortados al tamaño que necesitas.","icono":"🪟"},{"titulo":"Trabajos de herrería","descripcion":"Puertas, portones, balcones y estructuras metálicas fabricadas a la medida.","icono":"⚒️"},{"titulo":"Venta de láminas y perfiles","descripcion":"Láminas para techo, tubos y ángulos para tus proyectos.","icono":"🏗️"},{"titulo":"Molduras y marcos","descripcion":"Molduras para decoración, marcos y acabados.","icono":"🖼️"},{"titulo":"Ferretería en general","descripcion":"Herramientas, clavos, tornillos y materiales de construcción.","icono":"🔧"},{"titulo":"Cotizaciones por WhatsApp","descripcion":"Escríbenos y te cotizamos rápido, sin salir de tu comunidad.","icono":"💬"}]}
  };

  var ICONOS = {
    "ferreteria-general": "🔧", "vidrieria": "🪟", "herreria": "⚒️",
    "laminas-y-perfiles": "🏗️", "moldura": "🖼️"
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
      var cats = (data && data.categorias) || [];
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
              return !texto || (p.nombre + " " + (p.descripcion || "") + " " + sub.nombre).toLowerCase().indexOf(texto) !== -1;
            });
            if (!prods.length) return;
            var tarjetas = prods.map(function (p) {
              var img = p.imagen
                ? '<img src="' + esc(String(p.imagen).replace(/^\//, "")) + '" alt="' + esc(p.nombre) + '" loading="lazy">'
                : (ICONOS[s] || "📦");
              var msg = "Hola, quisiera cotizar: " + p.nombre + " (" + c.nombre + ").";
              return '<article class="glass product"><div class="thumb">' + img + '</div><div class="body">' +
                "<h4>" + esc(p.nombre) + "</h4>" +
                '<p class="desc">' + esc(p.descripcion) + "</p>" +
                '<div class="price">' + precio(p.precio) + (p.unidad ? " <small>/ " + esc(p.unidad) + "</small>" : "") + "</div>" +
                '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="' + window.LAFRANJA.waLink(msg) + '">Consultar por WhatsApp</a>' +
                "</div></article>";
            }).join("");
            bloqueSubs += '<div class="sub-block"><h3>' + esc(sub.nombre) + '</h3><div class="grid grid-products">' + tarjetas + "</div></div>";
          });
          if (bloqueSubs) html += '<div class="cat-block" id="' + s + '"><h2>' + esc(c.nombre) + "</h2>" + bloqueSubs + "</div>";
        });
        contenedor.innerHTML = html || '<p class="empty">No se encontraron productos.</p>';
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
    cargar("data/servicios.json", "servicios").then(function (data) {
      if (!data) { contenedor.innerHTML = avisoError("data/servicios.json"); return; }
      var lista = (data && data.servicios) || [];
      contenedor.innerHTML = lista.map(function (s) {
        return '<article class="glass card"><div class="icon">' + esc(s.icono || "🔧") + "</div><h3>" +
          esc(s.titulo) + "</h3><p>" + esc(s.descripcion) + "</p></article>";
      }).join("") || '<p class="empty">Pronto publicaremos nuestros servicios.</p>';
    });
  }

  /* ---------- Categorías en Inicio ---------- */
  function iniciarCategorias(contenedor) {
    cargar("data/catalogo.json", "catalogo").then(function (data) {
      if (!data) { contenedor.innerHTML = avisoError("data/catalogo.json"); return; }
      var cats = (data && data.categorias) || [];
      contenedor.innerHTML = cats.map(function (c) {
        var s = slug(c.nombre);
        return '<a class="glass card cat-card" href="productos.html?cat=' + s + '"><div class="icon">' + (ICONOS[s] || "📦") +
          "</div><h3>" + esc(c.nombre) + "</h3><p>Ver productos →</p></a>";
      }).join("");
    });
  }

  var elP = document.getElementById("catalogo");
  var elS = document.getElementById("servicios-lista");
  var elC = document.getElementById("categorias-home");
  if (elP) iniciarProductos(elP);
  if (elS) iniciarServicios(elS);
  if (elC) iniciarCategorias(elC);
})();
