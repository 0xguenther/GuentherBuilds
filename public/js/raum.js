/* Günther: rechnet sein Licht je Szene einmal in ein Canvas (Hof, Lache, Widerschein),
   lässt ihn den ersten Satz schreiben, blinzeln und dem Zeiger nachsehen.
   Ohne JavaScript stehen alle Sätze da und er leuchtet ruhig (CSS-Verläufe). */
(() => {
  const szenen = [...document.querySelectorAll(".szene")];
  if (!szenen.length) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GRUEN = [43, 254, 90];   // Kern des Logos, gemessen
  const KERN = [214, 255, 220];  // derselbe Ton, überstrahlt
  const TEIL = 3;                // Licht ist weich: ein Drittel der Auflösung genügt

  const weich = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* Licht einer Szene. Luft: Abstand zum Rechteck des Körpers. Boden: Lache (diffus) und Widerschein (glänzend). */
  function backe(szene) {
    const canvas = szene.querySelector(".licht");
    const ich = szene.querySelector(".ich");
    if (!canvas || !ich) return;
    const r = szene.getBoundingClientRect();
    // Lage ohne laufende Verschiebung: über die Versatzkette statt über das gezeichnete Rechteck
    let ox = 0, oy = 0;
    for (let el = ich; el && el !== szene; el = el.offsetParent) { ox += el.offsetLeft; oy += el.offsetTop; }
    const c = { width: ich.offsetWidth, height: ich.offsetHeight };
    const cx = ox + c.width / 2, cy = oy + c.height / 2;
    const hw = c.width / 2, hh = c.height / 2;
    const hell = szene.dataset.raum === "blatt";
    const boden = szene.dataset.boden === "ohne" ? Infinity : oy + c.height + 1;
    const u = Math.max(c.height, r.height * 0.12) * (+szene.dataset.weite || 1);
    const staerke = +szene.dataset.staerke || 1;
    const offen = szene.dataset.kante === "beidseitig";
    szene.style.setProperty("--gx", `${cx.toFixed(1)}px`);
    szene.style.setProperty("--gy", `${cy.toFixed(1)}px`);
    szene.style.setProperty("--gh", `${c.height.toFixed(1)}px`);
    szene.style.setProperty("--gw", `${c.width.toFixed(1)}px`);
    if (boden !== Infinity) szene.style.setProperty("--boden", `${Math.round(boden)}px`);
    if (hell) return;

    const w = Math.ceil(r.width / TEIL), h = Math.ceil(r.height / TEIL);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const bild = ctx.createImageData(w, h);
    const d = bild.data;
    const diag = Math.hypot(r.width, r.height);
    for (let j = 0; j < h; j++) {
      const y = (j + 0.5) * TEIL;
      for (let i = 0; i < w; i++) {
        const x = (i + 0.5) * TEIL;
        let R, G, B, L;
        const dx = Math.max(Math.abs(x - cx) - hw, 0);
        const dy = Math.max(Math.abs(y - cy) - hh, 0);
        const ab = Math.hypot(dx, dy);
        // Licht in der Luft: Abstand zum Rechteck des Körpers
        const luft = 0.6 * Math.exp(-ab / (u * 0.28)) + 0.23 / (1 + (ab / (u * 0.8)) ** 2) + 0.018 / (1 + (ab / (diag * 0.25)) ** 2);
        if (y < boden) {
          // Luft und Rückwand: warmes Anthrazit, zur Kante hin etwas heller
          const t = boden === Infinity ? y / r.height : y / boden;
          R = 19 + 17 * t * t; G = 16 + 13 * t * t; B = 13 + 9 * t * t;
          L = luft;
        } else {
          const t = y - boden;
          const tief = t * 3.1;                                  // der Boden liegt flach: Tiefe gestaucht
          const quer = (x - cx) * (1 + (t / u) * 0.35);
          const k = weich(0, r.height - boden, t);
          R = 36 - 21 * k; G = 29 - 16 * k; B = 22 - 11 * k;
          const hoehe = u * 0.75;
          const lache = (0.78 * hoehe ** 3) / (quer * quer * 0.42 + tief * tief + hoehe * hoehe) ** 1.5;
          const breite = hw * (1.5 + (t / (2 * hh)) * 3.2) + 2;
          const schein = 0.62 * Math.exp(-((x - cx) ** 2) / (2 * breite * breite)) * Math.exp(-t / (hh * 1.5));
          // Der Boden zeigt sich nur bei ihm. Links steht Schrift: dort läuft sein Hof rund weiter,
          // damit keine Kante durch Unterlängen geht.
          const nah = Math.exp(-((quer / (u * (quer < 0 && !offen ? 0.3 : 1.7))) ** 2));
          L = nah * (lache + schein) + (1 - nah) * luft * 0.9;
        }
        const g = 1 - Math.exp(-L * staerke);
        const weiss = weich(0.55, 1, g);
        const n = (Math.random() - 0.5) * 1.6;                   // Rauschen gegen Stufen
        const p = (j * w + i) * 4;
        d[p] = R + g * (GRUEN[0] + (KERN[0] - GRUEN[0]) * weiss) * 0.92 + n;
        d[p + 1] = G + g * (GRUEN[1] + (KERN[1] - GRUEN[1]) * weiss) * 0.92 + n;
        d[p + 2] = B + g * (GRUEN[2] + (KERN[2] - GRUEN[2]) * weiss) * 0.92 + n;
        d[p + 3] = 255;
      }
    }
    ctx.putImageData(bild, 0, 0);
  }

  /* Feines Korn über jeder Szene, gegen Stufen in den dunklen Verläufen */
  {
    const k = document.createElement("canvas");
    k.width = k.height = 160;
    const kc = k.getContext("2d");
    const kb = kc.createImageData(160, 160);
    for (let i = 0; i < kb.data.length; i += 4) {
      const v = Math.random();
      kb.data[i] = kb.data[i + 1] = kb.data[i + 2] = v > 0.5 ? 255 : 0;
      kb.data[i + 3] = Math.abs(v - 0.5) * 12;
    }
    kc.putImageData(kb, 0, 0);
    document.documentElement.style.setProperty("--korn", `url(${k.toDataURL()})`);
  }

  const backeAlle = () => szenen.forEach(backe);
  let warte;
  addEventListener("resize", () => { clearTimeout(warte); warte = setTimeout(backeAlle, 140); });

  /* Er geht mit: In einem Kapitel, das der Besucher betritt, geht sein Licht an. */
  const raum = document.querySelector(".raum");
  if (!still && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.remove("ist-aus"); io.unobserve(e.target); }
    }), { threshold: 0.35 });
    szenen.forEach((s) => { if (s !== raum) { s.classList.add("ist-aus"); io.observe(s); } });
  }

  /* Lidschlag: unregelmässig, in der Szene, die gerade im Bild steht */
  function blinzle() {
    const mitte = innerHeight / 2;
    const s = szenen.find((z) => { const b = z.getBoundingClientRect(); return b.top <= mitte && b.bottom >= mitte; });
    if (s && !document.hidden && !s.classList.contains("schreibt")) {
      s.classList.add("blinzelt");
      setTimeout(() => s.classList.remove("blinzelt"), 110);
    }
  }
  function naechsterLidschlag() {
    setTimeout(() => { blinzle(); naechsterLidschlag(); }, 5200 + Math.random() * 5600);
  }

  /* Sein Blick folgt dem Zeiger, mit Verzögerung */
  function blickFolgt() {
    const blick = raum?.querySelector(".blick");
    if (!blick || !matchMedia("(hover: hover)").matches) return;
    let zx = 0, zy = 0, x = 0, y = 0, laeuft = false;
    function schritt() {
      x += (zx - x) * 0.07;
      y += (zy - y) * 0.07;
      blick.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (Math.abs(zx - x) + Math.abs(zy - y) > 0.5) requestAnimationFrame(schritt);
      else laeuft = false;
    }
    raum.addEventListener("pointermove", (e) => {
      const r = raum.getBoundingClientRect();
      zx = e.clientX - r.left;
      zy = e.clientY - r.top;
      if (!blick.classList.contains("ist-da")) { x = zx; y = zy; blick.classList.add("ist-da"); }
      if (!laeuft) { laeuft = true; requestAnimationFrame(schritt); }
    }, { passive: true });
    raum.addEventListener("pointerleave", () => blick.classList.remove("ist-da"));
  }

  /* Randbemerkung: wechselt mit dem, was der Besucher tut */
  function randnote() {
    const zettel = raum?.querySelector(".randnote");
    const note = zettel?.querySelector("span");
    if (!note) return;
    const erste = note.innerHTML;
    let jetzt = erste, ruhe;
    function sage(text) {
      if (text === jetzt) return;
      jetzt = text;
      zettel.classList.add("wechselt");
      setTimeout(() => { if (text === erste) note.innerHTML = erste; else note.textContent = text; zettel.classList.remove("wechselt"); }, 360);
    }
    const wecke = () => {
      clearTimeout(ruhe);
      if (jetzt === zettel.dataset.wartet) sage(erste);
      ruhe = setTimeout(() => sage(zettel.dataset.wartet), 20000);
    };
    ["pointermove", "keydown", "scroll", "touchstart"].forEach((e) => addEventListener(e, wecke, { passive: true }));
    wecke();
    const auftrag = raum.querySelector(".auftrag");
    auftrag?.addEventListener("pointerenter", () => sage(zettel.dataset.auftrag));
    auftrag?.addEventListener("pointerleave", () => sage(erste));
    let warWeg = false;
    addEventListener("scroll", () => {
      if (scrollY > innerHeight * 1.5) warWeg = true;
      else if (warWeg && scrollY < 40) { warWeg = false; sage(zettel.dataset.zurueck); }
    }, { passive: true });
  }

  /* Auftakt: Günther geht an und schreibt seinen ersten Satz Wort für Wort. */
  function auftakt() {
    const titel = raum?.querySelector(".titel");
    const ich = titel?.querySelector(".ich") || raum?.querySelector(".ich");
    const licht = raum?.querySelector(".licht");
    const woerter = titel ? [...titel.querySelectorAll(".w")] : [];
    if (!raum || !ich || !woerter.length || still) return Promise.resolve();
    return new Promise((fertigGemeldet) => {
      const zeiten = [];
      const ende = ["pointerdown", "keydown", "wheel", "touchstart"];
      const mit = ich.closest(".titel") !== null;   // steht er in der Zeile, geht er mit den Wörtern
      raum.classList.add("schreibt", "ist-aus");
      const ziel = ich.getBoundingClientRect();
      const letztes = woerter[woerter.length - 1].getBoundingClientRect();
      const luecke = ziel.left - letztes.right;
      const stelle = (wort, anfang) => {
        if (!mit) return;
        const b = wort.getBoundingClientRect();
        const x = (anfang ? b.left - ziel.width - luecke : b.right + luecke) - ziel.left;
        ich.style.transform = `translate(${x.toFixed(1)}px, ${(b.bottom - letztes.bottom).toFixed(1)}px)`;
      };
      function fertig() {
        zeiten.forEach(clearTimeout);
        ende.forEach((e) => removeEventListener(e, fertig));
        woerter.forEach((w) => w.classList.add("ist-da"));
        ich.style.transform = "";
        licht.style.opacity = "";
        raum.classList.remove("ist-aus", "ist-dunkel");
        zeiten.push(setTimeout(() => raum.classList.remove("schreibt"), 700));
        raum.querySelectorAll(".spaeter").forEach((el) => { el.style.opacity = 1; });
        fertigGemeldet();
      }
      ende.forEach((e) => addEventListener(e, fertig, { once: true, passive: true }));
      stelle(woerter[0], true);
      // Erst geht nur er an; der Raum füllt sich mit Licht, wenn er an seinem Platz steht.
      licht.style.opacity = 0;
      raum.classList.add("ist-dunkel");
      zeiten.push(setTimeout(() => raum.classList.remove("ist-aus"), 200));
      const takt = Math.min(250, 1150 / woerter.length);
      woerter.forEach((w, i) => zeiten.push(setTimeout(() => {
        w.classList.add("ist-da");
        stelle(w, false);
      }, 520 + i * takt)));
      zeiten.push(setTimeout(fertig, 520 + woerter.length * takt + 180));
    });
  }

  (document.fonts?.ready || Promise.resolve()).then(() => {
    backeAlle();
    requestAnimationFrame(backeAlle);
    auftakt().then(() => {
      if (still) return;
      setTimeout(blinzle, 420);
      naechsterLidschlag();
    });
    blickFolgt();
    randnote();
  });
})();
