/* Figur 2b · «Büste». Stellt Günther auf die Bühne: Lage, Grösse und Drehung je Rendition und Scroll.
   Rendition a: Halbprofil, feinste Zeichenzellen. Rendition b (?r=b): frontal, etwas gröbere Zellen.
   Prüfbilder: ?t=0..1 friert den Auftakt ein, ?dreh=0..1 den Scroll, ?still=1 das Standbild. */
(() => {
  "use strict";
  const R = window.Rahmen, B = window.Bueste;
  const szene = document.querySelector(".szene"), spur = document.querySelector(".spur");
  const canvas = szene && szene.querySelector("canvas.figur");
  if (!R || !B || !canvas) { if (szene) szene.querySelector(".buehne").classList.add("ohne-webgl"); return; }
  const q = new URLSearchParams(location.search);
  const rend = q.get("r") === "b" ? "b" : "a";
  const drehFix = q.has("dreh") ? Math.max(0, Math.min(1, parseFloat(q.get("dreh")) || 0)) : null;
  szene.dataset.rendition = rend;

  let zone = R.zone();
  addEventListener("resize", () => { zone = R.zone(); });
  if (document.fonts) document.fonts.ready.then(() => { zone = R.zone(); });

  function dreh() {
    if (drehFix !== null) return drehFix;
    if (R.reduziert) return 0;
    const weg = spur.offsetHeight - innerHeight;
    return weg > 0 ? Math.max(0, Math.min(1, scrollY / weg)) : 0;
  }
  const weich = (t) => t * t * (3 - 2 * t);

  function pose() {
    const z = zone, p = weich(dreh());
    const W = z.B, H = z.H, wort = z.wort;
    let o;
    if (z.schmal) {
      /* Telefon: Günther füllt den Raum zwischen Kopfzeile und Titel, die Schultern laufen über die ganze Breite
         und gehen über dem Titel aus */
      const frei = wort.y - 60;
      o = rend === "a"
        ? { h: frei * 0.6, x: W * 0.55, gier: -0.2, kopfGier: -0.14, zelle: 4 }
        : { h: frei * 0.62, x: W * 0.5, gier: 0, kopfGier: 0, zelle: 5 };
      o.y = 84 + o.h * 0.79;
      o.blende = { unten: [wort.y - 104, wort.y - 10] };
    } else {
      o = rend === "a"
        ? { h: H * 0.64, x: W * 0.7, y: H * 0.585, gier: -0.2, kopfGier: -0.14, zelle: 5 }
        : { h: H * 0.64, x: W * 0.7, y: H * 0.585, gier: 0, kopfGier: 0, zelle: 7 };
      o.blende = { links: [wort.x + wort.w - 20, wort.x + wort.w + 150], unten: [H * 0.8, H * 1.06] };
    }
    o.kopfNick = 0.02;
    o.braue = [0.28, 0.36];                  /* Band der Brauenkante; darüber liegen die Zeichenbänder der Stirn */
    /* Scroll: Günther dreht sich aus dem Halbprofil ins Profil, zum Text und zum Licht hin, und kommt näher */
    o.gier -= p * (rend === "a" ? 0.55 : 0.72);
    o.kopfGier -= p * 0.2;
    o.h *= 1 + p * (z.schmal ? 0.02 : 0.04);
    if (!z.schmal) o.x += p * W * 0.03;      /* im Profil rückt er vom Titel ab, die Nase bleibt frei */
    /* Das Licht bleibt an der Textseite; je weiter er sich ihm zudreht, desto flacher streift es sein Gesicht */
    if (o.licht === undefined) o.licht = (rend === "a" ? -0.6 : -0.75) - p * 0.35;
    o.lichtHoch = 0.42;
    return o;
  }

  const still = R.reduziert || q.has("still");
  /* Modellpfad absolut aus dem Ort von js/bueste.js, damit er auf jeder Seite stimmt (Startseite, EN, Unterseite) */
  const bs = [...document.scripts].find((s) => /js\/bueste\.js/.test(s.src));
  const BASIS = bs ? new URL("../", bs.src).href : "../../";
  B.start({
    canvas, basis: BASIS, sprache: document.documentElement.lang, pose,
    auftakt: R.fix, still, schmal: () => zone.schmal, haltbar: q.has("still") || R.fix !== null || drehFix !== null,
  });
})();
