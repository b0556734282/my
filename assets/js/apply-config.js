/* ============================================================
   הזרקת ההגדרות מ-config.js אל תוך העמודים.
   ------------------------------------------------------------
   בכל עמוד באתר אפשר לסמן אלמנט באחת מהדרכים הבאות:

     data-cfg="phone"          → הטקסט של האלמנט יוחלף בטלפון
     data-cfg-href="phone"     → הקישור יופנה לטלפון (tel:) / מייל / וואטסאפ
     data-cfg-if="phone"       → האלמנט יוסתר לגמרי אם השדה ריק

   כך אפשר לערוך את כל פרטי העמותה במקום אחד בלבד.
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};

  /* קריאת שדה מקונן, למשל "bank.account" */
  var get = function (path) {
    return String(path).split(".").reduce(function (obj, key) {
      return (obj && obj[key] !== undefined && obj[key] !== null) ? obj[key] : "";
    }, cfg);
  };

  /* מספר טלפון → ספרות בלבד בפורמט בינלאומי, לקישורי wa.me ו-tel: */
  var intl = function (number) {
    var digits = String(number).replace(/\D/g, "");
    if (!digits) return "";
    if (digits.indexOf("972") === 0) return digits;
    return "972" + digits.replace(/^0/, "");
  };

  /* ---------- הסתרת מקטעים שאין להם מידע ---------- */
  document.querySelectorAll("[data-cfg-if]").forEach(function (el) {
    var value = get(el.getAttribute("data-cfg-if"));
    if (!value) el.remove();
  });

  /* ---------- מילוי טקסטים ---------- */
  document.querySelectorAll("[data-cfg]").forEach(function (el) {
    var value = get(el.getAttribute("data-cfg"));
    if (value) el.textContent = value;
  });

  /* ---------- בניית קישורים ---------- */
  document.querySelectorAll("[data-cfg-href]").forEach(function (el) {
    var key = el.getAttribute("data-cfg-href");
    var value = get(key);
    if (!value) return;

    if (key === "email") {
      el.setAttribute("href", "mailto:" + value);
    } else if (key === "whatsapp") {
      el.setAttribute("href", "https://wa.me/" + intl(value));
    } else if (key === "phone") {
      el.setAttribute("href", "tel:+" + intl(value));
    } else {
      el.setAttribute("href", value);
    }
  });

  /* ---------- שם העמותה בכותרת הדפדפן ובנתוני השיתוף ---------- */
  if (cfg.orgName) {
    document.title = document.title.replace("מרכז התורה והחסד", cfg.orgName);
  }

  /* ---------- נתונים מובנים לגוגל (JSON-LD) ---------- */
  var ld = {
    "@context": "https://schema.org",
    "@type": "NGO",
    "name": cfg.orgName || "מרכז התורה והחסד",
    "description": "הפצת תורה, חינוך וקירוב לבבות.",
    "areaServed": "IL"
  };
  if (cfg.siteUrl) ld.url = cfg.siteUrl;
  if (cfg.phone)   ld.telephone = "+" + intl(cfg.phone);
  if (cfg.email)   ld.email = cfg.email;
  if (cfg.address) ld.address = { "@type": "PostalAddress", "streetAddress": cfg.address, "addressCountry": "IL" };

  var script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);
})();
