/* Figurenstudie · gemeinsamer Rahmen: Menü (Eingabezeile) und der Taktgeber, den jede Figur benutzt.
   Die Figur selbst liegt je Ordner in figur.js. */
(() => {
  const html = document.documentElement;
  const q = new URLSearchParams(location.search);
  const fix = q.has("t") ? Math.max(0, Math.min(1, parseFloat(q.get("t")) || 0)) : null;
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  const zeiger = { x: 0.5, y: 0.5, aktiv: false };

  addEventListener("pointermove", (e) => {
    zeiger.x = e.clientX / innerWidth;
    zeiger.y = e.clientY / innerHeight;
    zeiger.aktiv = true;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { zeiger.aktiv = false; });

  /* Zone, in der die Figur stehen soll, in CSS-Pixeln der Szene; `wort` ist der Textblock. */
  function zone() {
    const szene = document.querySelector(".szene").getBoundingClientRect();
    const w = document.querySelector(".wort").getBoundingClientRect();
    const wort = { x: w.left - szene.left, y: w.top - szene.top, w: w.width, h: w.height };
    const B = szene.width, H = szene.height;
    const schmal = B < 800;
    const z = schmal
      ? { x: 0, y: 68, w: B, h: Math.max(160, wort.y - 68 - 14) }
      : { x: B * 0.5, y: H * 0.1, w: B * 0.5, h: H * 0.9 };
    return { ...z, B, H, schmal, wort };
  }

  /* Canvas auf Szenengrösse, Pixeldichte höchstens 2. */
  function leinwand(canvas, kontext = "2d", optionen) {
    const r = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    return { ctx: canvas.getContext(kontext, optionen), B: r.width, H: r.height, dpr };
  }

  /* Taktgeber. zeichne(p, zeit): p = Fortschritt des Auftakts 0..1, zeit = Sekunden seit Start.
     ?t=0.5 friert den Auftakt ein (Prüfbild), prefers-reduced-motion zeigt sofort das Standbild.
     Klick, Taste, Scroll oder Berührung überspringen den Auftakt. */
  function lauf({ dauer = 2200, ruhe = true, zeichne, neu }) {
    let start = performance.now(), sprung = false, sichtbar = true, rahmen = 0;
    const still = () => mq.matches || fix !== null;
    const bild = (jetzt) => {
      rahmen = 0;
      if (still()) { zeichne(fix !== null ? fix : 1, 0); return; }
      const p = sprung ? 1 : Math.min(1, Math.max(0, (jetzt - start) / dauer));
      zeichne(p, Math.max(0, (jetzt - start) / 1000));
      if ((p < 1 || ruhe) && sichtbar && !document.hidden) rahmen = requestAnimationFrame(bild);
    };
    const los = () => { if (!rahmen) rahmen = requestAnimationFrame(bild); };
    const ueberspringe = () => { sprung = true; los(); };
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach((n) => addEventListener(n, ueberspringe, { passive: true, once: true }));
    let warte = 0;
    addEventListener("resize", () => { clearTimeout(warte); warte = setTimeout(() => { if (neu) neu(); los(); }, 120); });
    document.addEventListener("visibilitychange", los);
    mq.addEventListener("change", los);
    new IntersectionObserver(([e]) => { sichtbar = e.isIntersecting; if (sichtbar) los(); }).observe(document.querySelector(".szene"));
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { if (neu) neu(); start = performance.now(); los(); });
  }

  window.Rahmen = { fix, zeiger, zone, leinwand, lauf, get reduziert() { return mq.matches; } };
  html.classList.add("js");

  /* Die Eingabezeile ist das Menü: öffnet das Blatt, Tippen filtert, Enter folgt dem ersten Treffer. */
  const knopf = document.querySelector(".eingabe");
  const blatt = document.getElementById("befehle");
  if (!knopf || !blatt) return;
  const feld = blatt.querySelector(".befehle__feld");
  const wort = knopf.querySelector(".eingabe__wort");
  const zeilen = [...blatt.querySelectorAll(".befehle__liste li")];

  function filtere() {
    const s = feld.value.trim().toLowerCase();
    let erster = null;
    zeilen.forEach((li) => {
      const passt = !s || li.textContent.toLowerCase().includes(s);
      li.hidden = !passt;
      li.classList.remove("ist-treffer");
      if (passt && !erster) erster = li;
    });
    if (s && erster) erster.classList.add("ist-treffer");
    return erster;
  }
  function setze(offen) {
    blatt.hidden = !offen;
    knopf.setAttribute("aria-expanded", String(offen));
    wort.textContent = offen ? knopf.dataset.zu : knopf.dataset.auf;
    html.style.overflow = offen ? "hidden" : "";
    if (offen) { feld.value = ""; filtere(); feld.focus(); } else { knopf.focus(); }
  }
  knopf.addEventListener("click", () => setze(blatt.hidden));
  blatt.addEventListener("click", (e) => { if (e.target === blatt || e.target.closest("a")) setze(false); });
  feld.addEventListener("input", filtere);
  feld.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const erster = filtere();
    if (erster) erster.querySelector("a").click();
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !blatt.hidden) setze(false);
    if (e.key === "/" && blatt.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); setze(true); }
  });
})();
