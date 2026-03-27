// ============================================================
//  PULSE — config.js
//  THIS IS THE ONLY FILE YOU NEED TO EDIT FOR SETTINGS
// ============================================================

const CONFIG = {

  // ── API KEYS ───────────────────────────────────────────
  NEWS_KEY: "4762caafcf2e40b6a93462050e1c64f3",
  GROQ_KEY: "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",

  // ── GROQ MODEL ─────────────────────────────────────────
  // Options: "llama-3.1-8b-instant" | "llama-3.3-70b-versatile" | "mixtral-8x7b-32768"
  GROQ_MODEL: "llama-3.1-8b-instant",

  // ── TONE ───────────────────────────────────────────────
  // Options: "friendly" | "hype" | "formal" | "genz"
  TONE: "friendly",

  // ── ARTICLES PER CATEGORY ──────────────────────────────
  ARTICLES_PER_CATEGORY: 3,

  // ── CATEGORIES ─────────────────────────────────────────
  // Add or remove categories freely.
  // q = NewsAPI search query
  CATEGORIES: [
    {
      id:    "anime",
      label: "Anime",
      emoji: "🎌",
      color: "#f7a06a",
      q:     "anime OR manga OR crunchyroll"
    },
    {
      id:    "f1",
      label: "F1",
      emoji: "🏎️",
      color: "#6af7f7",
      q:     "Formula 1 OR F1 racing OR grand prix"
    },
    {
      id:    "cricket",
      label: "Cricket",
      emoji: "🏏",
      color: "#6af7a0",
      q:     "cricket OR IPL OR test match"
    },
    {
      id:    "tech",
      label: "AI & Tech",
      emoji: "💻",
      color: "#a06af7",
      q:     "artificial intelligence OR OpenAI OR tech startup"
    },
    {
      id:    "world",
      label: "World News",
      emoji: "🌍",
      color: "#f76a6a",
      q:     "world news OR international OR global politics"
    }
  ]

};
