/* ============================================================
   מרכז התורה והחסד — הסקריפט הראשי
   ------------------------------------------------------------
   תפריט נייד, מצב לילה, תאריך עברי, פס התקדמות גלילה,
   הדגשת המקטע הפעיל, אנימציות כניסה, ספירת מספרים,
   שאלות ותשובות, גלריה מוגדלת, שיתוף, וטופס יצירת קשר מוגן.
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var sec = window.SITE_SECURITY || {};
  var cleanText = sec.cleanText || function (v) { return String(v || "").trim(); };
  var cleanLine = sec.cleanLine || cleanText;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  var $  = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };

  /* ============================================================
     הודעות צפות (Toast)
     ============================================================ */
  var toastHost = null;

  var toast = function (message, kind) {
    if (!toastHost) {
      toastHost = document.createElement("div");
      toastHost.className = "toast-host";
      toastHost.setAttribute("role", "status");
      toastHost.setAttribute("aria-live", "polite");
      document.body.appendChild(toastHost);
    }
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = message;                       // textContent — בלי HTML
    toastHost.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { el.remove(); }, 350);
    }, 3600);
  };

  window.SITE_TOAST = toast;

  /* ============================================================
     שנה נוכחית בפוטר
     ============================================================ */
  $$("#year, [data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ============================================================
     מצב לילה
     ------------------------------------------------------------
     שלושה מצבים: לפי מערכת ההפעלה (ברירת מחדל), בהיר, כהה.
     הבחירה נשמרת רק בדפדפן של הגולש (localStorage), בלי שרת ובלי מעקב.
     ============================================================ */
  var THEME_KEY = "tvh-theme";

  var readTheme = function () {
    try {
      var saved = window.localStorage.getItem(THEME_KEY);
      return (saved === "dark" || saved === "light") ? saved : "";
    } catch (e) { return ""; }
  };

  var applyTheme = function (theme) {
    if (theme === "dark" || theme === "light") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
    var isDark = theme === "dark" ||
      (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    $$(".theme-toggle").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(isDark));
      btn.setAttribute("aria-label", isDark ? "מעבר לתצוגה בהירה" : "מעבר לתצוגה כהה");
      btn.setAttribute("title", isDark ? "תצוגה בהירה" : "תצוגה כהה");
    });
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? "#0b1622" : "#12325a");
  };

  applyTheme(readTheme());

  if (cfg.allowDarkMode !== false) {
    $$(".theme-toggle").forEach(function (btn) {
      btn.hidden = false;
      btn.addEventListener("click", function () {
        var isDark = root.getAttribute("data-theme") === "dark" ||
          (!root.hasAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
        var next = isDark ? "light" : "dark";
        applyTheme(next);
        try { window.localStorage.setItem(THEME_KEY, next); } catch (e) {}
      });
    });
  } else {
    $$(".theme-toggle").forEach(function (btn) { btn.remove(); });
  }

  /* ============================================================
     תאריך עברי בכותרת
     ------------------------------------------------------------
     מחושב בדפדפן עם לוח השנה העברי המובנה (Intl), בלי שום שירות חיצוני.
     אחרי השעה 19:00 מוצג "אור ל..." של היום הבא — קירוב נוח, לא זמן הלכתי מדויק.
     ============================================================ */
  var hebrewDateEl = $("#hebrewDate");

  if (hebrewDateEl && cfg.showHebrewDate !== false) {
    try {
      var now = new Date();
      var evening = now.getHours() >= 19;
      var target = new Date(now.getTime() + (evening ? 24 * 60 * 60 * 1000 : 0));

      var hebrew = new Intl.DateTimeFormat("he-u-ca-hebrew", {
        day: "numeric", month: "long", year: "numeric"
      }).format(target);

      var weekday = new Intl.DateTimeFormat("he-IL", { weekday: "long" }).format(target);

      hebrewDateEl.textContent = (evening ? "אור ל" + weekday + ", " : weekday + ", ") + hebrew;
      hebrewDateEl.hidden = false;
    } catch (e) {
      hebrewDateEl.remove();          // דפדפן ישן שלא תומך — פשוט לא מציגים
    }
  } else if (hebrewDateEl) {
    hebrewDateEl.remove();
  }

  /* ============================================================
     תפריט נייד — כולל מלכודת פוקוס ונעילת גלילה
     ============================================================ */
  var toggle = $("#navToggle");
  var nav = $("#mainNav");

  if (toggle && nav) {
    var setNav = function (open) {
      nav.classList.toggle("open", open);
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "סגירת תפריט" : "פתיחת תפריט");
      if (open) {
        var first = nav.querySelector("a");
        if (first) first.focus();
      }
    };

    toggle.addEventListener("click", function () {
      setNav(!nav.classList.contains("open"));
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });

    document.addEventListener("keydown", function (e) {
      if (!nav.classList.contains("open")) return;

      if (e.key === "Escape") {
        setNav(false);
        toggle.focus();
        return;
      }

      if (e.key === "Tab") {
        var items = $$("a, button", nav);
        if (!items.length) return;
        var firstItem = items[0];
        var lastItem = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstItem) {
          e.preventDefault(); lastItem.focus();
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault(); firstItem.focus();
        }
      }
    });

    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("open")) return;
      if (!nav.contains(e.target) && !toggle.contains(e.target)) setNav(false);
    });
  }

  /* ============================================================
     גלילה: צל לכותרת, פס התקדמות, כפתור צף, חזרה למעלה
     ============================================================ */
  var header   = $("#siteHeader");
  var floatBtn = $(".float-donate");
  var progress = $("#scrollProgress");
  var toTop    = $("#backToTop");
  var ticking  = false;

  var onScroll = function () {
    var y = window.scrollY || window.pageYOffset;
    var height = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = height > 0 ? Math.min(y / height, 1) : 0;

    if (header)   header.classList.toggle("scrolled", y > 10);
    if (floatBtn) floatBtn.classList.toggle("show", y > 600);
    if (toTop)    toTop.classList.toggle("show", y > 900);
    if (progress) progress.style.transform = "scaleX(" + ratio + ")";

    ticking = false;
  };

  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var skip = $(".skip-link");
      if (skip) skip.focus();
    });
  }

  /* ============================================================
     הדגשת המקטע הפעיל בתפריט
     ============================================================ */
  var navLinks = $$('.main-nav a[href^="#"]');

  if (navLinks.length && "IntersectionObserver" in window) {
    var sections = navLinks
      .map(function (link) { return document.getElementById(link.getAttribute("href").slice(1)); })
      .filter(Boolean);

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          var on = link.getAttribute("href") === "#" + entry.target.id;
          link.classList.toggle("current", on);
          if (on) { link.setAttribute("aria-current", "true"); }
          else { link.removeAttribute("aria-current"); }
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (section) { spy.observe(section); });
  }

  /* ============================================================
     אנימציית כניסה למקטעים
     ============================================================ */
  var revealEls = $$(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.transitionDelay = Math.min(i * 70, 280) + "ms";
        el.classList.add("visible");
        revealObserver.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ============================================================
     ספירת מספרים במקטע "במספרים"
     ============================================================ */
  var counters = $$(".stat-num[data-count]");

  var formatNumber = function (n) { return n.toLocaleString("he-IL"); };

  var runCounter = function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var suffix = el.getAttribute("data-suffix") || "+";

    if (reduceMotion) {
      el.textContent = formatNumber(target) + suffix;
      return;
    }

    var duration = 1400;
    var start = null;

    var step = function (timestamp) {
      if (start === null) start = timestamp;
      var progressRatio = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progressRatio, 3);
      el.textContent = formatNumber(Math.round(target * eased)) + (progressRatio === 1 ? suffix : "");
      if (progressRatio < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  if (counters.length) {
    if (!("IntersectionObserver" in window)) {
      counters.forEach(runCounter);
    } else {
      var countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          countObserver.unobserve(entry.target);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { countObserver.observe(el); });
    }
  }

  /* ============================================================
     פס התקדמות של קמפיין (מוצג רק אם הוגדר יעד ב-config.js)
     ============================================================ */
  var campaignBox = $("#campaign");

  if (campaignBox) {
    var camp = cfg.campaign || {};
    var goal = Number(camp.goal) || 0;

    if (goal > 0) {
      var raised = Math.max(0, Number(camp.raised) || 0);
      var percent = Math.max(0, Math.min(100, Math.round((raised / goal) * 100)));

      var titleEl = $("#campaignTitle", campaignBox);
      if (titleEl && camp.title) titleEl.textContent = camp.title;

      var bar = $("#campaignBar", campaignBox);
      var meter = $("#campaignMeter", campaignBox);
      if (meter) {
        meter.setAttribute("aria-valuenow", String(percent));
        meter.setAttribute("aria-valuetext", percent + "% מהיעד");
      }
      if (bar) {
        requestAnimationFrame(function () { bar.style.width = percent + "%"; });
      }

      var numbers = $("#campaignNumbers", campaignBox);
      if (numbers) {
        numbers.textContent = "₪" + raised.toLocaleString("he-IL") +
          " מתוך ₪" + goal.toLocaleString("he-IL") + " (" + percent + "%)";
      }

      var deadlineEl = $("#campaignDeadline", campaignBox);
      if (deadlineEl && camp.deadline) {
        var end = new Date(camp.deadline);
        if (!isNaN(end.getTime())) {
          var days = Math.ceil((end - new Date()) / (24 * 60 * 60 * 1000));
          if (days > 0) {
            deadlineEl.textContent = "נותרו " + days + " ימים לסיום הקמפיין";
            deadlineEl.hidden = false;
          }
        }
      }

      campaignBox.hidden = false;
    } else {
      campaignBox.remove();
    }
  }

  /* ============================================================
     שאלות ותשובות — פתיחה אחת בכל פעם
     ============================================================ */
  var faqItems = $$(".faq-item");

  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      faqItems.forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ============================================================
     גלריה — הגדלת תמונה (Lightbox) עם ניווט במקלדת
     ============================================================ */
  var figures = $$(".gallery figure");

  if (figures.length) {
    var lightbox = null;
    var lbImage = null;
    var lbCaption = null;
    var lbIndex = 0;
    var lastFocused = null;

    var buildLightbox = function () {
      lightbox = document.createElement("div");
      lightbox.className = "lightbox";
      lightbox.setAttribute("role", "dialog");
      lightbox.setAttribute("aria-modal", "true");
      lightbox.setAttribute("aria-label", "תצוגת תמונה מוגדלת");
      lightbox.hidden = true;

      var inner = document.createElement("div");
      inner.className = "lightbox-inner";

      lbImage = document.createElement("img");
      lbImage.alt = "";

      lbCaption = document.createElement("p");
      lbCaption.className = "lightbox-caption";

      var mkBtn = function (cls, label, text) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = cls;
        b.setAttribute("aria-label", label);
        b.textContent = text;
        return b;
      };

      var closeBtn = mkBtn("lightbox-close", "סגירה", "✕");
      var prevBtn  = mkBtn("lightbox-nav prev", "התמונה הקודמת", "‹");
      var nextBtn  = mkBtn("lightbox-nav next", "התמונה הבאה", "›");

      inner.appendChild(lbImage);
      inner.appendChild(lbCaption);
      lightbox.appendChild(closeBtn);
      lightbox.appendChild(prevBtn);
      lightbox.appendChild(nextBtn);
      lightbox.appendChild(inner);
      document.body.appendChild(lightbox);

      closeBtn.addEventListener("click", closeLightbox);
      prevBtn.addEventListener("click", function () { showImage(lbIndex - 1); });
      nextBtn.addEventListener("click", function () { showImage(lbIndex + 1); });
      lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox || e.target === inner) closeLightbox();
      });
    };

    var showImage = function (index) {
      lbIndex = (index + figures.length) % figures.length;
      var fig = figures[lbIndex];
      var img = fig.querySelector("img");
      var cap = fig.querySelector("figcaption");
      if (!img) return;
      lbImage.setAttribute("src", img.getAttribute("src"));
      lbImage.setAttribute("alt", img.getAttribute("alt") || "");
      lbCaption.textContent = cap ? cap.textContent : "";
    };

    var openLightbox = function (index) {
      if (!lightbox) buildLightbox();
      lastFocused = document.activeElement;
      showImage(index);
      lightbox.hidden = false;
      document.body.classList.add("nav-open");
      var closeBtn = lightbox.querySelector(".lightbox-close");
      if (closeBtn) closeBtn.focus();
    };

    var closeLightbox = function () {
      if (!lightbox) return;
      lightbox.hidden = true;
      document.body.classList.remove("nav-open");
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };

    figures.forEach(function (fig, index) {
      var img = fig.querySelector("img");
      if (!img) return;
      fig.classList.add("zoomable");
      fig.setAttribute("tabindex", "0");
      fig.setAttribute("role", "button");
      fig.setAttribute("aria-label", "הגדלת התמונה: " + (img.getAttribute("alt") || "תמונה"));
      fig.addEventListener("click", function () { openLightbox(index); });
      fig.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(index);
        }
      });
    });

    document.addEventListener("keydown", function (e) {
      if (!lightbox || lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      // RTL: החץ שמאלה מתקדם קדימה
      if (e.key === "ArrowLeft")  showImage(lbIndex + 1);
      if (e.key === "ArrowRight") showImage(lbIndex - 1);
    });
  }

  /* ============================================================
     שיתוף האתר
     ============================================================ */
  var shareText = "עמותת " + (cfg.orgName || "מרכז התורה והחסד") + " — שותפות בהפצת תורה";

  var pageUrl = function () {
    var configured = (sec.safeUrl ? sec.safeUrl(cfg.siteUrl) : "");
    var url = configured || window.location.href.split("#")[0].split("?")[0];
    // עמודי תודה ושגיאה לא מיועדים לשיתוף — משתפים את עמוד הבית במקומם
    return url.replace(/(thanks|404)\.html$/, "");
  };

  $$("[data-share]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var kind = btn.getAttribute("data-share");
      var url = pageUrl();

      if (kind === "whatsapp") {
        var wa = "https://wa.me/?text=" + encodeURIComponent(shareText + "\n" + url);
        if (sec.openExternal) { sec.openExternal(wa); } else { window.open(wa, "_blank", "noopener"); }
        return;
      }

      if (kind === "native" && navigator.share) {
        navigator.share({ title: shareText, url: url }).catch(function () {});
        return;
      }

      // העתקת הקישור
      var copy = function () {
        if (navigator.clipboard && window.isSecureContext) {
          return navigator.clipboard.writeText(url);
        }
        return Promise.reject();
      };

      copy().then(function () {
        toast("הקישור הועתק ✓", "ok");
      }).catch(function () {
        window.prompt("העתיקו את הקישור:", url);
      });
    });
  });

  /* ============================================================
     העתקה בלחיצה (פרטי בנק, טלפון וכדומה)
     ============================================================ */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-copy");
      if (value === "self") {
        var holder = btn.closest("[data-copy-source]");
        var source = holder ? holder.querySelector(holder.getAttribute("data-copy-source")) : null;
        value = source ? source.textContent.trim() : "";
      }
      if (!value) return;

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(function () {
          toast("הועתק: " + value, "ok");
        }).catch(function () {
          window.prompt("העתיקו:", value);
        });
      } else {
        window.prompt("העתיקו:", value);
      }
    });
  });

  /* ============================================================
     טופס יצירת קשר
     ------------------------------------------------------------
     הגנות מפני ספאם ושימוש לרעה, בלי שרת ובלי CAPTCHA שמעצבן גולשים:
       • שדה מלכודת (honeypot) שרובוטים ממלאים ובני אדם לא רואים.
       • מדידת זמן — טופס שנשלח בפחות משלוש שניות הוא כמעט תמיד רובוט.
       • הגבלת קצב — עד 3 שליחות ב-10 דקות מאותו דפדפן.
       • ניקוי כל שדה: תווי בקרה נמחקים, אורך מוגבל, ובשדות של שורה
         אחת גם שורות חדשות נמחקות — כדי שלא יוזרקו כותרות למייל.
     ============================================================ */
  var form = $("#contactForm");

  if (form) {
    var status = $("#formStatus");
    var loadedAt = Date.now();
    var MIN_SECONDS = 3;
    var RATE_KEY = "tvh-form-sends";
    var RATE_LIMIT = 3;
    var RATE_WINDOW = 10 * 60 * 1000;

    var LIMITS = { name: 80, phone: 25, email: 120, message: 2000 };

    var showError = function (input, message) {
      var field = input.closest(".field");
      if (!field) return;
      field.classList.add("invalid");
      input.setAttribute("aria-invalid", "true");
      var err = field.querySelector(".error");
      if (!err) {
        err = document.createElement("span");
        err.className = "error";
        field.appendChild(err);
      }
      err.textContent = message;
    };

    var clearError = function (input) {
      var field = input.closest(".field");
      if (!field) return;
      field.classList.remove("invalid");
      input.removeAttribute("aria-invalid");
      var err = field.querySelector(".error");
      if (err) err.remove();
    };

    var setStatus = function (kind, text) {
      if (!status) return;
      status.className = "form-status" + (kind ? " " + kind : "");
      status.textContent = text;
    };

    var recentSends = function () {
      try {
        var raw = JSON.parse(window.localStorage.getItem(RATE_KEY) || "[]");
        if (!Array.isArray(raw)) return [];
        var cutoff = Date.now() - RATE_WINDOW;
        return raw.filter(function (t) { return typeof t === "number" && t > cutoff; });
      } catch (e) { return []; }
    };

    var recordSend = function () {
      try {
        var list = recentSends();
        list.push(Date.now());
        window.localStorage.setItem(RATE_KEY, JSON.stringify(list));
      } catch (e) {}
    };

    form.addEventListener("input", function (e) {
      if (e.target.matches("input, textarea")) clearError(e.target);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      /* --- מלכודת רובוטים --- */
      var trap = form.elements.website;
      if (trap && trap.value) {
        setStatus("ok", "תודה! הפנייה התקבלה.");   // לא מסגירים לרובוט שנתפס
        form.reset();
        return;
      }

      /* --- טופס שנשלח מהר מדי --- */
      if ((Date.now() - loadedAt) < MIN_SECONDS * 1000) {
        setStatus("err", "רק רגע — נא לוודא שכל הפרטים נכונים ולנסות שוב.");
        loadedAt = Date.now() - (MIN_SECONDS * 1000) + 1200;
        return;
      }

      /* --- הגבלת קצב --- */
      if (recentSends().length >= RATE_LIMIT) {
        setStatus("err", "נשלחו כבר כמה פניות מהמכשיר הזה. נשמח שתנסו שוב בעוד כמה דקות, או שתתקשרו אלינו.");
        return;
      }

      var name    = form.elements.name;
      var phone   = form.elements.phone;
      var email   = form.elements.email;
      var message = form.elements.message;
      var ok = true;

      var nameValue    = cleanLine(name.value, LIMITS.name);
      var phoneValue   = cleanLine(phone.value, LIMITS.phone);
      var emailValue   = cleanLine(email.value, LIMITS.email);
      var messageValue = cleanText(message.value, LIMITS.message);

      if (nameValue.length < 2) { showError(name, "נא למלא שם מלא"); ok = false; }

      if (phoneValue.replace(/\D/g, "").length < 9) {
        showError(phone, "נא למלא מספר טלפון תקין");
        ok = false;
      }

      if (emailValue && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(emailValue)) {
        showError(email, "כתובת האימייל אינה תקינה");
        ok = false;
      }

      if (messageValue.length < 5) { showError(message, "נא לכתוב את תוכן הפנייה"); ok = false; }

      if (!ok) {
        setStatus("err", "יש להשלים את השדות המסומנים.");
        var firstBad = form.querySelector(".invalid input, .invalid textarea");
        if (firstBad) firstBad.focus();
        return;
      }

      var body = [
        "שם: " + nameValue,
        "טלפון: " + phoneValue,
        "אימייל: " + (emailValue || "לא צוין"),
        "",
        messageValue
      ].join("\n");

      var subject = "פנייה מהאתר — " + nameValue;

      /* --- 1. שליחה ישירה לשרת טפסים (Formspree וכדומה) --- */
      var endpoint = sec.safeUrl ? sec.safeUrl(cfg.formEndpoint) : cfg.formEndpoint;

      if (endpoint && /^https:/.test(endpoint)) {
        var button = form.querySelector('button[type="submit"]');
        if (button) { button.disabled = true; button.textContent = "שולח..."; }
        setStatus("", "שולח את הפנייה...");

        var payload = new FormData();
        payload.append("name", nameValue);
        payload.append("phone", phoneValue);
        payload.append("email", emailValue);
        payload.append("message", messageValue);
        payload.append("_subject", subject);

        fetch(endpoint, {
          method: "POST",
          headers: { "Accept": "application/json" },
          body: payload,
          referrerPolicy: "no-referrer",
          credentials: "omit",
          mode: "cors"
        }).then(function (res) {
          if (!res.ok) throw new Error("send failed");
          form.reset();
          recordSend();
          setStatus("ok", "תודה! הפנייה התקבלה, ונחזור אליכם בהקדם.");
          toast("הפנייה נשלחה בהצלחה ✓", "ok");
        }).catch(function () {
          setStatus("err", "השליחה נכשלה. אפשר לנסות שוב, או ליצור קשר בטלפון.");
        }).finally(function () {
          if (button) { button.disabled = false; button.textContent = "שליחה"; }
        });
        return;
      }

      /* --- 2. שליחה בוואטסאפ (אם הוגדר מספר) --- */
      if (cfg.whatsapp && sec.intlPhone) {
        var wa = "https://wa.me/" + sec.intlPhone(cfg.whatsapp) + "?text=" + encodeURIComponent(body);
        if (sec.openExternal) { sec.openExternal(wa); } else { window.open(wa, "_blank", "noopener"); }
        recordSend();
        setStatus("ok", "תודה! נפתח וואטסאפ לשליחת הפנייה.");
        return;
      }

      /* --- 3. גיבוי: פתיחת תוכנת המייל של הגולש --- */
      if (cfg.email) {
        recordSend();
        window.location.href = "mailto:" + encodeURIComponent(cfg.email).replace(/%40/g, "@") +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(body);
        setStatus("ok", "תודה! נפתחה אצלך תוכנת המייל לשליחת הפנייה.");
        return;
      }

      setStatus("err", "טרם הוגדרו פרטי קשר לקבלת פניות.");
    });
  }
})();
