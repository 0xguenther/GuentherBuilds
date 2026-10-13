const { chromium } = await import('playwright-core');
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const pages = ctx.pages();
console.log('Tabs:', pages.length);
for (const p of pages) console.log(' -', p.url().slice(0, 80), '|', (await p.title()).slice(0, 50));

// Check Reddit login
let page = pages.find(p => p.url().includes('reddit'));
if (!page) {
  page = await ctx.newPage();
  await page.goto('https://www.reddit.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
}
console.log('Reddit URL:', page.url());
const state = await page.evaluate(() => {
  const userLink = document.querySelector('a[href*="/user/"]')?.href || 'none';
  const headerText = document.querySelector('header')?.textContent?.slice(0, 100) || 'none';
  return { userLink, headerText, hasLogIn: document.body.innerText.includes('Log In') };
});
console.log('State:', JSON.stringify(state));

// Test API
const apiResult = await page.evaluate(async () => {
  const csrf = document.cookie.split(';').find(c => c.trim().startsWith('csrf_token='))?.split('=')[1];
  const meRes = await fetch('/api/me.json', {
    credentials: 'include',
    headers: { 'x-csrftoken': csrf || '', 'X-Requested-With': 'XMLHttpRequest' }
  });
  const meData = await meRes.json();
  return { name: meData.data?.name || 'NONE', modhash: (meData.data?.modhash || 'NONE').slice(0, 15) };
});
console.log('API:', JSON.stringify(apiResult));
await b.close();
