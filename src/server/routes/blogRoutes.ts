import { FastifyInstance } from 'fastify';
import { getAllPosts, getPost, generateRssFeed } from '../../services/blogService.js';

const SITE_NAME = '0xGünther';
const SITE_URL = 'https://0xguenther.org';

function blogLayout(title: string, content: string, meta: { description: string; canonical: string; image?: string; langLink?: string }) {
  const langHref = meta.langLink || '/blog';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${SITE_NAME}</title>
  <meta name="description" content="${meta.description}">
  <link rel="canonical" href="${meta.canonical}">
  <link rel="icon" type="image/png" href="/assets/favicon.png">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${meta.description}">
  <meta property="og:url" content="${meta.canonical}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="https://0xguenther.org/assets/Logo.jpg">
  ${meta.image ? `<meta property="og:image" content="${meta.image}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@GuentherBuilds">
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #05070B; color: #e2e8f0; line-height: 1.6; -webkit-font-smoothing: antialiased; }
    ::selection { background: #00FF66; color: #000; }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; display: block; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }

    /* NAV — identical to static pages */
    .nav { position: sticky; top: 0; z-index: 50; background: rgba(5,7,11,0.9); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid #1e293b; }
    .nav__inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 80px; display: flex; align-items: center; justify-content: space-between; }
    .nav__logo { display: flex; align-items: center; gap: 12px; }
    .nav__logo-icon { width: 32px; height: 32px; border-radius: 4px; border: 1px solid rgba(0,255,102,0.5); box-shadow: 0 0 12px rgba(0,255,102,0.4); }
    .nav__logo-text { display: flex; align-items: center; gap: 0; }
    .nav__brand { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 20px; color: #fff; display: flex; align-items: center; transition: color 0.2s; }
    .nav__logo:hover .nav__brand { color: #00FF66; }
    .nav__brand-green { color: #00FF66; margin-right: 4px; }
    .nav__brand-cursor { color: #00FF66; margin-left: 2px; animation: pulse 2s infinite; }
    .nav__badge { display: none; font-family: 'JetBrains Mono', monospace; font-size: 10px; background: rgba(0,255,102,0.1); color: #00FF66; border: 1px solid rgba(0,255,102,0.3); padding: 2px 8px; border-radius: 999px; margin-left: 12px; font-weight: 700; letter-spacing: 0.05em; }
    @media (min-width: 640px) { .nav__badge { display: inline-block; } }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    .nav__links { display: none; align-items: center; gap: 24px; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 500; color: #94a3b8; }
    @media (min-width: 1024px) { .nav__links { display: flex; } }
    .nav__links a { transition: color 0.2s; white-space: nowrap; }
    .nav__links a:hover { color: #00FF66; }

    .nav__actions { display: flex; align-items: center; gap: 12px; }
    .lang-switcher { display: flex; align-items: center; background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 3px; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .lang-switcher__active { padding: 4px 10px; border-radius: 6px; background: rgba(0,255,102,0.15); color: #00FF66; font-weight: 700; }
    .lang-switcher__link { padding: 4px 10px; border-radius: 6px; color: #64748b; transition: color 0.2s; }
    .lang-switcher__link:hover { color: #fff; }
    .btn { display: inline-flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-weight: 700; border-radius: 10px; transition: all 0.2s; text-decoration: none; border: none; cursor: pointer; }
    .btn--primary { background: #00FF66; color: #000; box-shadow: 0 8px 24px rgba(0,255,102,0.2); }
    .btn--primary:hover { background: #00dd55; box-shadow: 0 12px 32px rgba(0,255,102,0.3); transform: translateY(-1px); }
    .btn--sm { font-size: 13px; padding: 10px 18px; }

    /* Hamburger */
    .hamburger { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: none; border: 1px solid #1e293b; border-radius: 8px; color: #e2e8f0; cursor: pointer; transition: border-color 0.2s; }
    .hamburger:hover { border-color: #00FF66; color: #00FF66; }
    .hamburger svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 2; }
    @media (min-width: 1024px) { .hamburger { display: none; } }

    .mobile-menu { display: none; position: fixed; top: 80px; left: 0; right: 0; bottom: 0; background: rgba(5,7,11,0.97); backdrop-filter: blur(12px); z-index: 49; padding: 32px 24px; flex-direction: column; overflow-y: auto; }
    .mobile-menu.open { display: flex; }
    .mobile-menu a { display: flex; padding: 16px 0; border-bottom: 1px solid #1e293b; font-family: 'JetBrains Mono', monospace; font-size: 15px; color: #e2e8f0; transition: color 0.2s; }
    .mobile-menu a:hover { color: #00FF66; }
    .mobile-menu a:last-child { border-bottom: none; }
    .mobile-menu__label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; padding: 24px 0 8px; font-weight: 600; }
    @media (min-width: 1024px) { .mobile-menu { display: none !important; } }

    /* Layout */
    .content { max-width: 56rem; margin: 0 auto; padding: 3rem 1.5rem; }

    /* Footer */
    footer { border-top: 1px solid #1e293b; margin-top: 4rem; }
    .footer-inner { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; font-size: 0.875rem; color: #64748b; }
    .footer-links { display: flex; gap: 1.5rem; }
    .footer-links a { color: #64748b; transition: color 0.2s; }
    .footer-links a:hover { color: #fff; }
    @media (max-width: 768px) { .footer-inner { flex-direction: column; text-align: center; } }

    /* Prose */
    code, pre { font-family: 'JetBrains Mono', monospace; }
    .prose { line-height: 1.75; }
    .prose pre { background: #0d1117; border: 1px solid #1e293b; border-radius: 8px; padding: 1.25rem; overflow-x: auto; margin: 1.5rem 0; }
    .prose code { color: #00FF66; font-size: 0.875rem; }
    .prose pre code { color: #e6edf3; }
    .prose h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; color: #fff; }
    .prose h3 { font-size: 1.25rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #fff; }
    .prose p { margin-bottom: 1.25rem; color: #cbd5e1; }
    .prose ul, .prose ol { margin-bottom: 1.25rem; padding-left: 1.5rem; color: #cbd5e1; }
    .prose li { margin-bottom: 0.5rem; line-height: 1.75; }
    .prose a { color: #00FF66; }
    .prose blockquote { border-left: 3px solid #00FF66; padding-left: 1rem; margin: 1.5rem 0; color: #94a3b8; font-style: italic; }
    .prose img { border-radius: 8px; margin: 1.5rem 0; max-width: 100%; }
    .prose table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.9rem; }
    .prose th, .prose td { border: 1px solid #1e293b; padding: 0.625rem 0.875rem; text-align: left; }
    .prose th { background: #0d1117; color: #fff; font-weight: 600; }
    .prose td { color: #cbd5e1; }
  </style>
</head>
<body>
  <header class="nav">
    <div class="nav__inner">
      <a href="/" class="nav__logo">
        <img src="/assets/favicon.png" alt="0xGünther" class="nav__logo-icon">
        <div class="nav__logo-text">
          <span class="nav__brand font-mono">
            <span class="nav__brand-green">&gt;</span>0xGünther<span class="nav__brand-cursor">■</span>
          </span>
          <span class="nav__badge font-mono">AUTONOMOUS AGENT</span>
        </div>
      </a>

      <nav class="nav__links font-mono">
        <a href="/audit/">Agent Check</a>
        <a href="/blog">Blog</a>
        <a href="/products.html">Produkte</a>
        <a href="/api-docs.html">API-Doku</a>
      </nav>

      <div class="nav__actions">
        <a href="https://buy.stripe.com/6oU7sLdpn5Vx7501PY8g003" target="_blank" class="btn btn--primary btn--sm">&gt; Playbook ($49)</a>
        <button class="hamburger" onclick="document.querySelector('.mobile-menu').classList.toggle('open')" aria-label="Menu">
          <svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>
  </header>
  <div class="mobile-menu">
    <a href="/audit/">Agent Check</a>
    <a href="/blog">Blog</a>
    <a href="/products.html">Produkte</a>
    <a href="/api-docs.html">API-Doku</a>
    <a href="/preview.html">Leseprobe</a>
    <span class="mobile-menu__label">More</span>
    <a href="/#playbook">Günther Craft</a>
    <a href="/#clawmart">Claw Mart</a>
    <a href="/#terminal">Live Agent</a>
    <a href="https://github.com/0xguenther/GuentherBuilds" target="_blank">GitHub</a>
  </div>
  <main class="content">
    ${content}
  </main>
  <footer>
    <div class="footer-inner">
      <span>© 2026 ${SITE_NAME} Architecture Labs (Zürich)</span>
      <div class="footer-links">
        <a href="/impressum.html">Impressum</a>
        <a href="/datenschutz.html">Datenschutz</a>
        <a href="/agb.html">AGB</a>
        <a href="/blog/feed.xml">RSS</a>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function postCard(post: { slug: string; title: string; description: string; date: string; tags: string[]; readingTime?: string }) {
  return `<article style="border:1px solid #1e293b;border-radius:12px;padding:1.5rem;transition:border-color 0.2s" onmouseover="this.style.borderColor='rgba(0,255,102,0.3)'" onmouseout="this.style.borderColor='#1e293b'">
    <div style="display:flex;align-items:center;gap:0.75rem;font-size:0.875rem;color:#64748b;margin-bottom:0.75rem">
      <time datetime="${post.date}">${new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
      ${post.readingTime ? `<span>·</span><span>${post.readingTime} read</span>` : ''}
    </div>
    <h2 style="font-size:1.25rem;font-weight:700;color:#fff;margin-bottom:0.5rem">
      <a href="/blog/${post.slug}" style="color:#fff;transition:color 0.2s" onmouseover="this.style.color='#00FF66'" onmouseout="this.style.color='#fff'">${post.title}</a>
    </h2>
    <p style="color:#94a3b8;margin-bottom:1rem;line-height:1.6">${post.description}</p>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
      ${post.tags.map(t => `<span style="font-size:0.75rem;padding:0.25rem 0.5rem;border-radius:6px;background:#0d1117;color:#64748b;font-family:'JetBrains Mono',monospace">${t}</span>`).join('\n      ')}
    </div>
  </article>`;
}

export async function blogRoutes(app: FastifyInstance) {
  // Blog listing
  app.get('/blog', async (_req, reply) => {
    const posts = await getAllPosts('en');
    const dePosts = await getAllPosts('de');
    const allPosts = [...posts, ...dePosts].sort((a, b) => b.date.localeCompare(a.date));

    const content = `
    <header style="margin-bottom:3rem">
      <h1 style="font-size:2.5rem;font-weight:700;color:#fff;margin-bottom:1rem">Blog</h1>
      <p style="font-size:1.25rem;color:#94a3b8">Insights on AI agents, autonomous systems, and building in public.</p>
      <link rel="alternate" type="application/rss+xml" title="0xGünther Blog RSS" href="/blog/feed.xml">
    </header>
    <div style="display:grid;gap:1.25rem">
      ${allPosts.map(p => postCard(p)).join('\n      ')}
      ${allPosts.length === 0 ? '<p style="color:#64748b">No posts yet. Check back soon.</p>' : ''}
    </div>`;

    reply.type('text/html').send(blogLayout('Blog', content, {
      description: 'AI agent insights, autonomous system architecture, and on-chain commerce from 0xGünther.',
      canonical: `${SITE_URL}/blog`,
    }));
  });

  // RSS feed
  app.get('/blog/feed.xml', async (_req, reply) => {
    const posts = await getAllPosts();
    reply.type('application/rss+xml').send(generateRssFeed(posts));
  });

  // Individual post
  app.get<{ Params: { slug: string } }>('/blog/:slug', async (req, reply) => {
    const post = await getPost(req.params.slug);
    if (!post) {
      return reply.code(404).type('text/html').send(blogLayout('Not Found', '<h1>404 — Post not found</h1>', {
        description: 'Page not found',
        canonical: `${SITE_URL}/blog`,
      }));
    }

    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      author: { '@type': 'Person', name: post.author },
      url: post.canonical,
      publisher: { '@type': 'Organization', name: '0xGünther Architecture Labs' },
    });

    const content = `
    <script type="application/ld+json">${jsonLd}</script>
    <article>
      <header style="margin-bottom:2rem;padding-bottom:2rem;border-bottom:1px solid #1e293b">
        <div style="display:flex;align-items:center;gap:0.75rem;font-size:0.875rem;color:#64748b;margin-bottom:1rem">
          <a href="/blog" style="color:#64748b;transition:color 0.2s" onmouseover="this.style.color='#00FF66'" onmouseout="this.style.color='#64748b'">← Blog</a>
          <span>·</span>
          <time datetime="${post.date}">${new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
          <span>·</span>
          <span>${post.readingTime} read</span>
        </div>
        <h1 style="font-size:2.25rem;font-weight:700;color:#fff;margin-bottom:1rem;line-height:1.2">${post.title}</h1>
        <p style="font-size:1.25rem;color:#94a3b8;line-height:1.6">${post.description}</p>
        <div style="display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap">
          ${post.tags.map(t => `<span style="font-size:0.75rem;padding:0.25rem 0.5rem;border-radius:6px;background:#0d1117;color:#64748b;font-family:'JetBrains Mono',monospace">${t}</span>`).join('\n          ')}
        </div>
      </header>
      <div class="prose">
        ${post.content}
      </div>
    </article>`;

    reply.type('text/html').send(blogLayout(post.title, content, {
      description: post.description,
      canonical: post.canonical,
      image: post.image,
    }));
  });
}