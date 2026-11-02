(function () {
    "use strict";

    var script = document.currentScript;

    if (!script || !script.src) {
        return;
    }

    if (/\/ung-ho\.html$/.test(window.location.pathname)) {
        return;
    }

    var url = new URL("../../pages/ung-ho.html", script.src).href;

    function addPill() {
        if (document.getElementById("donate-pill")) {
            return;
        }

        var link = document.createElement("a");

        link.id = "donate-pill";
        link.className = "donate-pill";
        link.href = url;
        link.textContent = "☕ Ủng hộ";

        document.body.appendChild(link);
    }

    if (document.body) {
        addPill();
    } else {
        document.addEventListener("DOMContentLoaded", addPill);
    }
})();
