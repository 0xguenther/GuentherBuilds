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
import { chromium } from 'playwright-core';

const PORT = parseInt(process.env.PORT || '9333', 10);
const CDP_PORT = parseInt(process.env.BRAVE_CDP_PORT || '9222', 10);
const CDP_HOST = process.env.BRAVE_CDP_HOST || '127.0.0.1';
const AUTH_TOKEN = process.env.BROWSER_POSTER_TOKEN || '';

let browser = null;
let context = null;
let cachedCookies = null;
let cookiesFetchedAt = 0;

async function ensureBrowser() {
  if (browser && browser.isConnected()) return;
  const cdpUrl = `http://${CDP_HOST}:${CDP_PORT}`;
  browser = await chromium.connectOverCDP(cdpUrl, { timeout: 5000 });
  context = browser.contexts()[0] || await browser.newContext();
  console.log(`[BrowserPoster] Connected to Brave at ${cdpUrl}`);
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

async function submitPost(params) {
  const { subreddit, title, body, url: linkUrl } = params;
  const cleanSub = (subreddit || '').replace(/^r\//, '').trim();

  await ensureBrowser();
  // Find an existing reddit page or create one
  const pages = context.pages();
  let page = pages.find(p => p.url().includes('reddit.com'));
  if (!page) {
    page = await context.newPage();
    await page.goto('https://www.reddit.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
  }

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
  const cookies = await getRedditCookies();
  const result = await redditApi('/api/v1/me');
  return {
    username: result?.name || 'unknown',
    linkKarma: result?.link_karma || 0,
    commentKarma: result?.comment_karma || 0,
    totalKarma: (result?.link_karma || 0) + (result?.comment_karma || 0),
    isSimulated: false,
    method: 'browser-cookie-api',
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
    if (req.method === 'GET' && req.url === '/health') {
      let redditOk = false;
      let hnOk = false;
      try {
        const cookies = await getRedditCookies();
        redditOk = !!cookies.token_v2;
      } catch {}
      try {
        const hnCookies = await getHnCookies();
        hnOk = !!hnCookies.user;
      } catch {}
      return json(200, {
        status: 'ok',
        browserConnected: browser?.isConnected() || false,
        redditSession: redditOk,
        hnSession: hnOk,
        cdpPort: CDP_PORT,
      });
    }

    if (req.method === 'GET' && req.url === '/api/reddit/account') {
      return json(200, await getAccountInfo());
    }

    if (req.method === 'POST' && req.url === '/api/reddit/submit') {
      const body = await parseBody(req);
      if (!body.title) return json(400, { error: 'title required' });
      if (!body.subreddit) return json(400, { error: 'subreddit required' });
      const result = await submitPost(body);
      return json(200, { success: true, post: result });
    }

    if (req.method === 'GET' && req.url === '/api/hn/account') {
      return json(200, await getHnAccountInfo());
    }

    if (req.method === 'POST' && req.url === '/api/hn/submit') {
      const body = await parseBody(req);
      if (!body.title) return json(400, { error: 'title required' });
      if (!body.url && !body.text) return json(400, { error: 'url or text required' });
      const result = await submitHnPost(body);
      return json(200, { success: true, post: result });
    }

    json(404, { error: 'Not found' });
  } catch (err) {
    console.error('[BrowserPoster] Error:', err.message);
    json(500, { error: err.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[BrowserPoster] Listening on 0.0.0.0:${PORT}`);
  console.log(`[BrowserPoster] Brave CDP: ${CDP_HOST}:${CDP_PORT}`);
  ensureBrowser().catch(err => console.warn('[BrowserPoster] Browser connect deferred:', err.message));
});

process.on('SIGINT', async () => { if (browser) await browser.close().catch(() => {}); process.exit(0); });
process.on('SIGTERM', async () => { if (browser) await browser.close().catch(() => {}); process.exit(0); });
