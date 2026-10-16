#!/usr/bin/env node
/**
 * Günther Reddit Browser Poster
 *
 * Uses cookies from a running Brave browser (via CDP) to make Reddit API calls.
 * No separate Reddit API credentials needed — just the browser session.
 *
 * Usage:
 *   BRAVE_CDP_PORT=9222 PORT=9333 BROWSER_POSTER_TOKEN=secret node server.mjs
 */

import http from 'node:http';
import { execFile } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = parseInt(process.env.PORT || '9333', 10);
const CDP_PORT = parseInt(process.env.BRAVE_CDP_PORT || '9222', 10);
const CDP_HOST = process.env.BRAVE_CDP_HOST || '127.0.0.1';
const AUTH_TOKEN = process.env.BROWSER_POSTER_TOKEN || '';
// Self-healing: restart Brave when the CDP port is dead. Empty string disables it.
const RESTART_CMD = process.env.BRAVE_RESTART_CMD ?? 'systemctl --user restart brave-cdp.service';
const RESTART_COOLDOWN_MS = 120_000;
const RESTART_WAIT_MS = 30_000;

let browser = null;
let context = null;
let connecting = null;
let cachedCookies = null;
let cookiesFetchedAt = 0;
let braveRestarts = 0;
let lastBraveRestartAt = 0;

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

async function cdpAlive() {
  try {
    const res = await fetch(`http://${CDP_HOST}:${CDP_PORT}/json/version`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Restarts Brave only if CDP is really unreachable, at most once per cooldown. */
async function restartBraveIfDead() {
  if (!RESTART_CMD || await cdpAlive()) return;
  if (Date.now() - lastBraveRestartAt < RESTART_COOLDOWN_MS) return;
  lastBraveRestartAt = Date.now();
  braveRestarts++;
  const [cmd, ...args] = RESTART_CMD.split(/\s+/);
  console.warn(`[BrowserPoster] CDP ${CDP_HOST}:${CDP_PORT} unreachable -> ${RESTART_CMD}`);
  await new Promise(resolve => execFile(cmd, args, { timeout: 20_000 }, err => {
    if (err) console.error('[BrowserPoster] Brave restart failed:', err.message);
    resolve();
  }));
  const deadline = Date.now() + RESTART_WAIT_MS;
  while (Date.now() < deadline) {
    if (await cdpAlive()) return;
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function connectBrowser() {
  const cdpUrl = `http://${CDP_HOST}:${CDP_PORT}`;
  const b = await chromium.connectOverCDP(cdpUrl, { timeout: 5000 });
  b.on('disconnected', () => {
    if (browser === b) { browser = null; context = null; cachedCookies = null; }
    console.warn('[BrowserPoster] Brave disconnected');
  });
  browser = b;
  context = b.contexts()[0] || await b.newContext();
  console.log(`[BrowserPoster] Connected to Brave at ${cdpUrl}`);
}

async function ensureBrowser() {
  // A dying Brave keeps its websocket open for a moment, so the CDP port must answer as well.
  if (browser && browser.isConnected() && await cdpAlive()) return;
  // Parallel requests share one connect/restart attempt.
  connecting ??= (async () => {
    browser = null; context = null; cachedCookies = null;
    try {
      try {
        await connectBrowser();
      } catch (firstErr) {
        await restartBraveIfDead();
        await connectBrowser().catch(() => { throw firstErr; });
      }
    } catch (err) {
      throw httpError(503, `Browser unavailable: ${err.message.split('\n')[0]}`);
    } finally {
      connecting = null;
    }
  })();
  await connecting;
}

async function getRedditCookies(force = false) {
  if (!force && cachedCookies && Date.now() - cookiesFetchedAt < 60_000) return cachedCookies;
  await ensureBrowser();
  const cookies = await context.cookies('https://www.reddit.com');
  const cookieMap = {};
  for (const c of cookies) {
    if (c.domain.includes('reddit')) cookieMap[c.name] = c.value;
  }
  if (!cookieMap.token_v2) throw new Error('No token_v2 cookie — Reddit session not found in Brave. Log in manually.');
  cachedCookies = cookieMap;
  cookiesFetchedAt = Date.now();
  return cookieMap;
}

function cookieHeader(map) {
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function getModhash() {
  const cookies = await getRedditCookies();
  const res = await fetch('https://www.reddit.com/api/me.json', {
    headers: {
      'Cookie': cookieHeader(cookies),
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json();
  return json?.data?.modhash || '';
}

async function redditApi(path, form) {
  const cookies = await getRedditCookies();
  const headers = {
    'Cookie': cookieHeader(cookies),
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (cookies.csrf_token) headers['X-CSRF-Token'] = cookies.csrf_token;
  if (form) headers['Content-Type'] = 'application/x-www-form-urlencoded';

  const res = await fetch(`https://www.reddit.com${path}`, {
    method: form ? 'POST' : 'GET',
    headers,
    body: form ? new URLSearchParams(form).toString() : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }

  if (!res.ok) {
    throw new Error(`Reddit API ${res.status}: ${text.slice(0, 300)}`);
  }
  return json || text;
}

/** Finds an open reddit.com tab or opens one; in-page fetches carry the real session. */
async function getRedditPage() {
  await ensureBrowser();
  let page = context.pages().find(p => !p.isClosed() && p.url().includes('reddit.com'));
  if (!page) {
    page = await context.newPage();
    await page.goto('https://www.reddit.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
  }
  return page;
}

// Read-only listings Günther needs: subreddit new/hot/top/search and own profile.
const LISTING_PATH = /^\/(r\/[A-Za-z0-9_]{1,40}\/(new|hot|top|search)|user\/[A-Za-z0-9_-]{1,40}\/(overview|submitted|comments))(\?[A-Za-z0-9_=&%.+-]{0,300})?$/;

async function redditListing(path) {
  if (typeof path !== 'string' || !LISTING_PATH.test(path)) throw httpError(400, 'listing path not allowed');
  const [base, query] = path.split('?');
  const url = `https://www.reddit.com${base}.json${query ? `?${query}` : ''}`;
  const page = await getRedditPage();
  const res = await page.evaluate(async (target) => {
    const r = await fetch(target, { credentials: 'include', headers: { Accept: 'application/json' } });
    return { status: r.status, text: await r.text() };
  }, url);
  if (res.status !== 200) throw httpError(502, `Reddit listing HTTP ${res.status}`);
  try { return JSON.parse(res.text); } catch { throw httpError(502, 'Reddit listing returned no JSON'); }
}

async function submitComment({ thingId, text }) {
  if (!/^t[13]_[a-z0-9]{1,12}$/.test(thingId || '')) throw httpError(400, 'thingId must be t1_/t3_ fullname');
  if (typeof text !== 'string' || !text.trim() || text.length > 10_000) throw httpError(400, 'text required (max 10000 chars)');
  const page = await getRedditPage();
  const result = await page.evaluate(async ({ thingId, text }) => {
    let uh = '';
    try {
      const me = await (await fetch('https://www.reddit.com/api/me.json', { credentials: 'include' })).json();
      uh = me?.data?.modhash || '';
    } catch { /* modhash is optional with cookie sessions */ }
    const form = new URLSearchParams({ api_type: 'json', thing_id: thingId, text });
    if (uh) form.set('uh', uh);
    const res = await fetch('https://www.reddit.com/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', ...(uh ? { 'X-Modhash': uh } : {}) },
      body: form.toString(),
      credentials: 'include',
    });
    const body = await res.text();
    try { return JSON.parse(body); } catch { return { raw: body.slice(0, 300), status: res.status }; }
  }, { thingId, text });

  const errors = result?.json?.errors;
  if (errors && errors.length > 0) throw new Error(`Reddit rejected: ${JSON.stringify(errors)}`);
  const thing = result?.json?.data?.things?.[0]?.data;
  // The legacy endpoint answers with an HTML fragment (`thing id-t1_xxx`) and no `name` field.
  const id = thing?.name || thing?.id || String(thing?.content ?? '').match(/id-(t1_[a-z0-9]+)/)?.[1];
  if (!id) throw new Error(`Reddit comment outcome unknown: ${JSON.stringify(result).slice(0, 200)}`);
  console.log(`[BrowserPoster] Commented on ${thingId}: ${id}`);
  return { redditId: id, thingId, createdAt: new Date().toISOString() };
}

async function submitPost(params) {
  const { subreddit, title, body, url: linkUrl } = params;
  const cleanSub = (subreddit || '').replace(/^r\//, '').trim();

  const page = await getRedditPage();

  // Make the API call from within the browser (proper cookies, origin, headers)
  const result = await page.evaluate(async ({ subreddit, title, body, linkUrl }) => {
    const form = new URLSearchParams({
      api_type: 'json',
      sr: subreddit,
      kind: linkUrl ? 'link' : 'self',
      title,
      resubmit: 'true',
      sendreplies: 'true',
    });
    if (body) form.set('text', body);
    if (linkUrl) form.set('url', linkUrl);

    const res = await fetch('https://www.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: form.toString(),
      credentials: 'include',
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { raw: text.slice(0, 300), status: res.status }; }
  }, { subreddit: cleanSub, title, body, linkUrl });

  const errors = result?.json?.errors;
  if (errors && errors.length > 0) {
    throw new Error(`Reddit rejected: ${JSON.stringify(errors)}`);
  }

  const data = result?.json?.data;
  const redditId = data?.id || data?.name || `browser_${Date.now()}`;
  const url = data?.url || `https://www.reddit.com/r/${cleanSub}/comments/${redditId}`;

  console.log(`[BrowserPoster] Posted to r/${cleanSub}: ${url}`);
  return {
    redditId,
    url,
    title,
    subreddit: cleanSub,
    createdAt: new Date().toISOString(),
  };
}

async function getAccountInfo() {
  const page = await getRedditPage();
  const me = await page.evaluate(async () => {
    const r = await fetch('https://www.reddit.com/api/me.json', { credentials: 'include', headers: { Accept: 'application/json' } });
    return { status: r.status, text: await r.text() };
  });
  let result = null;
  try { result = JSON.parse(me.text)?.data; } catch { /* handled below */ }
  if (me.status !== 200 || !result?.name) throw httpError(502, `Reddit account lookup failed (HTTP ${me.status}); session logged out?`);
  const createdUtc = Number(result.created_utc) || Math.floor(Date.now() / 1000);
  return {
    username: result.name,
    linkKarma: result.link_karma || 0,
    commentKarma: result.comment_karma || 0,
    totalKarma: (result.link_karma || 0) + (result.comment_karma || 0),
    createdUtc,
    accountAgeDays: Math.max(0, Math.floor((Date.now() / 1000 - createdUtc) / 86400)),
    isSimulated: false,
    method: 'browser-session',
  };
}

// ── Hacker News ──

async function getHnCookies() {
  await ensureBrowser();
  const cookies = await context.cookies('https://news.ycombinator.com');
  const map = {};
  for (const c of cookies) {
    if (c.domain.includes('ycombinator') || c.domain.includes('hacker')) map[c.name] = c.value;
  }
  return map;
}

async function getHnPage() {
  await ensureBrowser();
  const pages = context.pages();
  let page = pages.find(p => p.url().includes('ycombinator.com') || p.url().includes('news.ycombinator'));
  if (!page) {
    page = await context.newPage();
    await page.goto('https://news.ycombinator.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
  }
  return page;
}

async function submitHnPost(params) {
  const { title, url: linkUrl, text } = params;
  if (!title) throw new Error('title required');
  if (!linkUrl && !text) throw new Error('url or text required');

  const page = await getHnPage();

  // Navigate to submit page and extract form tokens
  await page.goto('https://news.ycombinator.com/submit', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1500);

  const result = await page.evaluate(async ({ title, linkUrl, text }) => {
    // Extract fnid and fnop from the submit form
    const form = document.querySelector('form');
    if (!form) return { error: 'No submit form found — may not be logged in' };

    const fnid = form.querySelector('input[name="fnid"]')?.value || '';
    const fnop = form.querySelector('input[name="fnop"]')?.value || '';
    if (!fnid) return { error: 'No fnid token found — may not be logged in' };

    const body = new URLSearchParams({
      fnid,
      fnop: fnop || 'submit-page',
      title,
    });
    if (linkUrl) {
      body.set('url', linkUrl);
    } else {
      body.set('text', text || '');
    }

    const res = await fetch('https://news.ycombinator.com/r', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      credentials: 'include',
      redirect: 'follow',
    });

    const html = await res.text();
    // HN returns the new item page on success, or the submit form again on error
    const idMatch = html.match(/item\?id=(\d+)/);
    const errorMatch = html.match(/class="error"[^>]*>(.*?)</s);
    return {
      status: res.status,
      id: idMatch ? idMatch[1] : null,
      error: errorMatch ? errorMatch[1].trim() : null,
      url: idMatch ? `https://news.ycombinator.com/item?id=${idMatch[1]}` : null,
    };
  }, { title, linkUrl, text });

  if (result.error) {
    throw new Error(`HN rejected: ${result.error}`);
  }
  if (!result.id) {
    throw new Error(`HN submit failed (HTTP ${result.status}): no item ID in response`);
  }

  console.log(`[BrowserPoster] Posted to HN: ${result.url}`);
  return {
    hnId: result.id,
    url: result.url,
    title,
    createdAt: new Date().toISOString(),
  };
}

async function getHnAccountInfo() {
  const page = await getHnPage();
  await page.goto('https://news.ycombinator.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);

  return page.evaluate(() => {
    // Check for logged-in user in top bar
    const userLink = document.querySelector('#me a') || document.querySelector('a[href*="user?id="]');
    const username = userLink?.textContent?.trim() || null;
    const loggedIn = !!username && username !== 'login';
    return {
      username: username || 'anonymous',
      loggedIn,
      method: 'browser-session',
    };
  });
}

// ── HTTP Server ──

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function checkAuth(req) {
  if (!AUTH_TOKEN) return true;
  return (req.headers['authorization'] || '') === `Bearer ${AUTH_TOKEN}`;
}

const server = http.createServer(async (req, res) => {
  const json = (code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  if (!checkAuth(req)) return json(401, { error: 'Unauthorized' });

  try {
    const reqUrl = new URL(req.url, 'http://poster.local');

    // 200 = browser reachable (sessions may be degraded), 503 = browser down.
    if (req.method === 'GET' && reqUrl.pathname === '/health') {
      let browserOk = false;
      let redditOk = false;
      let hnOk = false;
      let error = null;
      try { await ensureBrowser(); browserOk = true; } catch (err) { error = err.message; }
      if (browserOk) {
        try { redditOk = !!(await getRedditCookies()).token_v2; } catch { /* reported as redditSession:false */ }
        try { hnOk = !!(await getHnCookies()).user; } catch { /* reported as hnSession:false */ }
      }
      return json(browserOk ? 200 : 503, {
        status: !browserOk ? 'down' : (redditOk && hnOk ? 'ok' : 'degraded'),
        browserConnected: browserOk,
        redditSession: redditOk,
        hnSession: hnOk,
        cdpPort: CDP_PORT,
        braveRestarts,
        lastBraveRestartAt: lastBraveRestartAt ? new Date(lastBraveRestartAt).toISOString() : null,
        error,
      });
    }

    if (req.method === 'GET' && reqUrl.pathname === '/api/reddit/account') {
      return json(200, await exclusive(getAccountInfo));
    }

    if (req.method === 'GET' && reqUrl.pathname === '/api/reddit/listing') {
      return json(200, await exclusive(() => redditListing(reqUrl.searchParams.get('path'))));
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/reddit/submit') {
      const body = await parseBody(req);
      if (!body.title) return json(400, { error: 'title required' });
      if (!body.subreddit) return json(400, { error: 'subreddit required' });
      const result = await exclusive(() => submitPost(body));
      return json(200, { success: true, post: result });
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/reddit/comment') {
      const body = await parseBody(req);
      const result = await exclusive(() => submitComment(body));
      return json(200, { success: true, comment: result });
    }

    if (req.method === 'GET' && reqUrl.pathname === '/api/hn/account') {
      return json(200, await exclusive(getHnAccountInfo));
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/hn/submit') {
      const body = await parseBody(req);
      if (!body.title) return json(400, { error: 'title required' });
      if (!body.url && !body.text) return json(400, { error: 'url or text required' });
      const result = await exclusive(() => submitHnPost(body));
      return json(200, { success: true, post: result });
    }

    json(404, { error: 'Not found' });
  } catch (err) {
    console.error('[BrowserPoster] Error:', err.message);
    json(err.status || 500, { error: err.message });
  }
});

// One browser operation at a time: HN submit navigates the shared tab.
let queue = Promise.resolve();
function exclusive(fn) {
  const run = queue.then(() => fn());
  queue = run.catch(() => {});
  return run;
}

process.on('unhandledRejection', err => console.error('[BrowserPoster] Unhandled rejection:', err));
process.on('uncaughtException', err => console.error('[BrowserPoster] Uncaught exception:', err));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[BrowserPoster] Listening on 0.0.0.0:${PORT}`);
  console.log(`[BrowserPoster] Brave CDP: ${CDP_HOST}:${CDP_PORT}`);
  ensureBrowser().catch(err => console.warn('[BrowserPoster] Browser connect deferred:', err.message));
});

process.on('SIGINT', async () => { if (browser) await browser.close().catch(() => {}); process.exit(0); });
process.on('SIGTERM', async () => { if (browser) await browser.close().catch(() => {}); process.exit(0); });
