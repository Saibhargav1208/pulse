// ============================================================
//  PULSE — ai.js
//  ALL AI LOGIC LIVES HERE.
//  Edit prompts, tones, models — nothing in index.html changes.
// ============================================================

const TONE_PROMPTS = {

  friendly: `You summarize news for a voice assistant. The user HEARS this, not reads it.
Tone: Warm, conversational, like a knowledgeable friend catching you up.
Rules:
- headline: 1-2 sentences. What happened. Natural spoken language.
- detail:   1-2 sentences. Key facts — who, when, where, numbers.
- extra:    1 sentence. Why it matters or an interesting angle.
NO bullet points. NO markdown. NO quotes. Write as if speaking out loud.`,

  hype: `You summarize news for a voice assistant. The user HEARS this, not reads it.
Tone: High energy, excited, like a sports commentator or YouTuber.
Rules:
- headline: 1-2 sentences. Make it exciting! Use energy words.
- detail:   1-2 sentences. The key facts delivered with enthusiasm.
- extra:    1 sentence. Hype reaction or fan perspective.
NO bullet points. NO markdown. NO quotes. Write as if speaking out loud.`,

  formal: `You summarize news for a voice assistant. The user HEARS this, not reads it.
Tone: Professional, clear, like a BBC news anchor.
Rules:
- headline: 1-2 sentences. Factual, precise, neutral.
- detail:   1-2 sentences. Supporting facts with names and dates.
- extra:    1 sentence. Broader context or significance.
NO bullet points. NO markdown. NO quotes. Write as if speaking out loud.`,

  genz: `You summarize news for a voice assistant. The user HEARS this, not reads it.
Tone: Gen-Z, casual, internet-native. Use words like "lowkey", "no cap", "it's giving".
Rules:
- headline: 1-2 sentences. Say it like texting your friend.
- detail:   1-2 sentences. The tea, the facts, keep it real.
- extra:    1 sentence. Your honest reaction, unfiltered.
NO bullet points. NO markdown. NO quotes. Write as if speaking out loud.`

};

// ── SIDEBAR DATA STORE ────────────────────────────────────
// Stores all pipeline data per category so sidebar can display it
const SidebarData = {};

function sidebarUpdate(catId, section, data) {
  if (!SidebarData[catId]) SidebarData[catId] = {};
  SidebarData[catId][section] = data;
  window.dispatchEvent(new CustomEvent("pulse:sidebar", {
    detail: { catId, section, data }
  }));
}

// ── FETCH NEWS ────────────────────────────────────────────
async function fetchNewsForCategory(category) {
  const { NEWS_KEY, ARTICLES_PER_CATEGORY } = CONFIG;
  const newsUrl  = `https://newsapi.org/v2/everything?q=${encodeURIComponent(category.q)}&language=en&sortBy=publishedAt&pageSize=${ARTICLES_PER_CATEGORY}&apiKey=${NEWS_KEY}`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(newsUrl)}`;

  sidebarUpdate(category.id, "status", "fetching...");

  let res, lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);
      break;
    } catch(e) {
      lastErr = e;
      sidebarUpdate(category.id, "status", `attempt ${attempt} failed: ${e.message}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (!res) throw new Error(`Fetch failed: ${lastErr?.message}`);

  const raw = await res.json();
  if (!raw.contents) throw new Error("Proxy returned empty response");

  let data;
  try { data = JSON.parse(raw.contents); }
  catch(e) { throw new Error("Proxy response was not valid JSON"); }

  if (data.status !== "ok") throw new Error(`NewsAPI: ${data.message}`);
  if (!data.articles?.length) throw new Error("No articles found");

  const articles = data.articles.slice(0, ARTICLES_PER_CATEGORY).map(a => ({
    title:   a.title || "",
    summary: (a.description || a.content || "").replace(/<[^>]*>/g,"").trim().slice(0, 500),
    source:  a.source?.name || "",
    url:     a.url || ""
  }));

  // ← Send raw news to sidebar
  sidebarUpdate(category.id, "rawNews", articles);

  return articles;
}

// ── BUILD PROMPT ──────────────────────────────────────────
function buildPrompt(articles, category) {
  const tone         = CONFIG.TONE || "friendly";
  const systemPrompt = TONE_PROMPTS[tone] || TONE_PROMPTS.friendly;

  const articlesText = articles.map((a, i) =>
    `[Article ${i+1}]\nSource: ${a.source}\nTitle: ${a.title}\nDescription: ${a.summary}`
  ).join("\n\n---\n\n");

  const userPrompt =
`Here are ${articles.length} recent ${category.label} news articles.

For EACH article return a JSON object with:
- "headline": what happened (1-2 natural spoken sentences)
- "detail":   key facts — who, when, where, numbers (1-2 sentences)
- "extra":    why it matters or an interesting angle (1 sentence)

Return ONLY a valid JSON array of ${articles.length} objects. No markdown, no extra text.

${articlesText}`;

  // ← Send prompt to sidebar
  sidebarUpdate(category.id, "groqInput", {
    model:        CONFIG.GROQ_MODEL,
    tone,
    systemPrompt,
    userPrompt
  });

  return { systemPrompt, userPrompt };
}

// ── CALL GROQ ─────────────────────────────────────────────
async function callGroq(systemPrompt, userPrompt, category) {
  sidebarUpdate(category.id, "status", "calling Groq...");

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

  if (!res.ok) {
    const errText = await res.text();
    sidebarUpdate(category.id, "error", errText.slice(0, 300));
    throw new Error(`Groq HTTP ${res.status}`);
  }

  const data       = await res.json();
  const rawContent = data.choices?.[0]?.message?.content || "[]";

  // ← Send raw Groq output to sidebar
  sidebarUpdate(category.id, "groqOutput", rawContent);

  let text  = rawContent.trim().replace(/```json|```/g,"").trim();
  const s   = text.indexOf("["), e = text.lastIndexOf("]");
  if (s !== -1 && e !== -1) text = text.slice(s, e+1);

  try {
    return JSON.parse(text);
  } catch {
    sidebarUpdate(category.id, "error", "JSON parse failed");
    return [];
  }
}

// ── MAIN ENTRY ────────────────────────────────────────────
async function fetchAndSummarize(category) {
  sidebarUpdate(category.id, "status", "starting...");

  const articles                   = await fetchNewsForCategory(category);
  const { systemPrompt, userPrompt } = buildPrompt(articles, category);
  const summaries                  = await callGroq(systemPrompt, userPrompt, category);

  const result = summaries.map((s, i) => ({
    headline: s.headline || articles[i]?.title || "",
    detail:   s.detail   || "",
    extra:    s.extra    || "",
    source:   articles[i]?.source || "",
    url:      articles[i]?.url    || ""
  }));

  // ← Send final parsed result to sidebar
  sidebarUpdate(category.id, "final", result);
  sidebarUpdate(category.id, "status", "done");

  return result;
}
