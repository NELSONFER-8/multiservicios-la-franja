/* main.js - Navegación, pie de página y botón de WhatsApp (se inyectan en todas las páginas) */
(function () {
  var WA = "50240507209";
  var PAGES = [
    ["index.html", "Inicio"],
    ["productos.html", "Productos"],
    ["servicios.html", "Servicios"],
    ["nosotros.html", "Nosotros"],
    ["contacto.html", "Contacto"]
  ];
  var current = location.pathname.split("/").pop() || "index.html";

  window.LAFRANJA = {
    wa: WA,
    waLink: function (texto) {
      return "https://wa.me/" + WA + "?text=" + encodeURIComponent(texto || "Hola, quisiera información de MULTISERVICIOS LA FRANJA.");
    }
  };

  var links = PAGES.map(function (p) {
    return '<li><a href="' + p[0] + '"' + (p[0] === current ? ' class="active"' : "") + ">" + p[1] + "</a></li>";
  }).join("");

  var header =
    '<header class="site-header"><div class="container"><nav class="nav glass">' +
    '<a class="brand" href="index.html"><div class="brand-logo">🛠️</div>' +
    "<span>LA FRANJA<small>MULTISERVICIOS</small></span></a>" +
    '<button class="menu-btn" id="menuBtn" aria-label="Abrir menú">☰</button>' +
    '<ul class="nav-links" id="navLinks">' + links + "</ul></nav></div></header>";

  var footer =
    '<footer class="site-footer"><div class="container"><div class="footer-grid">' +
    "<div><h4>MULTISERVICIOS LA FRANJA</h4><p>Ferretería, vidriería, herrería, láminas, perfiles y molduras.</p></div>" +
    "<div><h4>Ubicación</h4><p>Aldea San Antonio Las Cuevas, Raxruhá, Alta Verapaz, Guatemala</p></div>" +
    '<div><h4>Teléfonos</h4><a href="tel:+50240507209">4050-7209</a><a href="tel:+50240113693">4011-3693</a><a href="tel:+50237222616">3722-2616</a></div>' +
    "</div><p class=\"copy\">© " + new Date().getFullYear() + " MULTISERVICIOS LA FRANJA. Todos los derechos reservados.</p></div></footer>";

  var whatsapp =
    '<a class="wa-float" href="' + window.LAFRANJA.waLink() + '" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">' +
    '<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></a>';

  document.body.insertAdjacentHTML("afterbegin", header);
  document.body.insertAdjacentHTML("beforeend", footer + whatsapp);

  document.getElementById("menuBtn").addEventListener("click", function () {
    document.getElementById("navLinks").classList.toggle("open");
  });

  // Formulario de contacto -> WhatsApp
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nombre = form.nombre.value.trim();
      var msg = form.mensaje.value.trim();
      var texto = "Hola, soy " + nombre + ". " + msg;
      window.open(window.LAFRANJA.waLink(texto), "_blank");
    });
  }
})();
