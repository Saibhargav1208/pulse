// ============================================================
//  PULSE — ai.js
//  ALL AI LOGIC LIVES HERE.
//  Edit prompts, tones, models — nothing in index.html changes.
// ============================================================

// ── TONE → SYSTEM PROMPT MAP ──────────────────────────────
// Edit these freely to change how the AI summarizes news.
const TONE_PROMPTS = {

  friendly: `You summarize news for a voice assistant. The user HEARS this, not reads it.
Tone: Warm, conversational, like a knowledgeable friend catching you up.
Rules:
- headline: 1-2 sentences. What happened. Natural spoken language.
- detail:   1-2 sentences. Key facts — who, when, where, number.
- extra:    1 sentence. Why it matters or an interesting angle.
- NO bullet points. NO markdown. NO quotes. Write as if speaking.`,

  hype: `You summarize news for a voice assistant. The user HEARS this, not reads it.
Tone: High energy, excited, like a sports commentator or YouTuber.
Rules:
- headline: 1-2 sentences. Make it exciting! Use energy words.
- detail:   1-2 sentences. The key facts, delivered with enthusiasm.
- extra:    1 sentence. Hype reaction or fan perspective.
- NO bullet points. NO markdown. NO quotes. Write as if speaking out loud.`,

  formal: `You summarize news for a voice assistant. The user HEARS this, not reads it.
Tone: Professional, clear, like a BBC news anchor.
Rules:
- headline: 1-2 sentences. Factual, precise, neutral.
- detail:   1-2 sentences. Supporting facts with names and dates.
- extra:    1 sentence. Broader context or significance.
- NO bullet points. NO markdown. NO quotes. Write as if speaking.`,

  genz: `You summarize news for a voice assistant. The user HEARS this, not reads it.
Tone: Gen-Z, casual, internet-native. Use words like "lowkey", "no cap", "it's giving".
Rules:
- headline: 1-2 sentences. Say it like you're texting your friend.
- detail:   1-2 sentences. The tea, the facts, keep it real.
- extra:    1 sentence. Your honest reaction, unfiltered.
- NO bullet points. NO markdown. NO quotes. Write as if speaking.`

};

// ── INSPECTOR LOG ─────────────────────────────────────────
// Every step is logged here so you can see exactly what's happening.
const Inspector = {
  logs: [],

  add(stage, label, data) {
    const entry = { ts: new Date().toISOString().slice(11,19), stage, label, data };
    this.logs.push(entry);
    // Emit event so index.html can display it
    window.dispatchEvent(new CustomEvent("pulse:log", { detail: entry }));
  },

  clear() { this.logs = []; }
};

// ── FETCH NEWS ────────────────────────────────────────────
async function fetchNewsForCategory(category) {
  const { NEWS_KEY, ARTICLES_PER_CATEGORY } = CONFIG;
  const newsUrl  = `https://newsapi.org/v2/everything?q=${encodeURIComponent(category.q)}&language=en&sortBy=publishedAt&pageSize=${ARTICLES_PER_CATEGORY}&apiKey=${NEWS_KEY}`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(newsUrl)}`;

  Inspector.add("fetch", category.label, { query: category.q, url: proxyUrl.slice(0,80)+"..." });

  let res, lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      Inspector.add("fetch", category.label, { attempt, status: "trying..." });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);
      Inspector.add("fetch", category.label, { attempt, httpStatus: res.status });
      break;
    } catch(e) {
      lastErr = e;
      Inspector.add("fetch", category.label, { attempt, error: e.message });
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (!res) throw new Error(`Fetch failed after 3 attempts: ${lastErr?.message}`);

  const raw = await res.json();
  if (!raw.contents) throw new Error("Proxy returned empty response");

  let data;
  try { data = JSON.parse(raw.contents); }
  catch(e) { throw new Error("Proxy response was not valid JSON"); }

  if (data.status !== "ok") throw new Error(`NewsAPI: ${data.message}`);
  if (!data.articles?.length) throw new Error("No articles found");

  const articles = data.articles.slice(0, ARTICLES_PER_CATEGORY).map(a => ({
    title:   a.title || "",
    summary: (a.description || a.content || "").replace(/<[^>]*>/g,"").trim().slice(0, 400),
    source:  a.source?.name || "",
    url:     a.url || ""
  }));

  Inspector.add("fetch", category.label, {
    result: "SUCCESS",
    totalResults: data.totalResults,
    articles: articles.map(a => ({ title: a.title, source: a.source }))
  });

  return articles;
}

// ── BUILD PROMPT ──────────────────────────────────────────
function buildPrompt(articles, category) {
  const tone       = CONFIG.TONE || "friendly";
  const systemPrompt = TONE_PROMPTS[tone] || TONE_PROMPTS.friendly;

  const articlesText = articles.map((a, i) =>
    `[Article ${i+1}]\nSource: ${a.source}\nTitle: ${a.title}\nDescription: ${a.summary}`
  ).join("\n\n");

  const userPrompt = `Here are ${articles.length} recent ${category.label} news articles.\n\nFor EACH article, return a JSON object with:\n- "headline": what happened (1-2 natural spoken sentences)\n- "detail": key facts like who, when, numbers (1-2 sentences)\n- "extra": why it matters or interesting angle (1 sentence)\n\nReturn ONLY a valid JSON array of ${articles.length} objects. No markdown, no extra text.\n\n${articlesText}`;

  Inspector.add("prompt", category.label, {
    tone,
    model:        CONFIG.GROQ_MODEL,
    systemPrompt: systemPrompt.slice(0, 120) + "...",
    userPrompt:   userPrompt.slice(0, 300) + "..."
  });

  return { systemPrompt, userPrompt };
}

// ── CALL GROQ ─────────────────────────────────────────────
async function callGroq(systemPrompt, userPrompt, category) {
  Inspector.add("groq", category.label, { status: "calling Groq API..." });

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CONFIG.GROQ_KEY}` },
    body: JSON.stringify({
      model:       CONFIG.GROQ_MODEL,
      max_tokens:  800,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   }
      ]
    })
  });

  Inspector.add("groq", category.label, { httpStatus: res.status });

  if (!res.ok) {
    const errText = await res.text();
    Inspector.add("groq", category.label, { error: errText.slice(0, 200) });
    throw new Error(`Groq HTTP ${res.status}: ${errText.slice(0,100)}`);
  }

  const data        = await res.json();
  const rawContent  = data.choices?.[0]?.message?.content || "[]";

  Inspector.add("groq", category.label, {
    rawOutput: rawContent.slice(0, 400) + (rawContent.length > 400 ? "..." : "")
  });

  // Clean and parse JSON
  let text = rawContent.trim().replace(/```json|```/g, "").trim();
  const start = text.indexOf("["), end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1) text = text.slice(start, end+1);

  try {
    const parsed = JSON.parse(text);
    Inspector.add("groq", category.label, {
      result:  "SUCCESS",
      items:   parsed.length,
      preview: parsed[0]?.headline || "(empty)"
    });
    return parsed;
  } catch(e) {
    Inspector.add("groq", category.label, { parseError: e.message, rawSnippet: text.slice(0,200) });
    // Fallback: return raw titles
    return [];
  }
}

// ── MAIN ENTRY — called by index.html ─────────────────────
async function fetchAndSummarize(category) {
  Inspector.add("start", category.label, { category: category.id });

  // Step 1: Fetch
  const articles = await fetchNewsForCategory(category);

  // Step 2: Build prompt
  const { systemPrompt, userPrompt } = buildPrompt(articles, category);

  // Step 3: Call Groq
  const summaries = await callGroq(systemPrompt, userPrompt, category);

  // Step 4: Merge with source articles
  const result = summaries.map((s, i) => ({
    headline: s.headline || articles[i]?.title || "",
    detail:   s.detail   || "",
    extra:    s.extra    || "",
    source:   articles[i]?.source || "",
    url:      articles[i]?.url    || ""
  }));

  Inspector.add("done", category.label, {
    result: "COMPLETE",
    items:  result.length,
    first:  result[0]?.headline?.slice(0,80)
  });

  return result;
}
