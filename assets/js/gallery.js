/* ============================================================
   עמוד הגלריה — סינון התמונות לפי נושא
   ------------------------------------------------------------
   כל תמונה מסומנת ב-data-cat. הכפתורים מסתירים/מציגים לפי הנושא,
   וכתובת כמו gallery.html#siyum פותחת ישר על הנושא המבוקש.
   ============================================================ */
(function () {
  "use strict";
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".gallery-filters button"));
  var items = Array.prototype.slice.call(document.querySelectorAll(".gallery [data-cat]"));
  if (!buttons.length) return;

  var apply = function (cat) {
    if (!buttons.some(function (b) { return b.dataset.filter === cat; })) cat = "all";
    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.filter === cat ? "true" : "false");
    });
    items.forEach(function (el) {
      el.hidden = !(cat === "all" || el.dataset.cat === cat);
    });
  };

  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      apply(b.dataset.filter);
      if (history.replaceState) {
        history.replaceState(null, "", b.dataset.filter === "all" ? location.pathname : "#" + b.dataset.filter);
      }
    });
  });

  apply((location.hash || "").replace("#", "") || "all");
})();
