/* ============================================================
   שכבת האבטחה של האתר
   ------------------------------------------------------------
   האתר הוא אתר סטטי (HTML/CSS/JS בלבד) — אין שרת, אין בסיס נתונים
   ואין משתמשים מחוברים, ולכן אין כאן "פריצה לחשבון".
   מה שכן צריך להגן עליו:

     1. הטמעה באתר זר (Clickjacking) — שמישהו יטמיע את עמוד התרומה
        בתוך אתר שלו, ויגנוב קליקים או יציג פרטי תשלום מזויפים.
     2. הזרקת קוד (XSS) — שערך מהכתובת או מקובץ ההגדרות יהפוך לקוד רץ.
     3. הודעות postMessage מזויפות — שאתר זר "ידבר" עם דף התרומה
        ויגרום לו להציג "התרומה הצליחה" בלי שנתרם שקל.
     4. הרעלת קישורים — קישור מסוג javascript: או data: בתוך ההגדרות.
     5. דליפת מידע לצדדים שלישיים — גופנים, סקריפטים, מעקב.

   בנוסף, תג ה-CSP בראש כל עמוד חוסם טעינת כל משאב חיצוני שלא אושר
   במפורש. הקובץ הזה משלים את מה ש-CSP לא יכול לעשות בתוך מטא־תג.
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;

  /* מסמנים שהדפדפן מריץ JavaScript. ה-CSS מסתיר את אנימציות
     הכניסה רק כשהסימון הזה קיים, כך שגולש בלי JavaScript
     (או אם קובץ נחסם) עדיין רואה את כל תוכן האתר. */
  root.classList.add("js");

  /* תווי בקרה שמשמשים לעקיפת בדיקות, למשל "java\tscript:" */
  var CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

  /* ============================================================
     1. הגנה מפני הטמעה באתר זר (Clickjacking)
     ------------------------------------------------------------
     frame-ancestors לא נתמך במטא־תג, ולכן הבדיקה נעשית כאן:
     אם העמוד רץ בתוך מסגרת של מקור אחר — מנסים לשחרר אותו,
     ואם הדפדפן חוסם את זה, ה-CSS מסתיר את התוכן ומציג אזהרה.
     ============================================================ */
  var isFramed = false;
  try {
    isFramed = (window.top !== window.self);
  } catch (e) {
    isFramed = true;               // גישה ל-window.top נחסמה = בוודאות מסגרת זרה
  }

  if (isFramed) {
    var sameOrigin = false;
    try {
      sameOrigin = (window.top.location.origin === window.location.origin);
    } catch (e) {
      sameOrigin = false;
    }

    if (!sameOrigin) {
      root.setAttribute("data-framed", "true");   // ה-CSS מסתיר את התוכן
      try {
        window.top.location.replace(window.location.href);
      } catch (e) {
        /* הדפדפן חסם ניווט של החלון העליון — האזהרה נשארת מוצגת */
      }
    }
  }

  /* ============================================================
     2. הכרחת HTTPS
     ------------------------------------------------------------
     אם מישהו הגיע ב-http:// (למשל דרך קישור ישן), מעבירים ל-https,
     כדי שאף אחד באמצע הדרך לא יוכל לשנות את פרטי חשבון הבנק שמוצגים.
     בפיתוח מקומי (localhost / file://) לא נוגעים בכלום.
     ============================================================ */
  var host = window.location.hostname;
  var isLocal = (host === "localhost" || host === "127.0.0.1" || host === "" ||
                 host === "[::1]" || /\.local$/.test(host));

  if (window.location.protocol === "http:" && !isLocal) {
    window.location.replace("https:" + window.location.href.substring(5));
  }

  /* ============================================================
     3. הקפאת ההגדרות
     ------------------------------------------------------------
     אחרי הטעינה אף סקריפט (כולל תוסף דפדפן זדוני) לא יכול לשנות
     את מספר המוסד בנדרים פלוס או את פרטי חשבון הבנק המוצגים באתר.
     ============================================================ */
  var deepFreeze = function (obj) {
    if (!obj || typeof obj !== "object" || Object.isFrozen(obj)) return obj;
    Object.getOwnPropertyNames(obj).forEach(function (key) {
      deepFreeze(obj[key]);
    });
    return Object.freeze(obj);
  };
  deepFreeze(window.SITE_CONFIG);

  /* ============================================================
     4. כלי עזר משותפים לשאר הסקריפטים
     ============================================================ */

  /* --- כתובת בטוחה: רק סכימות מאושרות --- */
  var SAFE_SCHEMES = ["https:", "http:", "mailto:", "tel:"];

  var safeUrl = function (value) {
    var raw = String(value == null ? "" : value).trim().replace(CONTROL_CHARS, "");
    if (!raw) return "";
    var parsed;
    try {
      parsed = new URL(raw, window.location.href);
    } catch (e) {
      return "";
    }
    return SAFE_SCHEMES.indexOf(parsed.protocol) === -1 ? "" : parsed.href;
  };

  /* --- ניקוי טקסט חופשי שמגיע מהגולש --- */
  var cleanText = function (value, maxLength) {
    var text = String(value == null ? "" : value).replace(/\r\n?/g, "\n");
    text = text.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "");
    if (maxLength && text.length > maxLength) text = text.slice(0, maxLength);
    return text.trim();
  };

  /* --- שורה בודדת: בלי שורות חדשות (מונע הזרקת כותרות למייל) --- */
  var cleanLine = function (value, maxLength) {
    return cleanText(value, maxLength).replace(/\n+/g, " ");
  };

  /* --- מספר שלם בטוח בתוך תחום --- */
  var safeInt = function (value, min, max, fallback) {
    var digits = String(value == null ? "" : value).replace(/[^\d]/g, "");
    var num = parseInt(digits, 10);
    if (!isFinite(num)) return fallback;
    if (num < min) return min;
    if (num > max) return max;
    return num;
  };

  /* --- מספר טלפון ישראלי בפורמט בינלאומי, ספרות בלבד --- */
  var intlPhone = function (number) {
    var digits = String(number == null ? "" : number).replace(/\D/g, "");
    if (!digits) return "";
    if (digits.indexOf("972") === 0) return digits;
    return "972" + digits.replace(/^0+/, "");
  };

  /* --- פתיחת חלון חיצוני בלי לחשוף את האתר (opener) --- */
  var openExternal = function (url) {
    var safe = safeUrl(url);
    if (!safe) return null;
    var win = window.open(safe, "_blank", "noopener,noreferrer");
    if (win) { try { win.opener = null; } catch (e) {} }
    return win;
  };

  window.SITE_SECURITY = Object.freeze({
    safeUrl:      safeUrl,
    cleanText:    cleanText,
    cleanLine:    cleanLine,
    safeInt:      safeInt,
    intlPhone:    intlPhone,
    openExternal: openExternal,
    isFramed:     isFramed
  });

  /* ============================================================
     5. חיזוק כל הקישורים היוצאים
     ------------------------------------------------------------
     כל קישור שנפתח בלשונית חדשה מקבל rel="noopener noreferrer",
     כך שהאתר שנפתח לא יכול לנווט את הלשונית שלנו לאתר מתחזה
     ולא מקבל את הכתובת שממנה הגיע התורם.
     בנוסף, קישור עם סכימה אסורה מנוטרל לגמרי.
     ============================================================ */
  var hardenLinks = function (scope) {
    (scope || document).querySelectorAll("a[href]").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#") return;      // עוגן פנימי

      // קישור יחסי לקובץ באתר עצמו (index.html, assets/...) — לא נוגעים.
      // "//example.com" נחשב חיצוני למרות שאין בו סכימה מפורשת.
      var hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(href);
      if (!hasScheme && href.slice(0, 2) !== "//") return;

      var checked = safeUrl(href);
      if (!checked) {
        link.setAttribute("href", "#");                 // javascript: / data: וכדומה
        link.setAttribute("aria-disabled", "true");
        return;
      }

      var parsed = new URL(checked);
      if (!/^https?:$/.test(parsed.protocol)) return;   // tel: / mailto: — תקינים
      if (parsed.origin === window.location.origin) return;

      link.setAttribute("rel", "noopener noreferrer");
      if (!link.hasAttribute("target")) link.setAttribute("target", "_blank");
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { hardenLinks(); });
  } else {
    hardenLinks();
  }

  window.SITE_SECURITY_HARDEN_LINKS = hardenLinks;
})();
