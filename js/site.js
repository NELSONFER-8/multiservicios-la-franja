/* site.js - Configuración editable desde el panel de administración (data/site.json).
   Expone window.LAFRANJA con los datos y utilidades usadas por main.js y data-loader.js. */
(function () {
  var DEFAULTS = {
    nombre: "MULTISERVICIOS LA FRANJA",
    nombreCorto: "LA FRANJA",
    subtitulo: "MULTISERVICIOS",
    descripcion: "Ferretería, vidriería, herrería, láminas, perfiles y molduras en Raxruhá, Alta Verapaz.",
    whatsapp: "50240507209",
    contacto: {
      direccion: "Aldea San Antonio Las Cuevas, Raxruhá, Alta Verapaz, Guatemala",
      mapaUrl: "https://www.google.com/maps/search/?api=1&query=Aldea+San+Antonio+Las+Cuevas+Raxruh%C3%A1+Alta+Verapaz",
      telefonos: ["4050-7209", "4011-3693", "3722-2616"],
      email: "",
      horario: ""
    },
    inicio: {
      heroTitulo: "Todo para tu obra en un solo lugar:",
      heroDestacado: "MULTISERVICIOS LA FRANJA",
      heroLead: "Ferretería, vidriería, herrería, láminas, perfiles y molduras. Calidad y atención cercana para Raxruhá y municipios vecinos.",
      ctaTitulo: "¿Necesitas una cotización?",
      ctaTexto: "Escríbenos por WhatsApp y te respondemos lo antes posible.",
      ctaBoton: "Escribir por WhatsApp"
    },
    servicios: {
      ctaTitulo: "¿Tienes un proyecto en mente?",
      ctaTexto: "Cuéntanos qué necesitas y te ayudamos.",
      ctaBoton: "Solicitar cotización"
    },
    nosotros: {
      texto: "Somos una ferretería, vidriería y herrería ubicada en Aldea San Antonio Las Cuevas, Raxruhá, Alta Verapaz. Atendemos a clientes locales y de municipios vecinos con materiales, láminas, perfiles, molduras y trabajos a la medida.",
      compromiso: "Ofrecer buenos materiales, precios justos y atención cercana, para que tu proyecto salga bien desde el primer día."
    },
    pie: {
      descripcion: "Ferretería, vidriería, herrería, láminas, perfiles y molduras."
    }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var settings = clone(DEFAULTS);

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function digits(v) { return String(v == null ? "" : v).replace(/[^0-9]/g, ""); }

  function deepMerge(target, source) {
    Object.keys(source || {}).forEach(function (k) {
      var v = source[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        if (!target[k] || typeof target[k] !== "object" || Array.isArray(target[k])) target[k] = {};
        deepMerge(target[k], v);
      } else {
        target[k] = v;
      }
    });
    return target;
  }

  function waNumero() {
    var n = digits(settings.whatsapp);
    if (!n) return "50240507209";
    if (n.length <= 8) return "502" + n.replace(/^0+/, "");
    if (n.length === 11 && n.charAt(0) === "0") return "502" + n.substring(1);
    return n;
  }

  function waTexto() {
    return waNumero().replace(/^502/, "").replace(/([0-9]{4})([0-9]{4}).*/, "$1-$2");
  }

  /* La promesa siempre resuelve: si falla la carga se registran los valores por defecto. */
  var ready = fetch("data/site.json").then(function (r) {
    if (!r.ok) throw new Error("HTTP " + r.status + " al cargar data/site.json");
    return r.json();
  }).then(function (d) {
    deepMerge(settings, d || {});
    return settings;
  }).catch(function (err) {
    console.error("[LA FRANJA] No se pudo cargar data/site.json. Se usan los valores por defecto.", err);
    return settings;
  });

  window.LAFRANJA = {
    settings: settings,
    ready: ready,
    esc: esc,
    waNumero: waNumero,
    waTexto: waTexto,
    waLink: function (texto) {
      return "https://wa.me/" + waNumero() + "?text=" + encodeURIComponent(texto || ("Hola, quisiera información de " + settings.nombre));
    },
    telHref: function (t) {
      var n = digits(t);
      if (n.length <= 8) n = "502" + n.replace(/^0+/, "");
      else if (n.length === 11 && n.charAt(0) === "0") n = "502" + n.substring(1);
      return "tel:+" + n;
    }
  };
})();
