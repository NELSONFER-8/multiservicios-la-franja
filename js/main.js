/* main.js - Navegación, pie de página, WhatsApp y textos personalizables.
   Los valores se toman de window.LAFRANJA (data/site.json) y se actualizan al cargar. */
(function () {
  var L = window.LAFRANJA;
  var PAGES = [
    ["index.html", "Inicio"],
    ["productos.html", "Productos"],
    ["servicios.html", "Servicios"],
    ["nosotros.html", "Nosotros"],
    ["contacto.html", "Contacto"]
  ];

  /* Funciona con URLs limpias de Netlify (/productos) y con /productos.html */
  function pageKey() {
    var name = location.pathname.split("/").pop() || "index.html";
    return name.replace(/\.html$/i, "").replace(/\/$/, "") || "index";
  }
  var current = pageKey();

  function get(path, fallback) {
    var parts = String(path).split(".");
    var v = L.settings;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return fallback;
      v = v[parts[i]];
    }
    return (v === undefined || v === null || v === "") ? fallback : v;
  }

  function esc(t) { return L.esc(t); }

  function label() {
    for (var i = 0; i < PAGES.length; i++) {
      if (PAGES[i][0].replace(/\.html$/i, "") === current) return PAGES[i][1];
    }
    return "Inicio";
  }

  function links() {
    return PAGES.map(function (p) {
      var active = p[0].replace(/\.html$/i, "") === current;
      return '<li><a href="' + p[0] + '"' + (active ? ' class="active" aria-current="page"' : "") + ">" + p[1] + "</a></li>";
    }).join("");
  }

  function telefonosHTML() {
    var tels = get("contacto.telefonos", []);
    if (!Array.isArray(tels)) tels = [tels];
    return tels.filter(Boolean).map(function (t) {
      return '<a href="' + esc(L.telHref(t)) + '">' + esc(t) + "</a>";
    }).join("");
  }

  function headerHTML() {
    return '<header class="site-header"><div class="container"><nav class="nav glass" aria-label="Navegación principal">' +
      '<a class="brand" href="index.html"><div class="brand-logo">🛠️</div>' +
      "<span>" + esc(get("nombreCorto", "LA FRANJA")) + "<small>" + esc(get("subtitulo", "MULTISERVICIOS")) + "</small></span></a>" +
      '<button class="menu-btn" id="menuBtn" aria-label="Abrir menú" aria-expanded="false" aria-controls="navLinks">☰</button>' +
      '<ul class="nav-links" id="navLinks">' + links() + "</ul></nav></div></header>";
  }

  function footerHTML() {
    var nombre = esc(get("nombre", "MULTISERVICIOS LA FRANJA"));
    return '<footer class="site-footer"><div class="container"><div class="footer-grid">' +
      "<div><h4>" + nombre + "</h4><p>" + esc(get("pie.descripcion", "")) + "</p></div>" +
      "<div><h4>Ubicación</h4><p>" + esc(get("contacto.direccion", "")) + "</p></div>" +
      "<div><h4>Teléfonos</h4>" + (telefonosHTML() || '<a href="' + esc(L.waLink()) + '">WhatsApp</a>') + "</div>" +
      "</div><p class=\"copy\">© " + new Date().getFullYear() + " " + nombre + ". Todos los derechos reservados.</p></div></footer>";
  }

  var SVG = '<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

  function waHTML() {
    return '<a class="wa-float" href="' + esc(L.waLink()) + '" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">' + SVG + "</a>";
  }

  function inject(selector, html, where) {
    var el = document.querySelector(selector);
    if (el) el.outerHTML = html;
    else document.body.insertAdjacentHTML(where, html);
  }

  function updatePage() {
    var main = document.querySelector("main");
    if (main && !main.id) main.id = "contenido";

    document.title = label() + " | " + get("nombre", "MULTISERVICIOS LA FRANJA");
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", get("descripcion", meta.getAttribute("content") || ""));

    var nodes = document.querySelectorAll("[data-lafanja]");
    Array.prototype.forEach.call(nodes, function (node) {
      var key = node.getAttribute("data-lafanja");
      var val = get(key, "");
      switch (key) {
        case "contacto.direccion":
          node.innerHTML = esc(val) + '<br><a target="_blank" rel="noopener" href="' + esc(get("contacto.mapaUrl", "#")) + '">Ver en Google Maps</a>';
          break;
        case "contacto.telefonos":
          node.innerHTML = telefonosHTML() || "<span>Contáctanos por WhatsApp</span>";
          break;
        case "contacto.whatsapp":
          node.innerHTML = '<a target="_blank" rel="noopener" href="' + esc(L.waLink()) + '">WhatsApp: ' + esc(L.waTexto()) + "</a>";
          break;
        case "contacto.email":
          if (!val) { node.setAttribute("hidden", ""); node.innerHTML = ""; }
          else { node.removeAttribute("hidden"); node.innerHTML = '<span class="ico">✉️</span><span><a href="mailto:' + esc(val) + '">' + esc(val) + "</a></span>"; }
          break;
        case "contacto.horario":
          if (!val) { node.setAttribute("hidden", ""); node.innerHTML = ""; }
          else { node.removeAttribute("hidden"); node.innerHTML = '<span class="ico">🕑</span><span>' + esc(val) + "</span>"; }
          break;
        default:
          if (node.tagName === "A" && node.hasAttribute("data-wa-text")) {
            node.href = L.waLink(node.getAttribute("data-wa-text"));
          }
          node.textContent = val;
      }
    });
  }

  function render() {
    inject(".skip-link", '<a class="skip-link" href="#contenido">Saltar al contenido</a>', "afterbegin");
    inject(".site-header", headerHTML(), "afterbegin");
    inject(".site-footer", footerHTML(), "beforeend");
    inject(".wa-float", waHTML(), "beforeend");
    updatePage();
  }

  /* Eventos delegados: sobreviven a la reinserción de header/footer al cargar los datos. */
  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    var btn = e.target.closest("#menuBtn");
    if (btn) {
      var nav = document.getElementById("navLinks");
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      return;
    }
    if (e.target.closest("#navLinks a")) {
      var nav2 = document.getElementById("navLinks");
      var btn2 = document.getElementById("menuBtn");
      if (nav2) nav2.classList.remove("open");
      if (btn2) btn2.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("submit", function (e) {
    if (!e.target || e.target.id !== "contactForm") return;
    e.preventDefault();
    var form = e.target;
    var nombre = form.nombre.value.trim();
    var msg = form.mensaje.value.trim();
    if (!nombre || !msg) return;

    var estado = form.querySelector(".form-estado");
    if (estado) estado.textContent = "Abriendo WhatsApp…";
    var url = L.waLink("Hola, soy " + nombre + ". " + msg);
    var a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  render();
  L.ready.then(render);
})();
