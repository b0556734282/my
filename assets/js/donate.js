/* ============================================================
   דף התרומה — בחירת סכום וסליקה מאובטחת דרך נדרים פלוס.
   ------------------------------------------------------------
   אם לא הוגדרו פרטי נדרים פלוס בקובץ config.js, הדף מציג
   הודעה מנומסת ומפנה לדרכי התרומה האחרות — בלי שום שגיאה.
   ============================================================ */
(function () {
  "use strict";

  var cfg = (window.SITE_CONFIG || {});
  var nedarim = cfg.nedarim || {};
  var NEDARIM_IFRAME = "https://matara.pro/nedarimplus/iframe/?language=he";
  var NEDARIM_HOSTED = "https://www.matara.pro/nedarimplus/online/";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var state = { type: "once", amount: 180, months: 12 };

  /* קליטת בחירה שהגיעה מעמוד הבית, למשל donate.html?amount=180&type=monthly */
  var params = new URLSearchParams(window.location.search);
  var paramAmount = parseInt(params.get("amount"), 10);
  if (paramAmount > 0) state.amount = paramAmount;
  if (params.get("type") === "monthly") state.type = "monthly";

  var summary     = document.getElementById("donateSummary");
  var customInput = document.getElementById("customAmount");
  var monthsField = document.getElementById("monthsField");
  var monthsSelect= document.getElementById("months");
  var startBtn    = document.getElementById("startDonation");
  var payWrap     = document.getElementById("paymentWrap");
  var payFor      = document.getElementById("payFor");
  var payStatus   = document.getElementById("payStatus");
  var frame       = document.getElementById("NedarimFrame");
  var backBtn     = document.getElementById("backToAmount");

  var shekels = function (n) { return "₪" + Number(n).toLocaleString("he-IL"); };

  /* ---------- עדכון שורת הסיכום ---------- */
  var renderSummary = function () {
    if (!summary) return;

    if (!state.amount || state.amount < 1) {
      summary.textContent = "נא לבחור סכום תרומה.";
      return;
    }

    if (state.type === "monthly") {
      var months = state.months;
      var forHowLong = months === 999
        ? "מדי חודש, עד להודעה חדשה"
        : "מדי חודש, במשך " + months + " חודשים (סה\"כ " + shekels(state.amount * months) + ")";
      summary.textContent = shekels(state.amount) + " " + forHowLong + ".";
    } else {
      summary.textContent = "תרומה חד־פעמית בסך " + shekels(state.amount) + ".";
    }
  };

  /* ---------- מעבר בין חד־פעמי להוראת קבע ---------- */
  document.querySelectorAll(".toggle[data-type]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.type = btn.getAttribute("data-type");

      document.querySelectorAll(".toggle[data-type]").forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", String(on));
      });

      if (monthsField) monthsField.hidden = (state.type !== "monthly");
      renderSummary();
    });
  });

  /* ---------- בחירת סכום מוכן ---------- */
  document.querySelectorAll(".amount[data-amount]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.amount = parseInt(btn.getAttribute("data-amount"), 10);

      document.querySelectorAll(".amount[data-amount]").forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", String(on));
      });

      if (customInput) customInput.value = "";
      renderSummary();
    });
  });

  /* ---------- סכום חופשי ---------- */
  if (customInput) {
    customInput.addEventListener("input", function () {
      var value = parseInt(customInput.value, 10);
      if (value > 0) {
        state.amount = value;
        document.querySelectorAll(".amount[data-amount]").forEach(function (b) {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
      }
      renderSummary();
    });
  }

  if (monthsSelect) {
    monthsSelect.addEventListener("change", function () {
      state.months = parseInt(monthsSelect.value, 10);
      renderSummary();
    });
  }

  /* סימון הבחירה שהגיעה מעמוד הבית על גבי הכפתורים */
  var syncFromState = function () {
    document.querySelectorAll(".toggle[data-type]").forEach(function (b) {
      var on = b.getAttribute("data-type") === state.type;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    if (monthsField) monthsField.hidden = (state.type !== "monthly");

    var matched = false;
    document.querySelectorAll(".amount[data-amount]").forEach(function (b) {
      var on = parseInt(b.getAttribute("data-amount"), 10) === state.amount;
      if (on) matched = true;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    if (!matched && customInput) customInput.value = state.amount;
  };

  syncFromState();
  renderSummary();

  /* ---------- פתיחת מסך הסליקה ---------- */
  var openPayment = function () {
    if (!state.amount || state.amount < 1) {
      if (customInput) customInput.focus();
      renderSummary();
      return;
    }

    // אין בכלל מספר מוסד — מפנים לדרכי התרומה האחרות
    if (!nedarim.mosadId) {
      if (summary) {
        summary.className = "donate-summary warn";
        summary.textContent = "הסליקה המקוונת בהקמה. אפשר לתרום כרגע בהעברה בנקאית, בביט או בטלפון — הפרטים למטה.";
      }
      var box = document.querySelector(".bank-box");
      if (box) box.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    /* יש מספר מוסד אבל אין ApiValid — מעבירים לעמוד התרומה המאובטח
       של נדרים פלוס, עם הסכום שנבחר. עובד מיד, בלי הגדרות נוספות. */
    if (!nedarim.apiValid) {
      var url = NEDARIM_HOSTED +
        "?mosad=" + encodeURIComponent(nedarim.mosadId) +
        "&amount=" + encodeURIComponent(state.amount) +
        "&currency=1";
      if (state.type === "monthly") url += "&tashlumim=" + encodeURIComponent(state.months);

      if (summary) {
        summary.className = "donate-summary";
        summary.textContent = "מעבירים אתכם לעמוד התרומה המאובטח של נדרים פלוס...";
      }
      window.location.href = url;
      return;
    }

    payWrap.hidden = false;
    if (payFor) payFor.textContent = summary ? summary.textContent : "";
    if (frame.getAttribute("src") !== NEDARIM_IFRAME) frame.setAttribute("src", NEDARIM_IFRAME);
    payWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (startBtn) startBtn.addEventListener("click", openPayment);

  if (backBtn) {
    backBtn.addEventListener("click", function () {
      payWrap.hidden = true;
      if (startBtn) startBtn.focus();
    });
  }

  /* ---------- תקשורת מול מסגרת נדרים פלוס ---------- */
  var postToFrame = function (message) {
    if (frame && frame.contentWindow) frame.contentWindow.postMessage(message, "*");
  };

  window.addEventListener("message", function (event) {
    if (!event.data || !event.data.Name) return;

    switch (event.data.Name) {

      // המסגרת נטענה — שולחים את פרטי העסקה
      case "GetHeight":
        frame.style.height = (event.data.Value + 20) + "px";
        postToFrame({
          Name: "UpdateFields",
          Value: {
            Mosad:       nedarim.mosadId,
            ApiValid:    nedarim.apiValid,
            PaymentType: state.type === "monthly" ? "HK" : "Ragil",
            Currency:    "1",
            Amount:      String(state.amount),
            Tashlumim:   state.type === "monthly" ? String(state.months) : "1",
            Groupe:      "אתר העמותה",
            Comment:     state.type === "monthly" ? "הוראת קבע מהאתר" : "תרומה מהאתר"
          }
        });
        break;

      // תשובת העסקה
      case "TransactionResponse":
        if (event.data.Value && event.data.Value.Status === "Error") {
          if (payStatus) {
            payStatus.className = "form-status err";
            payStatus.textContent = "התשלום לא הושלם: " + (event.data.Value.Message || "נא לנסות שוב.");
          }
        } else {
          window.location.href = "thanks.html";
        }
        break;
    }
  });
})();
