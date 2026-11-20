/* site.js - Configuración editable desde el panel de administración (data/site.json).
   Expone window.LAFRANJA con los datos y utilidades usadas por main.js y data-loader.js. */
(function () {
  var DEFAULTS = {
    logo: "",
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
    },
    /* Textos de las páginas: se cargan desde data/paginas.json (ver admin). */
    paginas: {},
    colores: {
      fondo1: "#0a1020",
      fondo2: "#0f1d38",
      fondo3: "#12284a",
      acento: "#fbbf24",
      acento2: "#f59e0b",
      secundario: "#22d3ee",
      secundario2: "#06b6d4",
      texto: "#e8eef9",
      textoSuave: "#9fb0cc",
      wa: "#25d366"
    }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var settings = clone(DEFAULTS);

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function resolve(obj, path) {
    var parts = String(path).split(".");
    var v = obj;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return "";
      v = v[parts[i]];
    }
    return v == null ? "" : v;
  }

  function digits(v) { return String(v == null ? "" : v).replace(/[^0-9]/g, ""); }

  /* El CMS guarda rutas como /img/uploads/logo.png; se normalizan para subcarpetas. */
  function asset(path) {
    return String(path == null ? "" : path).trim().replace(/^\/+/, "");
  }

  /* Solo se aceptan hexadecimales válidos: evita inyectar CSS desde el CMS. */
  function color(path) {
    var v = String(resolve(settings, path)).trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return v;
    return String(resolve(DEFAULTS, path) || "#000000");
  }

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

  /* Ruta basada en este script y sin caché, para que los cambios del CMS se vean siempre. */
  var script = document.currentScript || document.querySelector('script[src*="site.js"]');
  var SRC = script && script.getAttribute("src") ? script.getAttribute("src") : "js/site.js";
  /* Los JSON están al mismo nivel que la carpeta js/, no dentro de ella. */
  var BASE = SRC.replace(/^(.*\/)?js\/[^/]*$/, function (_, prefix) { return prefix || ""; });
  if (BASE === SRC) BASE = "";

  function loadData(file) {
    return fetch(BASE + "data/" + file + "?v=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " al cargar data/" + file);
      return r.json();
    });
  }

  /* La promesa siempre resuelve: si falla un archivo se conservan los textos del HTML. */
  var ready = loadData("site.json").then(function (d) {
    deepMerge(settings, d || {});
  }).catch(function (err) {
    console.error("[LA FRANJA] No se pudo cargar data/site.json. Se usan los valores por defecto.", err);
  }).then(function () {
    return loadData("paginas.json").then(function (d) {
      deepMerge(settings.paginas, d || {});
    }).catch(function (err) {
      console.error("[LA FRANJA] No se pudo cargar data/paginas.json. Se conservan los textos del HTML.", err);
    });
  }).then(function () {
    return settings;
  });

  window.LAFRANJA = {
    VERSION: "2.0",
    settings: settings,
    defaults: DEFAULTS,
    ready: ready,
    esc: esc,
    resolve: resolve,
    asset: asset,
    color: color,
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
