const messages = {
  de: {
    invalid: 'Ungültiger Download-Link', expired: 'Dieser Link ist abgelaufen', limit: 'Download-Limit erreicht',
    help: 'Bitte nutze den Link aus deiner Bestell-E-Mail. Wenn du Hilfe brauchst, schreib uns an',
    back: 'Zurück zur Prüfung', href: '/audit/',
  },
  en: {
    invalid: 'Invalid download link', expired: 'This link has expired', limit: 'Download limit reached',
    help: 'Please use the link in your order email. If you need help, contact us at',
    back: 'Back to the audit', href: '/en/audit/',
  },
};

export function downloadErrorPage(reason: 'invalid' | 'expired' | 'limit', lang?: 'de' | 'en'): string {
  const languages = lang ? [lang] : ['de', 'en'] as const;
  const sections = languages.map(language => {
    const copy = messages[language];
    return `<section lang="${language}"><h1>${copy[reason]}</h1><p>${copy.help}
      <a href="mailto:labs@0xguenther.org">labs@0xguenther.org</a>.</p>
      <a class="back" href="${copy.href}">${copy.back}</a></section>`;
  }).join('');
  return `<!DOCTYPE html>
<html lang="${lang ?? 'de'}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${messages[lang ?? 'de'][reason]} · Agent-Check Audit</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #05070b;
  color: #e2e8f0; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; }
main { width: 100%; max-width: 36rem; padding: 3rem 1.5rem; text-align: center; overflow-wrap: anywhere; }
section + section { margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid #1e293b; }
h1 { color: #fff; font-size: clamp(1.5rem, 5vw, 2rem); letter-spacing: -.02em; }
p { color: #94a3b8; line-height: 1.7; margin: 1.5rem 0; }
a { color: #00ff66; text-underline-offset: .2em; }
a:hover { color: #e2e8f0; }
a:focus-visible { outline: 2px solid #00ff66; outline-offset: 5px; }
.back { display: inline-block; padding: .75rem; }
::selection { background: #00ff66; color: #05070b; }
</style></head><body><main>${sections}</main></body></html>`;
}
