/* Die Eingabezeile ist das Menü: öffnet das Blatt, Tippen filtert, Enter folgt dem ersten Treffer. */
(() => {
  const knopf = document.querySelector(".eingabe");
  const blatt = document.getElementById("befehle");
  if (!knopf || !blatt) return;
  const feld = blatt.querySelector(".befehle__feld");
  const zeilen = [...blatt.querySelectorAll(".befehle__liste li")];

  function filtere() {
    const q = feld.value.trim().toLowerCase();
    let erster = null;
    zeilen.forEach((li) => {
      const passt = !q || li.textContent.toLowerCase().includes(q);
      li.hidden = !passt;
      li.classList.remove("ist-treffer");
      if (passt && !erster) erster = li;
    });
    if (q && erster) erster.classList.add("ist-treffer");
    return erster;
  }

  function setze(offen) {
    blatt.hidden = !offen;
    knopf.setAttribute("aria-expanded", String(offen));
    knopf.querySelector(".eingabe__wort").textContent = offen ? "schliessen" : "Menü";
    document.documentElement.style.overflow = offen ? "hidden" : "";
    if (offen) {
      feld.value = "";
      filtere();
      feld.focus();
    } else {
      knopf.focus();
    }
  }

  knopf.addEventListener("click", () => setze(blatt.hidden));
  blatt.addEventListener("click", (e) => {
    if (e.target === blatt || e.target.closest("a")) setze(false);
  });
  feld.addEventListener("input", filtere);
  feld.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const erster = filtere();
    if (erster) erster.querySelector("a").click();
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !blatt.hidden) setze(false);
    if (e.key === "/" && blatt.hidden && !/input|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      setze(true);
    }
  });
})();
