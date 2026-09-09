/* ============================================================
   דף התרומה — בחירת סכום וסליקה מאובטחת דרך נדרים פלוס.
   ------------------------------------------------------------
   אם לא הוגדרו פרטי נדרים פלוס בקובץ config.js, הדף מציג
   הודעה מנומסת ומפנה לדרכי התרומה האחרות — בלי שום שגיאה.

   אבטחה בדף הזה:
     • כל סכום שמגיע מהכתובת (?amount=) מוגבל לתחום שהוגדר ב-config,
       כך שאי אפשר לשלוח לתורם קישור עם סכום מטורף או שלילי.
     • הודעות postMessage מתקבלות אך ורק מהמקור של נדרים פלוס
       ואך ורק מהמסגרת שלנו — אתר זר לא יכול לזייף "התרומה בוצעה".
     • ההודעות נשלחות למקור מפורש ולא ל-"*", כדי שפרטי העסקה
       לא יגיעו לאתר אחר אם המסגרת תנווט למקום אחר.
     • מעבר לעמוד התודה מתאפשר רק אחרי שהתורם באמת פתח את הסליקה.
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var sec = window.SITE_SECURITY || {};
  var safeInt   = sec.safeInt   || function (v, min, max, fb) { var n = parseInt(v, 10); return isFinite(n) ? Math.min(Math.max(n, min), max) : fb; };
  var cleanLine = sec.cleanLine || function (v, n) { return String(v || "").slice(0, n || 100).trim(); };
  var toast     = window.SITE_TOAST || function () {};

  var nedarim = cfg.nedarim || {};
  var money   = cfg.donation || {};

  var MIN     = safeInt(money.min, 1, 1000, 5);
  var MAX     = safeInt(money.max, MIN, 1000000, 100000);
  var DEFAULT = safeInt(money.defaultAmount, MIN, MAX, 180);
  var HOUR    = safeInt(money.hourCost, 1, 100000, 52);

  /* המקורות היחידים שמותר להם לדבר עם הדף הזה */
  var NEDARIM_ORIGINS = ["https://matara.pro", "https://www.matara.pro"];
  var NEDARIM_IFRAME  = "https://matara.pro/nedarimplus/iframe/?language=he";
  var NEDARIM_HOSTED  = "https://www.matara.pro/nedarimplus/online/";
  var FRAME_ORIGIN    = "https://matara.pro";

  var ALLOWED_MONTHS = [12, 24, 36, 999];

  var state = {
    type: "once",
    amount: DEFAULT,
    months: 12,
    dedication: "",
    started: false          // האם התורם באמת פתח את מסך הסליקה
  };

  /* ---------- קליטת בחירה שהגיעה מעמוד הבית ----------
     donate.html?amount=180&type=monthly
     כל ערך עובר סינון והגבלה — קישור זדוני לא יכול לקבוע סכום חריג. */
  try {
    var params = new URLSearchParams(window.location.search);
    var rawAmount = params.get("amount");
    if (rawAmount) state.amount = safeInt(rawAmount, MIN, MAX, DEFAULT);
    if (params.get("type") === "monthly") state.type = "monthly";
    var rawMonths = params.get("months");
    if (rawMonths) {
      var m = safeInt(rawMonths, 1, 999, 12);
      if (ALLOWED_MONTHS.indexOf(m) !== -1) state.months = m;
    }
  } catch (e) { /* דפדפן ישן — נשארים בברירת המחדל */ }

  var $ = function (id) { return document.getElementById(id); };

  var summary     = $("donateSummary");
  var impactEl    = $("donateImpact");
  var customInput = $("customAmount");
  var monthsField = $("monthsField");
  var monthsSelect= $("months");
  var dedication  = $("dedication");
  var startBtn    = $("startDonation");
  var payWrap     = $("paymentWrap");
  var payFor      = $("payFor");
  var payStatus   = $("payStatus");
  var frame       = $("NedarimFrame");
  var backBtn     = $("backToAmount");
  var amountGrid  = $("amountGrid");

  var shekels = function (n) { return "₪" + Number(n).toLocaleString("he-IL"); };

  /* ============================================================
     בניית כפתורי הסכומים מתוך ההגדרות
     ============================================================ */
  var presetsFor = function (type) {
    var list = (type === "monthly" ? money.presetsMonthly : money.presets);
    if (!Array.isArray(list) || !list.length) list = [52, 180, 360, 1000];
    return list.map(function (n) { return safeInt(n, MIN, MAX, MIN); })
               .filter(function (n, i, arr) { return arr.indexOf(n) === i; });
  };

  var renderPresets = function () {
    if (!amountGrid) return;
    amountGrid.textContent = "";
    presetsFor(state.type).forEach(function (value) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "amount";
      btn.setAttribute("data-amount", String(value));
      btn.setAttribute("aria-pressed", String(value === state.amount));
      if (value === state.amount) btn.classList.add("active");
      btn.textContent = shekels(value);
      btn.addEventListener("click", function () { selectAmount(value, true); });
      amountGrid.appendChild(btn);
    });
  };

  var markPresets = function () {
    if (!amountGrid) return;
    var matched = false;
    Array.prototype.forEach.call(amountGrid.querySelectorAll(".amount"), function (btn) {
      var on = parseInt(btn.getAttribute("data-amount"), 10) === state.amount;
      if (on) matched = true;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    return matched;
  };

  /* ============================================================
     שורת הסיכום ושורת ה"מה זה נותן"
     ============================================================ */
  var renderSummary = function () {
    if (summary) {
      summary.className = "donate-summary";
      if (!state.amount || state.amount < MIN) {
        summary.textContent = "הסכום המינימלי לתרומה הוא " + shekels(MIN) + ".";
      } else if (state.type === "monthly") {
        var forHowLong = state.months === 999
          ? "מדי חודש, עד להודעה חדשה"
          : "מדי חודש, במשך " + state.months + " חודשים (סה\"כ " + shekels(state.amount * state.months) + ")";
        summary.textContent = shekels(state.amount) + " " + forHowLong + ".";
      } else {
        summary.textContent = "תרומה חד־פעמית בסך " + shekels(state.amount) + ".";
      }
    }

    if (impactEl) {
      var total = state.type === "monthly"
        ? state.amount * (state.months === 999 ? 12 : state.months)
        : state.amount;
      var hours = Math.floor(total / HOUR);

      if (state.amount >= MIN && hours >= 1) {
        impactEl.textContent = "התרומה הזו מממנת " + hours.toLocaleString("he-IL") +
          " שעות לימוד בכולל" + (state.type === "monthly" && state.months === 999 ? " בכל שנה" : "") + ".";
        impactEl.hidden = false;
      } else {
        impactEl.hidden = true;
      }
    }
  };

  var selectAmount = function (value, fromPreset) {
    state.amount = safeInt(value, MIN, MAX, DEFAULT);
    if (fromPreset && customInput) customInput.value = "";
    markPresets();
    renderSummary();
  };

  /* ============================================================
     מעבר בין חד־פעמי להוראת קבע
     ============================================================ */
  Array.prototype.forEach.call(document.querySelectorAll(".toggle[data-type]"), function (btn) {
    btn.addEventListener("click", function () {
      var type = btn.getAttribute("data-type");
      state.type = (type === "monthly") ? "monthly" : "once";

      Array.prototype.forEach.call(document.querySelectorAll(".toggle[data-type]"), function (b) {
        var on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", String(on));
      });

      if (monthsField) monthsField.hidden = (state.type !== "monthly");

      renderPresets();
      if (!markPresets() && customInput && !customInput.value) {
        // הסכום הנוכחי לא קיים ברשימה החדשה — בוחרים את ברירת המחדל שלה
        var presets = presetsFor(state.type);
        selectAmount(presets[Math.min(1, presets.length - 1)], true);
        return;
      }
      renderSummary();
    });
  });

  /* ---------- סכום חופשי ---------- */
  if (customInput) {
    customInput.setAttribute("min", String(MIN));
    customInput.setAttribute("max", String(MAX));

    customInput.addEventListener("input", function () {
      var raw = customInput.value.replace(/[^\d]/g, "");
      if (raw !== customInput.value) customInput.value = raw;   // ספרות בלבד
      if (!raw) { renderSummary(); return; }

      var value = safeInt(raw, MIN, MAX, DEFAULT);
      state.amount = value;

      if (amountGrid) {
        Array.prototype.forEach.call(amountGrid.querySelectorAll(".amount"), function (b) {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
      }
      renderSummary();
    });

    customInput.addEventListener("blur", function () {
      if (!customInput.value) return;
      var value = safeInt(customInput.value, MIN, MAX, DEFAULT);
      customInput.value = value;
      state.amount = value;
      renderSummary();
    });
  }

  if (monthsSelect) {
    monthsSelect.addEventListener("change", function () {
      var value = safeInt(monthsSelect.value, 1, 999, 12);
      state.months = (ALLOWED_MONTHS.indexOf(value) !== -1) ? value : 12;
      renderSummary();
    });
  }

  if (dedication) {
    dedication.setAttribute("maxlength", "100");
    dedication.addEventListener("input", function () {
      state.dedication = cleanLine(dedication.value, 100);
    });
  }

  /* ---------- סנכרון ראשוני ---------- */
  var syncFromState = function () {
    Array.prototype.forEach.call(document.querySelectorAll(".toggle[data-type]"), function (b) {
      var on = b.getAttribute("data-type") === state.type;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    if (monthsField) monthsField.hidden = (state.type !== "monthly");
    if (monthsSelect) monthsSelect.value = String(state.months);

    renderPresets();
    if (!markPresets() && customInput) customInput.value = state.amount;
  };

  syncFromState();
  renderSummary();

  /* ============================================================
     פתיחת מסך הסליקה
     ============================================================ */
  var openPayment = function () {
    if (!state.amount || state.amount < MIN) {
      if (customInput) customInput.focus();
      renderSummary();
      return;
    }

    /* אין מספר מוסד — מפנים לדרכי התרומה האחרות */
    if (!nedarim.mosadId) {
      if (summary) {
        summary.className = "donate-summary warn";
        summary.textContent = "הסליקה המקוונת בהקמה. אפשר לתרום כרגע בהעברה בנקאית, בביט או בטלפון — הפרטים למטה.";
      }
      var box = document.querySelector(".bank-box");
      if (box) box.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    state.started = true;

    /* יש מספר מוסד אבל אין ApiValid — מעבר לעמוד התרומה המאובטח
       של נדרים פלוס, עם הסכום שנבחר. עובד מיד, בלי הגדרות נוספות. */
    if (!nedarim.apiValid) {
      var url = NEDARIM_HOSTED +
        "?mosad="    + encodeURIComponent(String(nedarim.mosadId).replace(/\D/g, "")) +
        "&amount="   + encodeURIComponent(String(state.amount)) +
        "&currency=1";
      if (state.type === "monthly") {
        url += "&tashlumim=" + encodeURIComponent(String(state.months));
      }

      var checked = sec.safeUrl ? sec.safeUrl(url) : url;
      if (!checked || checked.indexOf("https://www.matara.pro/") !== 0) return;

      if (summary) {
        summary.className = "donate-summary";
        summary.textContent = "מעבירים אתכם לעמוד התרומה המאובטח של נדרים פלוס...";
      }
      window.location.assign(checked);
      return;
    }

    if (!payWrap || !frame) return;

    payWrap.hidden = false;
    if (payFor) payFor.textContent = summary ? summary.textContent : "";
    if (frame.getAttribute("src") !== NEDARIM_IFRAME) frame.setAttribute("src", NEDARIM_IFRAME);
    payWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (startBtn) startBtn.addEventListener("click", openPayment);

  if (backBtn) {
    backBtn.addEventListener("click", function () {
      if (payWrap) payWrap.hidden = true;
      state.started = false;
      if (startBtn) startBtn.focus();
    });
  }

  /* ============================================================
     תקשורת מול מסגרת נדרים פלוס — עם אימות מקור
     ============================================================ */
  var postToFrame = function (message) {
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage(message, FRAME_ORIGIN);   // מקור מפורש, לא "*"
    }
  };

  var responded = false;    // תשובת עסקה מתקבלת פעם אחת בלבד

  window.addEventListener("message", function (event) {
    /* 1. רק מהמקור של נדרים פלוס */
    if (NEDARIM_ORIGINS.indexOf(event.origin) === -1) return;

    /* 2. רק מהמסגרת שלנו, ולא מחלון אחר שנפתח */
    if (!frame || !frame.contentWindow || event.source !== frame.contentWindow) return;

    /* 3. רק אחרי שהתורם באמת פתח את הסליקה */
    if (!state.started) return;

    var data = event.data;
    if (!data || typeof data !== "object" || typeof data.Name !== "string") return;

    switch (data.Name) {

      /* המסגרת מדווחת על הגובה שלה — מספר בלבד, בתחום סביר */
      case "GetHeight":
        var height = safeInt(data.Value, 200, 2000, 700);
        frame.style.height = (height + 20) + "px";

        postToFrame({
          Name: "UpdateFields",
          Value: {
            Mosad:       String(nedarim.mosadId).replace(/\D/g, ""),
            ApiValid:    String(nedarim.apiValid),
            PaymentType: state.type === "monthly" ? "HK" : "Ragil",
            Currency:    "1",
            Amount:      String(state.amount),
            Tashlumim:   state.type === "monthly" ? String(state.months) : "1",
            Groupe:      "אתר העמותה",
            Comment:     (state.dedication ? cleanLine(state.dedication, 100) + " · " : "") +
                         (state.type === "monthly" ? "הוראת קבע מהאתר" : "תרומה מהאתר")
          }
        });
        break;

      /* תשובת העסקה */
      case "TransactionResponse":
        if (responded) return;
        responded = true;

        var value = (data.Value && typeof data.Value === "object") ? data.Value : {};

        if (value.Status === "Error") {
          responded = false;    // אפשר לנסות שוב
          if (payStatus) {
            payStatus.className = "form-status err";
            payStatus.textContent = "התשלום לא הושלם: " +
              cleanLine(value.Message || "נא לנסות שוב.", 200);
          }
        } else {
          if (payStatus) {
            payStatus.className = "form-status ok";
            payStatus.textContent = "התרומה התקבלה, מעבירים אתכם לעמוד התודה...";
          }
          window.location.assign("thanks.html");
        }
        break;
    }
  });

  /* ============================================================
     העתקת פרטי חשבון הבנק בלחיצה אחת
     ============================================================ */
  Array.prototype.forEach.call(document.querySelectorAll(".copy-btn"), function (btn) {
    btn.addEventListener("click", function () {
      var targetId = btn.getAttribute("data-target");
      var target = targetId ? document.getElementById(targetId) : null;
      var value = target ? target.textContent.replace(/\s+/g, " ").trim() : "";
      if (!value) return;

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(function () {
          toast("הועתק ✓", "ok");
        }).catch(function () {
          window.prompt("העתיקו:", value);
        });
      } else {
        window.prompt("העתיקו:", value);
      }
    });
  });
})();
