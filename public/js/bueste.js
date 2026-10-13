/* Günthers Büste: echte 3D-Geometrie (modelle/bueste.glb), in WebGL aus Zeichen gerendert.
   Drei Durchgänge:
   1 Geometrie  -> Normalen und Tiefe der Büste in ein kleines Ziel (Kopf dreht auf dem Hals, Brust atmet)
   2 Zellen     -> je Zeichenzelle: grünes Seitenlicht mit Schlagschatten, Randlicht, warmer Raumton, Mulden;
                   Umriss, Verdeckung und Falten als Kanten samt Richtung (| / \ – _ ¯)
   3 Zeichen    -> Glyph-Atlas (JetBrains Mono), Zeichen nach Helligkeit, Farbe nach Lichtart,
                   Glühen der hellsten Zeichen, Günthers Wörter
   Form: Blender Studio «Human Base Meshes» (CC0), per Skript umgeformt. Wörter: docs/dna.md.
   Aufruf: Bueste.start({ canvas, basis, sprache, pose, auftakt, still, schmal }) */
(() => {
  "use strict";
  const T = window.THREE;

  const SP = 16, ZE = 8, STUFEN = 16;
  const HOCH = 1.7;                       /* Zellenhöhe je Zellenbreite: enge Zeilen, senkrechte Striche schliessen an */
  const RAMPE = " .·:+*xo0#8%@";          /* von leer nach dicht, ohne Striche: die gehören den Kanten; x und 0 aus seinem Namen */
  const KANTEN = "|/\\–_¯";
  const REST = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'…,äöüÄÖÜ";
  const ZEICHEN = [...new Set((RAMPE + KANTEN + REST).split(""))];

  /* Jeder Begriff steht in docs/dna.md (Produkte, Fachwörter, Zahlen). */
  const WOERTER = {
    alle: ["Agent Check", "Günther Craft", "Wallet Guard", "Token Burner", "Webhook MCP", "Retry", "Rate-Limit 429",
      "unverified", "0x…dEaD", "Base L2", "Atomic CAS", "TypeScript", "Fastify", "Prisma", "viem", "Zod", "GUNTER", "Prompt"],
    de: ["66 Seiten", "16 Fälle", "0 Burns", "58 Kapitel", "genau einmal"],
    en: ["66 pages", "16 cases", "0 burns", "58 chapters", "exactly once"],
  };

  const VS_GEO = `#version 300 es
precision highp float;
in vec3 position; in vec3 normal;
uniform mat4 modelViewMatrix, projectionMatrix; uniform mat3 normalMatrix;
uniform vec2 uKopf; uniform float uAtem;
out vec3 vN; out float vT;
vec3 rY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }
vec3 rX(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z); }
void main(){
  vec3 p = position, n = normal;
  float w = smoothstep(-0.66, -0.14, p.y);            /* Hals verdreht sich, Schultern bleiben */
  vec3 dreh = vec3(0.0, -0.16, -0.05);
  p = rX(rY(p - dreh, uKopf.x * w), uKopf.y * w) + dreh;
  n = rX(rY(n, uKopf.x * w), uKopf.y * w);
  float b = smoothstep(-0.5, -1.25, p.y);             /* Atem: Brust hebt sich, Kopf geht kaum mit */
  p += vec3(0.0, 0.014, 0.02) * b * uAtem;
  p.y += 0.004 * uAtem * (1.0 - b);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * n);
  vT = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
  const FS_GEO = `#version 300 es
precision highp float;
in vec3 vN; in float vT;
uniform vec2 uTiefe;
out vec4 o;
void main(){
  vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  float t = clamp((uTiefe.y - vT) / (uTiefe.y - uTiefe.x), 0.002, 0.998) * 255.0;
  o = vec4(n.xy * 0.5 + 0.5, floor(t) / 255.0, fract(t));
}`;
  const VS_FLAECHE = `#version 300 es
in vec3 position;
void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  const FS_ZELLEN = `#version 300 es
precision highp float;
uniform sampler2D tG;
uniform vec2 uRaster, uFlaeche, uZelle;
uniform vec3 uL1, uL2, uMass;
uniform vec4 uBlende;
uniform vec2 uOben, uBraue;
uniform float uHell, uFalte;
out vec4 o;
/* Geometrieziel lesen: xyz = Normale, a = Nähe (0 = leer) */
vec4 G(vec2 uv){
  vec4 g = texture(tG, uv);
  float a = g.b + g.a / 255.0;
  vec2 n = g.rg * 2.0 - 1.0;
  return vec4(n, sqrt(max(1.0 - dot(n, n), 0.0)), a);
}
void main(){
  vec2 ij = floor(gl_FragCoord.xy);
  float oben = uRaster.y - 1.0 - ij.y;
  vec2 d = uZelle / uFlaeche;
  vec2 uv = vec2((ij.x + 0.5) * d.x, 1.0 - (oben + 0.5) * d.y);

  vec4 m = G(uv);
  if (m.a <= 0.0) { o = vec4(0.0); return; }
  float a0 = m.a;
  vec3 n = m.xyz;
  for (int k = 0; k < 4; k++) {
    vec4 g = G(uv + vec2(k < 2 ? -0.3 : 0.3, (k == 0 || k == 2) ? -0.3 : 0.3) * d);
    if (g.a > 0.0 && abs(g.a - a0) < 0.05 * uMass.z) n += g.xyz;
  }
  n = normalize(n);

  /* Nachbarn im Zellenraster */
  vec4 gl = G(uv + vec2(-d.x, 0.0)), gr = G(uv + vec2(d.x, 0.0)), gu = G(uv + vec2(0.0, -d.y)), go = G(uv + vec2(0.0, d.y));
  vec4 g1 = G(uv + vec2(-d.x, -d.y)), g2 = G(uv + vec2(d.x, -d.y)), g3 = G(uv + vec2(-d.x, d.y)), g4 = G(uv + vec2(d.x, d.y));

  /* Licht: grünes Seitenlicht, grünes Randlicht von hinten, warmer Raumton von vorn */
  float seite = pow(max((dot(n, uL1) + 0.06) / 1.06, 0.0), 1.6);
  float glanz = pow(max(dot(n, normalize(uL1 + vec3(0.0, 0.0, 1.0))), 0.0), 30.0) * 0.1;
  float streif = pow(1.0 - max(n.z, 0.0), 1.8);
  float rand = streif * smoothstep(-0.15, 0.55, dot(n, uL2)) * 1.3;
  /* Schattenseite: das Randlicht läuft als schwacher Saum in die Fläche aus, der Raumton fällt steiler ab.
     So rundet sich der Kopf auch dort, wo das Seitenlicht nicht hinkommt. */
  rand += pow(1.0 - max(n.z, 0.0), 0.9) * smoothstep(-0.2, 0.8, dot(n, uL2)) * 0.16;
  float warm = 0.012 + 0.27 * pow(max(dot(n, normalize(vec3(-sign(uL1.x) * 0.55, 0.38, 0.74))), 0.0), 2.4);

  /* Schlagschatten: Strahl im Bildraum zum Seitenlicht (Nase auf die Wange, Kinn auf den Hals, Kopf auf die Schulter) */
  float lxy = max(length(uL1.xy), 0.001);
  vec2 ri = uL1.xy / lxy;
  float schatten = 0.0;
  for (int k = 1; k <= 14; k++) {
    float s = 0.014 * float(k) + 0.0016 * float(k * k);
    float ak = G(uv + ri * s * uMass.xy).a;
    float strahl = a0 + uL1.z / lxy * s * uMass.z;
    float diff = (ak - strahl) / uMass.z;
    /* weicher Rand: der Schatten setzt nicht hart ein, sondern wächst mit der Höhe des Verdeckers */
    if (ak > 0.0) schatten = max(schatten, smoothstep(0.01, 0.05, diff) * (1.0 - smoothstep(0.3, 0.42, diff)) * (1.0 - float(k - 1) / 15.0));
  }
  seite *= 1.0 - 0.62 * schatten;
  glanz *= 1.0 - schatten;

  /* Mulden (Augenhöhlen, unter der Nase, Mundspalt, unter dem Kinn) liegen tiefer als ihre Umgebung und werden dunkler */
  float weitM = 0.0;
  for (int k = 0; k < 8; k++) {
    float w = float(k) * 0.7853982;
    float ak = G(uv + vec2(cos(w), sin(w)) * vec2(0.034, 0.034) * uMass.xy).a;
    weitM += ak > 0.0 ? ak : a0;
  }
  float mulde = smoothstep(0.003, 0.034, (weitM * 0.125 - a0) / uMass.z);
  seite *= 1.0 - 0.5 * mulde;
  warm *= 1.0 - 0.45 * mulde;

  /* Kanten.
     Umriss: die Zelle grenzt an den Raum. Verdeckung: sie steht deutlich vor einem Nachbarn (Nase vor Wange,
     Kiefer vor Hals, Ohr vor Schädel). Falte: die Normalen der Nachbarn knicken, ohne Sprung in der Tiefe. */
  float aussen = min(min(gl.a, gr.a), min(gu.a, go.a)) > 0.0 ? 0.0 : 1.0;
  float sw = 0.085 * uMass.z;
  #define VOR(hinten, vorn) (((hinten) > 0.0 && (a0 - (hinten)) > sw && abs(a0 - (vorn)) < (a0 - (hinten)) * 0.45) ? 1.0 : 0.0)
  float verdeckt = max(max(VOR(gr.a, gl.a), VOR(gl.a, gr.a)), max(VOR(go.a, gu.a), VOR(gu.a, go.a)));
  float umriss = max(aussen, verdeckt);
  float sprung = max(max(abs(gl.a - a0), abs(gr.a - a0)), max(abs(gu.a - a0), abs(go.a - a0)));
  float kq = length(gr.xyz - gl.xyz), kl = length(go.xyz - gu.xyz);
  float falte = (umriss > 0.5 || sprung > sw * 0.7 || n.z < 0.35) ? 0.0 : step(uFalte, max(kq, kl));

  /* Brauenkante: im Band über den Augen kippt die Normale von der Stirn in die Augenhöhle.
     Nur die Zeile mit dem stärksten Knick zählt, damit ein einziger Strich steht. */
  float hy = 1.0 - uv.y;
  float braue = 0.0;
  if (umriss < 0.5 && hy > uBraue.x && hy < uBraue.y && n.z > 0.3 && go.a > 0.0 && gu.a > 0.0) {
    vec4 go2 = G(uv + vec2(0.0, 2.0 * d.y)), gu2 = G(uv - vec2(0.0, 2.0 * d.y));
    float grat = go.y - gu.y;
    if (grat > 0.3 && grat >= m.y - gu2.y && grat > go2.y - m.y) braue = 1.0;
  }
  /* Zeichenbänder: über der Braue folgen die Zeichen den Höhenlinien der Form (Linien gleicher Tiefe) */
  float stirn = 1.0 - smoothstep(uBraue.x - 0.02, uBraue.x, hy);
  float linie = abs(fract(a0 / uMass.z * 34.0) - 0.5) * 2.0;

  float code = 0.0;
  if (braue > 0.5) {
    code = 4.0;                                               /* – */
  } else if (umriss > 0.5) {
    /* Am Umriss zeigt die Normale quer zur Kontur: daraus folgt die Richtung des Strichs. */
    vec2 q = n.xy;
    if (length(q) < 0.22) {
      q = -vec2((g2.a + 2.0 * gr.a + g4.a) - (g1.a + 2.0 * gl.a + g3.a), (g3.a + 2.0 * go.a + g4.a) - (g1.a + 2.0 * gu.a + g2.a));
    }
    float ax = abs(q.x), ay = abs(q.y);
    if (ax > ay * 2.6) code = 1.0;                            /* | */
    else if (ax < ay * 0.62) code = q.y > 0.0 ? 6.0 : 5.0;     /* ¯ oben, _ unten */
    else code = q.x * q.y < 0.0 ? 2.0 : 3.0;                   /* / oder \\ */
  } else if (falte > 0.5) {
    if (kl > kq * 1.5) code = 4.0;                             /* – */
    else if (kq > kl * 1.5) code = 1.0;
    else code = length(g4.xyz - g1.xyz) > length(g2.xyz - g3.xyz) ? 3.0 : 2.0;
  }

  float gruen = seite * 0.84 + glanz * (1.0 - mulde) + rand;
  gruen *= 1.0 + stirn * 0.36 * (linie - 0.5);
  warm *= 1.0 - 0.8 * smoothstep(0.02, 0.4, gruen);
  if (braue > 0.5) {
    /* Die Braue ist gezeichnet, nicht beleuchtet: ein Strich in Tinte, auch im Licht */
    gruen = 0.0;
    warm = 0.85;
  } else if (umriss > 0.5) {
    /* Die Kontur ist gezeichnet: im Licht hell, im Schatten als Strich in Tinte */
    /* Im Licht zeichnet die Helligkeit die Form; nur wo es dunkel ist, steht die Kontur als feiner Strich in Tinte.
       Waagrechte Striche im Innern (unter dem Kinn) entfallen. */
    float imLicht = smoothstep(0.06, 0.3, gruen);
    if (gruen > 0.26 || (aussen < 0.5 && code > 4.5)) code = 0.0;
    else warm = max(warm, (aussen > 0.5 ? 0.42 : 0.22) * (1.0 - imLicht));
  } else if (falte > 0.5) {
    warm = max(warm, 0.22 * (1.0 - smoothstep(0.05, 0.3, gruen)));
  }

  float bl = smoothstep(uBlende.x, uBlende.y, uv.x) * (1.0 - smoothstep(uBlende.z, uBlende.w, 1.0 - uv.y)) * smoothstep(uOben.x, uOben.y, 1.0 - uv.y) * uHell;
  o = vec4(clamp(gruen * bl, 0.0, 1.0), clamp(warm * bl, 0.0, 1.0), (code + ((code > 0.5 && aussen < 0.5) ? 8.0 : 0.0)) / 16.0, 1.0 - 0.5 * stirn);
}`;

  const FS_ZEICHEN = `#version 300 es
precision highp float;
uniform sampler2D tZ, tAtlas, tWort;
uniform vec2 uRaster, uFlaeche, uZelle;
uniform float uZeit, uAuf, uGrob;
uniform float uRampe[${STUFEN}];
uniform float uKante[7];
uniform vec2 uHerd;
out vec4 o;
const float N = ${STUFEN}.0;
const vec3 LICHT = vec3(0.169, 0.996, 0.353);
const vec3 KERN = vec3(0.839, 1.0, 0.863);
const vec3 TINTE = vec3(0.925, 0.902, 0.855);
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float glyph(float idx, vec2 f){
  vec2 t = vec2(mod(idx, ${SP}.0), floor(idx / ${SP}.0));
  vec2 uv = (t + clamp(f, 0.03, 0.97)) / vec2(${SP}.0, ${ZE}.0);
  return texture(tAtlas, vec2(uv.x, 1.0 - uv.y)).r;
}
void main(){
  vec2 p = vec2(gl_FragCoord.x, uFlaeche.y - gl_FragCoord.y);
  vec2 zc = floor(p / uZelle), f = fract(p / uZelle);
  vec4 c = texelFetch(tZ, ivec2(int(zc.x), int(uRaster.y - 1.0 - zc.y)), 0);
  vec4 w = texelFetch(tWort, ivec2(int(zc.x), int(zc.y)), 0);
  vec2 tuv = vec2(p.x / (uRaster.x * uZelle.x), 1.0 - p.y / (uRaster.y * uZelle.y));
  vec2 e = 1.0 / uRaster;

  /* Auftakt: Günther wird Zeile für Zeile gesetzt */
  float schwelle = (zc.y + zc.x / uRaster.x) / uRaster.y * 0.8 + h21(zc) * 0.14;
  float da = step(schwelle, uAuf);
  float frisch = da * (1.0 - step(schwelle + 0.035, uAuf));
  float daWeich = smoothstep(0.0, 0.12, uAuf - zc.y / uRaster.y * 0.8);

  /* Glühen: weich aus den hellsten Zellen, in zwei Weiten (Zellen sind höher als breit) */
  float nah = 0.0, weit = 0.0;
  for (int k = 0; k < 8; k++) {
    float a = float(k) * 0.7853982;
    vec2 r = vec2(cos(a), sin(a));
    nah += texture(tZ, tuv + r * e * vec2(1.6, 0.95)).r;
    weit += texture(tZ, tuv + r * e * vec2(6.0, 3.5)).r + texture(tZ, tuv + r.yx * e * vec2(12.0, 7.0)).r;
  }
  nah = (nah + texture(tZ, tuv).r) / 9.0;
  weit /= 16.0;
  float gluehen = pow(smoothstep(0.5, 1.0, nah), 1.6) * 0.13 + weit * weit * 0.42 + weit * 0.035;

  /* Raum: warmes Anthrazit, zur Figur hin etwas gehoben */
  vec2 q = gl_FragCoord.xy / uFlaeche;
  float herd = 1.0 - smoothstep(0.0, 0.9, length((q - uHerd) * vec2(uFlaeche.x / uFlaeche.y, 1.0)));
  vec3 raum = mix(vec3(0.052, 0.048, 0.042), vec3(0.112, 0.101, 0.09), herd * herd);
  raum += (h21(gl_FragCoord.xy + 7.0) - 0.5) * 0.008;
  float platte = w.b;
  vec3 farbe = raum + LICHT * gluehen * daWeich * vec3(0.5, 1.0, 0.56);

  float kcode = floor(c.b * 16.0 + 0.5);
  float innen = step(7.5, kcode);
  float kante = kcode - 8.0 * innen;

  if (w.r > 0.0 && da > 0.5) {
    /* Günthers Wörter: setzen sich Zeichen für Zeichen, stehen in Tinte vor seinem Licht */
    float idx = floor(w.r * 255.0 + 0.5) - 1.0;
    if (w.g < 0.5) idx = uRampe[int(6.0 + floor(h21(zc + floor(uZeit * 18.0)) * (N - 6.0)))];
    float g = glyph(idx, f);
    farbe += LICHT * (0.05 + 0.1 * c.r) * w.a;
    farbe = mix(farbe, mix(LICHT, KERN, w.g), clamp(g * w.a * 1.2, 0.0, 1.0));
  } else if (c.a > 0.3 && da > 0.5) {
    float hell = clamp(c.r + c.g * 0.7, 0.0, 1.0);
    /* In den Zeichenbändern (Deckung unter 1) bestimmt die Form das Zeichen, nicht der Zufall */
    float lj = hell + (h21(zc + floor(uZeit * 1.6) * 0.37) - 0.5) * 0.045 * (1.0 - clamp((1.0 - c.a) * 2.0, 0.0, 1.0));
    float idx;
    if (frisch > 0.5) idx = uRampe[int(4.0 + floor(h21(zc + floor(uZeit * 24.0)) * (N - 4.0)))];
    else if (kante > 0.5) idx = uKante[int(kante)];
    else idx = uRampe[int(clamp(floor(pow(clamp(lj, 0.0, 1.0), 0.92) * (N - 1.0) + 0.5), 1.0, N - 1.0))];
    float g = glyph(idx, f);
    /* Farbe nach Lichtart: grünes Licht vom tiefen Grün über das Logo-Grün zum überstrahlten Kern, Raumton in Tinte */
    vec3 gr = mix(vec3(0.03, 0.4, 0.13), LICHT, smoothstep(0.04, 0.5, c.r));
    gr = mix(gr, KERN, smoothstep(0.9, 1.0, c.r) * 0.4);
    vec3 tinte = gr * (0.3 + 0.86 * smoothstep(0.0, 0.8, c.r)) * step(0.004, c.r) + TINTE * (0.2 + 1.25 * c.g) * step(0.004, c.g) * (1.0 - smoothstep(0.1, 0.45, c.r));
    if (kante > 0.5) tinte *= mix(1.05, 0.9, innen);
    tinte = mix(tinte, KERN, frisch * 0.6);
    float daempf = 1.0 - platte * 0.8;
    farbe += LICHT * c.r * c.r * 0.075 * daempf;
    farbe += tinte * g * daempf * mix(1.0, 1.12, uGrob);
  } else if (da > 0.5) {
    /* Luft: wo das Licht streut, stehen einzelne Punkte */
    float r = h21(zc + 3.1);
    if (weit > 0.04 && r > 0.8) {
      float g = glyph(uRampe[r > 0.95 ? 3 : (r > 0.88 ? 2 : 1)], f);
      farbe += LICHT * g * min(weit * 1.3, 0.26) * daWeich;
    }
  }
  o = vec4(farbe, 1.0);
}`;

  function zufall(saat) {
    let a = saat >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* Glyph-Atlas: jedes Zeichen einmal in JetBrains Mono gesetzt; die Rampe wird nach gemessener Deckung sortiert. */
  function atlas(zb) {
    const kb = Math.max(16, Math.min(48, Math.round(zb * 2))), kh = Math.round(kb * HOCH);
    const c = document.createElement("canvas");
    c.width = kb * SP; c.height = kh * ZE;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "alphabetic";
    const em = kb / 0.6;
    const index = new Map();
    ZEICHEN.forEach((z, i) => {
      index.set(z, i);
      const sx = (i % SP) * kb, sy = Math.floor(i / SP) * kh;
      x.save(); x.beginPath(); x.rect(sx, sy, kb, kh); x.clip();
      x.font = `${KANTEN.includes(z) ? 600 : 500} ${em}px "JetBrains Mono", ui-monospace, monospace`;
      /* Grundlinie so, dass die Mittellängen in der Zellenmitte sitzen; der Überstrich rückt in die Zelle */
      x.fillText(z, sx + kb / 2, sy + kh * 0.76 + (z === "¯" ? em * 0.14 : 0));
      x.restore();
    });
    const deckung = (z) => {
      const i = index.get(z), d = x.getImageData((i % SP) * kb, Math.floor(i / SP) * kh, kb, kh).data;
      let s = 0; for (let k = 0; k < d.length; k += 4) s += d[k];
      return s / (d.length / 4) / 255;
    };
    const rampe = [...new Set(RAMPE.split(""))].map((z) => ({ z, d: deckung(z) })).sort((a, b) => a.d - b.d);
    /* Stufen gleichmässig über die Deckung verteilt */
    const stufen = [rampe[0]];
    const max = rampe[rampe.length - 1].d;
    for (let s = 1; s < STUFEN; s++) {
      const ziel = (s / (STUFEN - 1)) * max;
      stufen.push(rampe.slice(1).reduce((b, r) => (Math.abs(r.d - ziel) < Math.abs(b.d - ziel) ? r : b)));
    }
    const tex = new T.CanvasTexture(c);
    tex.minFilter = T.LinearMipmapLinearFilter; tex.magFilter = T.LinearFilter; tex.generateMipmaps = true;
    tex.anisotropy = 4;
    return { tex, index, rampe: stufen.map((r) => index.get(r.z)), kanten: [0, ...KANTEN.split("").map((z) => index.get(z))] };
  }

  /* Modell: über http(s) als glb geladen, über file:// aus dem beigelegten Skript (fetch ist dort gesperrt). */
  function ladeModell(basis) {
    const lese = (buf) => new Promise((ok, nein) => {
      const l = new T.GLTFLoader();
      l.setMeshoptDecoder(T.MeshoptDecoder);
      l.parse(buf, "", (g) => {
        let netz = null;
        g.scene.updateMatrixWorld(true);
        g.scene.traverse((o) => { if (o.isMesh && !netz) netz = o; });
        if (!netz) return nein(new Error("kein Netz"));
        /* Quantisierung auflösen: der Vertex-Shader rechnet in echten Einheiten */
        const src = netz.geometry, n = src.attributes.position.count;
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
        const v = new T.Vector3(), nm = new T.Matrix3().getNormalMatrix(netz.matrixWorld);
        for (let i = 0; i < n; i++) {
          v.fromBufferAttribute(src.attributes.position, i).applyMatrix4(netz.matrixWorld); pos.set([v.x, v.y, v.z], i * 3);
          v.fromBufferAttribute(src.attributes.normal, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], i * 3);
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute("position", new T.BufferAttribute(pos, 3));
        geo.setAttribute("normal", new T.BufferAttribute(nor, 3));
        geo.setIndex(src.index);
        ok(geo);
      }, nein);
    });
    if (location.protocol === "file:") {
      return new Promise((ok, nein) => {
        const s = document.createElement("script");
        s.src = basis + "modelle/bueste.glb.js";
        s.onload = () => {
          const b = atob(window.GUENTHER_GLB), u = new Uint8Array(b.length);
          for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
          window.GUENTHER_GLB = null;
          lese(u.buffer).then(ok, nein);
        };
        s.onerror = () => nein(new Error("Modell fehlt"));
        document.head.appendChild(s);
      });
    }
    return fetch(basis + "modelle/bueste.glb").then((r) => { if (!r.ok) throw new Error("Modell fehlt"); return r.arrayBuffer(); }).then(lese);
  }

  function start(opt) {
    const canvas = opt.canvas, buehne = canvas.parentElement;
    const scheitert = (grund) => { buehne.classList.add("ohne-webgl"); if (opt.fehler) opt.fehler(grund); };
    if (!T) { scheitert("three"); return null; }
    let renderer;
    try {
      const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: true, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: !!opt.haltbar });
      if (!gl) throw new Error("kein WebGL 2");
      renderer = new T.WebGLRenderer({ canvas, context: gl });
    } catch (e) { scheitert("webgl"); return null; }
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);

    const szene = new T.Scene(), flaeche = new T.Scene();
    const kamera = new T.PerspectiveCamera(20, 1, 1, 40);
    const ABSTAND = 8;
    kamera.position.set(0, 0, ABSTAND);
    const ruhe = new T.Camera();
    const U = {
      uKopf: { value: new T.Vector2() }, uAtem: { value: 0 }, uTiefe: { value: new T.Vector2(ABSTAND - 2, ABSTAND + 2) },
      tG: { value: null }, tZ: { value: null }, tAtlas: { value: null }, tWort: { value: null },
      uRaster: { value: new T.Vector2() }, uFlaeche: { value: new T.Vector2() }, uZelle: { value: new T.Vector2() },
      uL1: { value: new T.Vector3() }, uL2: { value: new T.Vector3() }, uMass: { value: new T.Vector3() },
      uBlende: { value: new T.Vector4(-2, -1, 2, 3) }, uOben: { value: new T.Vector2(-2, -1) }, uBraue: { value: new T.Vector2(-2, -1) }, uHell: { value: 1 }, uFalte: { value: 1.25 },
      uZeit: { value: 0 }, uAuf: { value: 1 }, uRampe: { value: new Array(STUFEN).fill(0) }, uKante: { value: new Array(7).fill(0) },
      uHerd: { value: new T.Vector2(0.7, 0.55) }, uGrob: { value: 0 },
    };
    const roh = (vs, fs, mehr) => new T.RawShaderMaterial(Object.assign({ vertexShader: vs.replace("#version 300 es\n", ""), fragmentShader: fs.replace("#version 300 es\n", ""), uniforms: U, glslVersion: T.GLSL3, depthTest: false, depthWrite: false }, mehr));
    const mGeo = roh(VS_GEO, FS_GEO, { depthTest: true, depthWrite: true, side: T.DoubleSide });
    const mZellen = roh(VS_FLAECHE, FS_ZELLEN), mZeichen = roh(VS_FLAECHE, FS_ZEICHEN);
    const blatt = new T.Mesh(new T.PlaneGeometry(2, 2), mZellen);
    blatt.frustumCulled = false;
    flaeche.add(blatt);
    const figur = new T.Group();
    szene.add(figur);

    let gZiel = null, zZiel = null, wortTex = null, wortDaten = null, lesePuffer = null, glyphen = null;
    let B = 0, H = 0, dpr = 1, sp = 0, ze = 0, zb = 0, zh = 0;
    let bereit = false, sichtbar = true, rahmen = 0, zerstoert = false;
    const sprache = opt.sprache === "en" ? "en" : "de";
    const liste = WOERTER.alle.concat(WOERTER[sprache]);
    const rnd = zufall(opt.saat || 115);
    let woerter = [], naechstesWort = 0, wortFolge = [];
    const zeiger = { x: 0.5, y: 0.45, aktiv: false, neig: null };
    const ist = { gier: null, nick: 0, kg: 0, kn: 0, x: 0, y: 0, h: 0 };
    let start0 = 0, letzte = 0, sprung = false;

    function masse() {
      const r = buehne.getBoundingClientRect();
      const p = opt.pose(0);
      B = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      zb = Math.max(4, Math.round(p.zelle * dpr)); zh = Math.round(zb * HOCH);
      const pb = Math.round(B * dpr), ph = Math.round(H * dpr);
      renderer.setPixelRatio(1);
      renderer.setSize(pb, ph, false);
      sp = Math.ceil(pb / zb); ze = Math.ceil(ph / zh);
      [gZiel, zZiel].forEach((z) => z && z.dispose());
      if (wortTex) wortTex.dispose();
      if (glyphen) glyphen.tex.dispose();
      /* Geometrieziel: gut drei Bildpunkte je Zelle in der Breite, fünf in der Höhe */
      const teil = Math.max(1, zb / 3.2);
      gZiel = new T.WebGLRenderTarget(Math.max(2, Math.round(pb / teil)), Math.max(2, Math.round(ph / teil)), { minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true, type: T.UnsignedByteType });
      zZiel = new T.WebGLRenderTarget(sp, ze, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false, type: T.UnsignedByteType });
      wortDaten = new Uint8Array(sp * ze * 4);
      wortTex = new T.DataTexture(wortDaten, sp, ze, T.RGBAFormat, T.UnsignedByteType);
      wortTex.minFilter = wortTex.magFilter = T.NearestFilter;
      wortTex.needsUpdate = true;
      lesePuffer = new Uint8Array(sp * ze * 4);
      glyphen = atlas(zb);
      U.tG.value = gZiel.texture; U.tZ.value = zZiel.texture; U.tAtlas.value = glyphen.tex; U.tWort.value = wortTex;
      U.uRaster.value.set(sp, ze); U.uFlaeche.value.set(pb, ph); U.uZelle.value.set(zb, zh);
      U.uRampe.value = glyphen.rampe; U.uKante.value = glyphen.kanten;
      U.uGrob.value = p.zelle > 9 ? 1 : 0;
      kamera.aspect = B / H;
      woerter = [];
      ist.gier = null;
    }

    function stelle(p, dt, zeit) {
      /* Zeiger: Kopf und Blick folgen gedämpft, der Rumpf weniger */
      const folgt = opt.still ? 0 : 1;
      let zx = 0, zy = 0;
      if (zeiger.neig) { zx = zeiger.neig.x; zy = zeiger.neig.y; }
      else if (zeiger.aktiv) { zx = (zeiger.x - p.x / B) * 1.1; zy = (zeiger.y - (p.y - p.h * 0.3) / H) * 0.9; }
      zx = Math.max(-0.6, Math.min(0.6, zx)) * folgt; zy = Math.max(-0.5, Math.min(0.5, zy)) * folgt;
      const ruh = opt.still ? 0 : 1;
      const ziel = {
        gier: p.gier + zx * 0.16,
        nick: (p.nick || 0) + zy * 0.05,
        kg: (p.kopfGier || 0) + zx * 0.62 + Math.sin(zeit * 0.23) * 0.035 * ruh,
        kn: (p.kopfNick || 0) + zy * 0.36 + Math.sin(zeit * 0.31 + 1.3) * 0.018 * ruh,
        x: p.x, y: p.y, h: p.h,
      };
      const k = ist.gier === null || opt.still ? 1 : 1 - Math.exp(-dt * 3.2);
      const kl = ist.gier === null || opt.still ? 1 : 1 - Math.exp(-dt * 9);
      if (ist.gier === null) Object.assign(ist, ziel);
      ist.gier += (ziel.gier - ist.gier) * kl; ist.nick += (ziel.nick - ist.nick) * k;
      ist.kg += (ziel.kg - ist.kg) * k; ist.kn += (ziel.kn - ist.kn) * k;
      ist.x += (ziel.x - ist.x) * kl; ist.y += (ziel.y - ist.y) * kl; ist.h += (ziel.h - ist.h) * kl;

      const sicht = 2 * ABSTAND * Math.tan((kamera.fov * Math.PI) / 360);
      const s = (ist.h * sicht) / H;
      figur.scale.setScalar(s);
      figur.rotation.set(ist.nick, ist.gier, 0);
      kamera.setViewOffset(B, H, B / 2 - ist.x, H / 2 - ist.y, B, H);
      U.uKopf.value.set(ist.kg, ist.kn);
      U.uAtem.value = opt.still ? 0.4 : 0.5 + 0.5 * Math.sin(zeit * 1.15);
      U.uTiefe.value.set(ABSTAND - 1.7 * s, ABSTAND + 1.7 * s);
      /* Seitenlicht: von der Textseite, fast quer zum Blick der Kamera; wandert kaum merklich.
         Randlicht: von hinten auf der Gegenseite. */
      const lw = (p.licht === undefined ? -0.55 : p.licht) + Math.sin(zeit * 0.17) * 0.05 * ruh;
      const lh = p.lichtHoch === undefined ? 0.2 : p.lichtHoch;
      U.uL1.value.set(Math.sin(lw), lh, Math.cos(lw)).normalize();
      U.uL2.value.set(lw < 0 ? 0.8 : -0.8, 0.22, -0.56).normalize();
      U.uMass.value.set(ist.h / B, ist.h / H, 1 / 3.4);
      U.uFalte.value = p.falte === undefined ? 1.25 : p.falte;
      const bl = p.blende || {};
      const l = bl.links || [-2, -1], u = bl.unten || [H * 2, H * 3];
      U.uBlende.value.set(l[0] / B, l[1] / B, u[0] / H, u[1] / H);
      const ob = bl.oben || [-2 * H, -H];
      U.uOben.value.set(ob[0] / H, ob[1] / H);
      /* Brauenband: Höhe über dem Ursprung der Figur, in Figurhöhen */
      if (p.braue) U.uBraue.value.set((ist.y - p.braue[1] * ist.h) / H, (ist.y - p.braue[0] * ist.h) / H);
      else U.uBraue.value.set(-2, -1);
      U.uHell.value = p.hell === undefined ? 1 : p.hell;
      U.uHerd.value.set(ist.x / B, 1 - (ist.y - ist.h * 0.25) / H);
    }

    /* Wörter: in einer Lichtzone eine freie Zeile suchen und das Wort dort setzen */
    function sucheWort(zeit, fertig) {
      renderer.readRenderTargetPixels(zZiel, 0, 0, sp, ze, lesePuffer);
      const belegt = (i, j) => woerter.some((w) => Math.abs(w.j - j) <= 12 && i >= w.i - 30 && i <= w.i + w.text.length + 30);
      if (!wortFolge.length) { wortFolge = liste.slice(); for (let i = wortFolge.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [wortFolge[i], wortFolge[j]] = [wortFolge[j], wortFolge[i]]; } }
      for (let versuch = 0; versuch < 6 && wortFolge.length; versuch++) {
        const text = wortFolge.pop(), n = text.length + 4;
        const kand = [];
        for (let jb = 0; jb < ze; jb++) {
          const j = ze - 1 - jb;
          if (((j + 0.5) * zh) / dpr < ist.y + ist.h * 0.44) continue;   /* nie im Gesicht: nur Brust und Schulter */
          let lauf = 0, summe = 0;
          for (let i = 0; i < sp; i++) {
            const k = (jb * sp + i) * 4;
            const gut = lesePuffer[k] > 70 && lesePuffer[k + 2] < 8 && lesePuffer[k + 3] > 200;
            if (gut) { lauf++; summe += lesePuffer[k]; } else { lauf = 0; summe = 0; }
            if (lauf >= n && !belegt(i - n + 1, j)) kand.push({ i: i - n + 3, j, hell: summe / lauf });
          }
        }
        if (!kand.length) continue;
        kand.sort((a, b) => b.hell - a.hell);
        const w = kand[(rnd() * Math.min(kand.length, 14)) | 0];
        woerter.push({ text, i: w.i, j: w.j, t0: fertig ? zeit - 1.5 : zeit, dauer: 4.4 + rnd() * 1.4 });
        return true;
      }
      return false;
    }
    function schreibeWoerter(zeit) {
      wortDaten.fill(0);
      woerter = woerter.filter((w) => zeit - w.t0 < w.dauer + 0.8);
      for (const w of woerter) {
        const t = zeit - w.t0, n = w.text.length;
        for (let k = 0; k < n; k++) {
          const i = w.i + k;
          if (i < 0 || i >= sp) continue;
          const kk = Math.max(0, k);
          const ein = Math.min(1, Math.max(0, (t - kk * 0.045) / 0.22));
          const aus = Math.min(1, Math.max(0, 1 - (t - w.dauer - kk * 0.03) / 0.4));
          const a = ein * aus;
          for (let dj = -1; dj <= 1; dj++) {
            const j = w.j + dj;
            if (j < 0 || j >= ze) continue;
            const q = (j * sp + i) * 4;
            if (dj === 0) {
              const z = k < 0 || k >= n ? " " : w.text[k];
              const fest = t > 0.3 + Math.max(0, k) * 0.07;
              wortDaten[q] = glyphen.index.get(z) + 1;
              wortDaten[q + 1] = fest ? 255 : 0;
              wortDaten[q + 3] = Math.round(a * 255);
              wortDaten[q + 2] = Math.round(a * 255);
            } else if (wortDaten[q] === 0) {
              wortDaten[q + 2] = Math.max(wortDaten[q + 2], Math.round(a * 110));
            }
          }
        }
      }
      wortTex.needsUpdate = true;
    }

    function bild(jetzt) {
      rahmen = 0;
      if (!bereit || zerstoert) return;
      const zeit = opt.still ? 0 : (jetzt - start0) / 1000;
      const dt = Math.min(0.1, Math.max(0.001, (jetzt - letzte) / 1000));
      letzte = jetzt;
      const p = opt.pose(zeit);
      stelle(p, dt, zeit);
      const auf = opt.auftakt === undefined || opt.auftakt === null ? (opt.still || sprung ? 1 : Math.min(1, zeit / 1.9)) : opt.auftakt;
      U.uAuf.value = auf >= 1 ? 2 : auf;
      U.uZeit.value = opt.still ? 3.7 : zeit;

      renderer.setRenderTarget(gZiel); renderer.clear(); renderer.render(szene, kamera);
      blatt.material = mZellen;
      renderer.setRenderTarget(zZiel); renderer.clear(); renderer.render(flaeche, ruhe);

      const hoechstens = opt.woerter === undefined ? (opt.schmal && opt.schmal() ? 1 : 2) : opt.woerter;
      if (opt.still) {
        if (!woerter.length && auf >= 1) for (let k = 0; k < hoechstens; k++) sucheWort(0, true);
        schreibeWoerter(0);
      } else {
        if (auf >= 1 && zeit > naechstesWort && woerter.length < hoechstens) {
          sucheWort(zeit, false);
          naechstesWort = zeit + 2.4 + rnd() * 1.8;
        }
        schreibeWoerter(zeit);
      }
      blatt.material = mZeichen;
      renderer.setRenderTarget(null); renderer.render(flaeche, ruhe);
      if (!buehne.classList.contains("ist-bereit")) { buehne.classList.add("ist-bereit"); if (opt.bereit) opt.bereit(); }
      if (!opt.still && sichtbar && !document.hidden) rahmen = requestAnimationFrame(bild);
    }
    const los = () => { if (!rahmen && bereit && !zerstoert) { letzte = performance.now(); rahmen = requestAnimationFrame(bild); } };

    addEventListener("pointermove", (e) => { zeiger.x = e.clientX / innerWidth; zeiger.y = e.clientY / innerHeight; zeiger.aktiv = true; }, { passive: true });
    document.addEventListener("pointerleave", () => { zeiger.aktiv = false; });
    addEventListener("pointerup", (e) => { if (e.pointerType === "touch") zeiger.aktiv = false; }, { passive: true });
    /* Telefon: Neigung, wo sie ohne Rückfrage verfügbar ist; sonst Scroll und Berührung */
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== "function") {
      addEventListener("deviceorientation", (e) => {
        if (e.gamma === null || e.beta === null) return;
        zeiger.neig = { x: Math.max(-1, Math.min(1, e.gamma / 28)) * 0.5, y: Math.max(-1, Math.min(1, (e.beta - 48) / 30)) * 0.4 };
      }, { passive: true });
    }
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach((n) => addEventListener(n, () => { sprung = true; }, { passive: true, once: true }));
    let warte = 0;
    addEventListener("resize", () => { clearTimeout(warte); warte = setTimeout(() => { if (bereit) { masse(); los(); } }, 140); });
    addEventListener("scroll", () => { if (opt.still) los(); }, { passive: true });
    document.addEventListener("visibilitychange", los);
    new IntersectionObserver(([e]) => { sichtbar = e.isIntersecting; if (sichtbar) los(); }).observe(buehne);
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); bereit = false; scheitert("verloren"); });

    const schrift = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('500 16px "JetBrains Mono"'), document.fonts.load('600 16px "JetBrains Mono"')]).catch(() => 0) : Promise.resolve();
    Promise.all([ladeModell(opt.basis || ""), schrift]).then(([geo]) => {
      figur.add(new T.Mesh(geo, mGeo));
      figur.children[0].frustumCulled = false;
      masse();
      bereit = true;
      start0 = letzte = performance.now();
      naechstesWort = 3.2;
      los();
    }).catch((e) => scheitert(String(e && e.message || e)));

    return { neu: () => { if (bereit) { masse(); los(); } }, los, get bereit() { return bereit; }, set(k, v) { opt[k] = v; los(); } };
  }

  window.Bueste = { start };
})();
