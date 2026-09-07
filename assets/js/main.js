/* ============================================================
   מרכז התורה והחסד — סקריפט ראשי
   תפריט נייד, אנימציות כניסה, ספירת מספרים וטופס יצירת קשר.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- שנה נוכחית בפוטר ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- תפריט נייד ---------- */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("mainNav");

  if (toggle && nav) {
    var setNav = function (open) {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "סגירת תפריט" : "פתיחת תפריט");
    };

    toggle.addEventListener("click", function () {
      setNav(!nav.classList.contains("open"));
    });

    // סגירה אחרי בחירה בקישור
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        setNav(false);
        toggle.focus();
      }
    });
  }

  /* ---------- צל לכותרת + כפתור תרומה צף ---------- */
  var header = document.getElementById("siteHeader");
  var floatBtn = document.querySelector(".float-donate");

  var onScroll = function () {
    var y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 10);
    if (floatBtn) floatBtn.classList.toggle("show", y > 600);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- אנימציית כניסה למקטעים ---------- */
  var revealEls = document.querySelectorAll(".reveal");

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

  /* ---------- ספירת מספרים במקטע "במספרים" ---------- */
  var counters = document.querySelectorAll(".stat-num[data-count]");

  var formatNumber = function (n) {
    return n.toLocaleString("he-IL");
  };

  var runCounter = function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;

    if (reduceMotion) {
      el.textContent = formatNumber(target) + "+";
      return;
    }

    var duration = 1400;
    var start = null;

    var step = function (timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // האטה בסוף
      el.textContent = formatNumber(Math.round(target * eased)) + (progress === 1 ? "+" : "");
      if (progress < 1) requestAnimationFrame(step);
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

  /* ---------- טופס יצירת קשר ----------
     ללא שרת: בדיקת תקינות בעברית ואז פתיחת תוכנת המייל של הגולש.
     אם מוסיפים action לטופס (למשל Formspree) — הקוד לא מתערב והשליחה רגילה.
  ------------------------------------- */
  var form = document.getElementById("contactForm");

  if (form) {
    var cfg = window.SITE_CONFIG || {};
    var status = document.getElementById("formStatus");

    var showError = function (input, message) {
      var field = input.closest(".field");
      field.classList.add("invalid");
      if (!field.querySelector(".error")) {
        var span = document.createElement("span");
        span.className = "error";
        span.textContent = message;
        field.appendChild(span);
      }
    };

    var clearError = function (input) {
      var field = input.closest(".field");
      field.classList.remove("invalid");
      var err = field.querySelector(".error");
      if (err) err.remove();
    };

    var setStatus = function (kind, text) {
      if (!status) return;
      status.className = "form-status" + (kind ? " " + kind : "");
      status.textContent = text;
    };

    form.addEventListener("input", function (e) {
      if (e.target.matches("input, textarea")) clearError(e.target);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = form.elements.name;
      var phone = form.elements.phone;
      var email = form.elements.email;
      var message = form.elements.message;
      var ok = true;

      if (!name.value.trim()) { showError(name, "נא למלא שם מלא"); ok = false; }

      // מספר טלפון ישראלי: לפחות 9 ספרות, מתעלם ממקפים ורווחים
      if (phone.value.replace(/\D/g, "").length < 9) {
        showError(phone, "נא למלא מספר טלפון תקין");
        ok = false;
      }

      if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        showError(email, "כתובת האימייל אינה תקינה");
        ok = false;
      }

      if (!message.value.trim()) { showError(message, "נא לכתוב את תוכן הפנייה"); ok = false; }

      if (!ok) {
        setStatus("err", "יש להשלים את השדות המסומנים.");
        form.querySelector(".invalid input, .invalid textarea").focus();
        return;
      }

      var lines = [
        "שם: " + name.value.trim(),
        "טלפון: " + phone.value.trim(),
        "אימייל: " + (email.value.trim() || "לא צוין"),
        "",
        message.value.trim()
      ];
      var body = lines.join("\n");
      var subject = "פנייה מהאתר — " + name.value.trim();

      /* --- 1. שליחה ישירה לשרת טפסים (Formspree וכדומה) --- */
      if (cfg.formEndpoint) {
        var button = form.querySelector('button[type="submit"]');
        if (button) { button.disabled = true; button.textContent = "שולח..."; }
        setStatus("", "שולח את הפנייה...");

        fetch(cfg.formEndpoint, {
          method: "POST",
          headers: { "Accept": "application/json" },
          body: new FormData(form)
        }).then(function (res) {
          if (!res.ok) throw new Error("send failed");
          form.reset();
          setStatus("ok", "תודה! הפנייה התקבלה, ונחזור אליכם בהקדם.");
        }).catch(function () {
          setStatus("err", "השליחה נכשלה. אפשר לנסות שוב, או ליצור קשר בטלפון.");
        }).finally(function () {
          if (button) { button.disabled = false; button.textContent = "שליחה"; }
        });
        return;
      }

      /* --- 2. שליחה בוואטסאפ (אם הוגדר מספר) --- */
      if (cfg.whatsapp) {
        var digits = String(cfg.whatsapp).replace(/\D/g, "");
        var intl = digits.indexOf("972") === 0 ? digits : "972" + digits.replace(/^0/, "");
        window.open("https://wa.me/" + intl + "?text=" + encodeURIComponent(body), "_blank", "noopener");
        setStatus("ok", "תודה! נפתח וואטסאפ לשליחת הפנייה.");
        return;
      }

      /* --- 3. גיבוי: פתיחת תוכנת המייל של הגולש --- */
      if (cfg.email) {
        window.location.href = "mailto:" + cfg.email +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(body);
        setStatus("ok", "תודה! נפתחה אצלך תוכנת המייל לשליחת הפנייה.");
        return;
      }

      setStatus("err", "טרם הוגדרו פרטי קשר לקבלת פניות.");
    });
  }
})();
