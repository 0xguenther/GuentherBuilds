import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  image?: string;
  lang: 'de' | 'en';
  canonical: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string; // rendered HTML
  readingTime: string;
}

const BLOG_DIR = path.resolve(process.cwd(), 'content', 'blog');

function estimateReadingTime(html: string): string {
  const text = html.replace(/<[^>]+>/g, '');
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min`;
}

export async function getAllPosts(lang?: 'de' | 'en'): Promise<BlogPostMeta[]> {
  try {
    const files = await fs.readdir(BLOG_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    const posts: BlogPostMeta[] = [];

    for (const file of mdFiles) {
      const raw = await fs.readFile(path.join(BLOG_DIR, file), 'utf-8');
      const { data } = matter(raw);
      const slug = file.replace(/\.md$/, '');
      const postLang = data.lang || 'de';

      if (lang && postLang !== lang) continue;

      posts.push({
        slug,
        title: data.title || slug,
        description: data.description || '',
        date: data.date || '2026-01-01',
        author: data.author || '0xGünther',
        tags: data.tags || [],
        image: data.image,
        lang: postLang,
        canonical: data.canonical || `https://0xguenther.org/blog/${slug}`,
      });
    }

    return posts.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = path.join(BLOG_DIR, `${slug}.md`);
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);
    const html = marked(content) as string;

    return {
      slug,
      title: data.title || slug,
      description: data.description || '',
      date: data.date || '2026-01-01',
      author: data.author || '0xGünther',
      tags: data.tags || [],
      image: data.image,
      lang: data.lang || 'de',
      canonical: data.canonical || `https://0xguenther.org/blog/${slug}`,
      content: html,
      readingTime: estimateReadingTime(html),
    };
  } catch {
    return null;
  }
}

export function generateRssFeed(posts: BlogPostMeta[]): string {
  const items = posts
    .map(p => `  <item>
    <title>${escapeXml(p.title)}</title>
    <link>${p.canonical}</link>
    <description>${escapeXml(p.description)}</description>
    <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    <guid>${p.canonical}</guid>
  </item>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>0xGünther — AI Agent Builder Blog</title>
  <link>https://0xguenther.org/blog</link>
  <description>Insights on AI agents, autonomous systems, and on-chain commerce from 0xGünther Architecture Labs.</description>
  <language>en</language>
  <atom:link href="https://0xguenther.org/blog/feed.xml" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}