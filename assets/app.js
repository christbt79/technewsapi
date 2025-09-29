(async function () {
  const $list = document.getElementById('list');
  const $search = document.getElementById('search');
  const $tag = document.getElementById('tag');
  const $window = document.getElementById('window');
  const $refresh = document.getElementById('refresh');

  let cache = [];

  function hoursAgo(h) {
    const d = new Date();
    d.setHours(d.getHours() - h);
    return d;
  }

  function tagArticle(a) {
    const t = (a.title + ' ' + (a.description || '') + ' ' + (a.content || '')).toLowerCase();
    const tags = [];
    if (/\b(llm|gpt|mistral|llama|claude|token|prompt)\b/.test(t)) tags.push('LLM');
    if (/\b(ai|gen( |-)?ai|foundation model|model training)\b/.test(t)) tags.push('AI');
    if (/\b(nvidia|amd|intel|arm|tsmc|samsung|micron|hbm|chip|semiconductor|foundry|asml|imec)\b/.test(t)) tags.push('Semiconductor');
    if (/\b(data ?center|datacentre|rack|cooling|power usage effectiveness|pue|colo|hyperscaler|edge)\b/.test(t)) tags.push('Data Center');
    if (/\b(aws|azure|gcp|oracle cloud|oci|anthropic bedrock|vertex ai|openai)\b/.test(t)) tags.push('Cloud');
    return tags.length ? tags : ['General'];
  }

  function score(a, query) {
    // recency + keyword score
    const ageHours = (Date.now() - new Date(a.publishedAt).getTime()) / 36e5;
    const recencyBoost = Math.max(0, 72 - ageHours); // fresher = higher
    let kw = 0;
    const t = (a.title + ' ' + (a.description || '')).toLowerCase();
    const keys = [
      'enterprise','data center','datacentre','semiconductor','chip','ai','llm',
      'gpu','hbm','hyperscaler','cloud','aws','azure','gcp','inference','training'
    ];
    keys.forEach(k => { if (t.includes(k)) kw += 5; });
    if (query) { query.toLowerCase().split(/\s+/).forEach(k => { if (t.includes(k)) kw += 3; }); }
    return kw + recencyBoost;
  }

  function render(items) {
    if (!items.length) {
      $list.innerHTML = `<div class="empty">No articles match your filters.</div>`;
      return;
    }
    $list.innerHTML = items.map(a => {
      const tags = tagArticle(a);
      const time = new Date(a.publishedAt).toLocaleString(undefined, { dateStyle:'medium', timeStyle:'short' });
      const domain = (new URL(a.url).hostname).replace(/^www\./,'');
      return `
      <article class="card">
        <h3><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a></h3>
        <div class="meta">
          <span>${domain}</span>
          <span>${time}</span>
          ${a.author ? `<span>by ${a.author}</span>` : ``}
        </div>
        ${a.urlToImage ? `<img src="${a.urlToImage}" alt="" loading="lazy" style="width:100%;border-radius:10px;border:1px solid #eee;">` : ``}
        <p>${a.description || ''}</p>
        <div class="badges">${tags.map(t => `<span class="badge">${t}</span>`).join('')}</div>
      </article>`;
    }).join('');
  }

  function filterAndSort() {
    const q = $search.value.trim().toLowerCase();
    const tag = $tag.value;
    const cut = hoursAgo(parseInt($window.value, 10));

    let items = cache.filter(a => new Date(a.publishedAt) >= cut);

    if (q) {
      items = items.filter(a => (a.title + ' ' + (a.description || '') + ' ' + (a.content || '')).toLowerCase().includes(q));
    }
    if (tag) {
      items = items.filter(a => tagArticle(a).includes(tag));
    }

    // de-dup by URL or (title+source)
    const seen = new Set();
    items = items.filter(a => {
      const key = a.url || `${a.title}::${a.source?.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    items.sort((a,b) => score(b, q) - score(a, q));
    render(items);
  }

  async function load() {
    try {
      const res = await fetch('data/news.json', { cache: 'no-store' });
      const payload = await res.json();
      cache = payload.articles || [];
      filterAndSort();
    } catch (e) {
      $list.innerHTML = `<div class="empty">Couldn’t load news feed.</div>`;
      console.error(e);
    }
  }

  [$search, $tag, $window].forEach(el => el.addEventListener('input', filterAndSort));
  $refresh.addEventListener('click', () => load());

  await load();
})();
