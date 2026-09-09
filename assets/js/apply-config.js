/* ============================================================
   הזרקת ההגדרות מ-config.js אל תוך העמודים.
   ------------------------------------------------------------
   בכל עמוד באתר אפשר לסמן אלמנט באחת מהדרכים הבאות:

     data-cfg="phone"          → הטקסט של האלמנט יוחלף בטלפון
     data-cfg-href="phone"     → הקישור יופנה לטלפון (tel:) / מייל / וואטסאפ
     data-cfg-if="phone"       → האלמנט יוסתר לגמרי אם השדה ריק
     data-cfg-unless="bit"     → האלמנט יוסתר אם השדה כן מלא

   כך אפשר לערוך את כל פרטי העמותה במקום אחד בלבד.

   אבטחה: הערכים נכתבים תמיד עם textContent (אף פעם לא innerHTML),
   וכל כתובת עוברת דרך safeUrl כדי שערך כמו "javascript:..." בקובץ
   ההגדרות לא יוכל להפוך לקוד רץ.
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var sec = window.SITE_SECURITY || {};

  var safeUrl = sec.safeUrl || function (v) { return String(v || ""); };
  var intl    = sec.intlPhone || function (v) { return String(v || "").replace(/\D/g, ""); };

  /* קריאת שדה מקונן, למשל "bank.account" */
  var get = function (path) {
    return String(path).split(".").reduce(function (obj, key) {
      return (obj && obj[key] !== undefined && obj[key] !== null) ? obj[key] : "";
    }, cfg);
  };

  /* ---------- הסתרת מקטעים שאין להם מידע ---------- */
  document.querySelectorAll("[data-cfg-if]").forEach(function (el) {
    if (!get(el.getAttribute("data-cfg-if"))) el.remove();
  });

  /* ---------- הסתרת מקטעים שיש להם מידע (ההפך) ---------- */
  document.querySelectorAll("[data-cfg-unless]").forEach(function (el) {
    if (get(el.getAttribute("data-cfg-unless"))) el.remove();
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

    var href = "";
    if (key === "email") {
      href = "mailto:" + String(value).replace(/[^\w.@+-]/g, "");
    } else if (key === "whatsapp") {
      href = "https://wa.me/" + intl(value);
    } else if (key === "phone" || key === "officePhone") {
      href = "tel:+" + intl(value);
    } else {
      href = value;
    }

    var checked = safeUrl(href);
    if (checked) el.setAttribute("href", checked);
  });

  /* ---------- שם העמותה בכותרת הדפדפן ובנתוני השיתוף ---------- */
  var DEFAULT_NAME = "מרכז התורה והחסד";
  if (cfg.orgName && cfg.orgName !== DEFAULT_NAME) {
    document.title = document.title.split(DEFAULT_NAME).join(cfg.orgName);
    document.querySelectorAll('meta[property="og:title"], meta[name="description"], meta[property="og:description"]')
      .forEach(function (meta) {
        var content = meta.getAttribute("content") || "";
        if (content.indexOf(DEFAULT_NAME) !== -1) {
          meta.setAttribute("content", content.split(DEFAULT_NAME).join(cfg.orgName));
        }
      });
  }

  /* ---------- כתובת קנונית וכתובת שיתוף ---------- */
  var siteUrl = safeUrl(cfg.siteUrl);
  if (siteUrl) {
    var base = siteUrl.replace(/\/+$/, "") + "/";
    var page = window.location.pathname.split("/").pop() || "index.html";
    var full = base + (page === "index.html" ? "" : page);

    var canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", full);

    var ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute("content", full);
  }

  /* ---------- נתונים מובנים לגוגל (JSON-LD) ----------
     נכתב עם textContent בלבד, כך שגם ערך משונה בקובץ ההגדרות
     לא יכול "לשבור" את התג ולהפוך לסקריפט.
  ------------------------------------------------- */
  var ld = {
    "@context": "https://schema.org",
    "@type": "NGO",
    "name": cfg.orgName || DEFAULT_NAME,
    "description": "הפצת תורה, חינוך וקירוב לבבות.",
    "areaServed": "IL",
    "inLanguage": "he"
  };
  if (siteUrl)     ld.url = siteUrl;
  if (cfg.phone)   ld.telephone = "+" + intl(cfg.phone);
  if (cfg.email)   ld.email = cfg.email;
  if (cfg.amutaNumber) ld.identifier = "עמותה " + cfg.amutaNumber;
  if (cfg.address) ld.address = { "@type": "PostalAddress", "streetAddress": cfg.address, "addressCountry": "IL" };
  if (cfg.nedarim && cfg.nedarim.mosadId) {
    ld.potentialAction = {
      "@type": "DonateAction",
      "name": "תרומה לעמותה",
      "target": (siteUrl ? siteUrl.replace(/\/+$/, "") + "/donate.html" : "donate.html")
    };
  }

  var script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);
})();
