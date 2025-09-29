// Fetch curated results from NewsAPI and write to /data/news.json
// Run in GitHub Actions with NEWSAPI_KEY in repo secrets.

import fs from 'fs/promises';

const API_KEY = process.env.NEWSAPI_KEY;
if (!API_KEY) {
  console.error('Missing NEWSAPI_KEY env var');
  process.exit(1);
}

// Targeted Boolean query: enterprise tech, data centers, semiconductors, AI/LLMs
// Advanced search supports quotes, AND/OR/NOT, minus (-), and parentheses. 
// (See docs + community references.) 
// Example domains list focuses results on reputable tech/business outlets.

const q = [
  '(enterprise OR "data center" OR datacentre OR semiconductor OR chip OR GPU OR "AI" OR "generative AI" OR "large language model" OR LLM)',
  // reduce consumer/gossip noise:
  'NOT (celebrity OR movie OR gaming OR trailer)'
].join(' AND ');

const params = new URLSearchParams({
  q,
  language: 'en',
  sortBy: 'publishedAt',
  // 5-day window keeps it fresh; pageSize=100 to capture enough, then we filter client-side
  from: new Date(Date.now() - 5*24*60*60*1000).toISOString(),
  pageSize: '100',
  // optional: restrict by domains you trust for enterprise/semis
  domains: [
    'reuters.com','bloomberg.com','ft.com','wsj.com','theverge.com','techcrunch.com',
    'theregister.com','zdnet.com','anandtech.com','tomshardware.com','semianalysis.com',
    'semiconductor-digest.com','arstechnica.com','cnbc.com','vox.com','wired.com'
  ].join(',')
});

const url = `https://newsapi.org/v2/everything?${params.toString()}`;
const res = await fetch(url, { headers: { 'X-Api-Key': API_KEY } });
if (!res.ok) {
  console.error('NewsAPI HTTP error:', res.status, await res.text());
  process.exit(1);
}
const data = await res.json();

// Simple normalization & trimming
const articles = (data.articles || []).map(a => ({
  source: a.source,
  author: a.author,
  title: a.title,
  description: a.description,
  url: a.url,
  urlToImage: a.urlToImage,
  publishedAt: a.publishedAt,
  content: a.content
}));

await fs.mkdir('data', { recursive: true });
await fs.writeFile('data/news.json', JSON.stringify({ fetchedAt: new Date().toISOString(), articles }, null, 2));
console.log(`Wrote ${articles.length} articles to data/news.json`);
