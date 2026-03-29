// ============================================================
//  PULSE — config.js
//  THIS IS THE ONLY FILE YOU NEED TO EDIT FOR SETTINGS
// ============================================================

const CONFIG = {

  // ── API KEYS ───────────────────────────────────────────
  NEWS_KEY: "4762caafcf2e40b6a93462050e1c64f3",
  GROQ_KEY: "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",

  // ── GROQ MODEL ─────────────────────────────────────────
  GROQ_MODEL: "llama-3.1-8b-instant",

  // ── DEFAULT TONE ───────────────────────────────────────
  // User can change on start screen. Options: friendly | savage | formal | chill
  TONE: "friendly",

  // ── DEFAULT VOICE ──────────────────────────────────────
  // User can change on start screen. Options: female | male
  VOICE: "female",

  // ── ARTICLES PER CATEGORY ──────────────────────────────
  ARTICLES_PER_CATEGORY: 3,

  // ── DEFAULT SELECTED CATEGORIES ────────────────────────
  // These are ON by default. User can deselect or add from EXTRA_CATEGORIES.
  CATEGORIES: [
    { id:"anime",   label:"Anime",      emoji:"🎌", color:"#f7a06a", q:"anime OR manga OR crunchyroll" },
    { id:"f1",      label:"F1",         emoji:"🏎️", color:"#6af7f7", q:"Formula 1 OR F1 racing OR grand prix" },
    { id:"cricket", label:"Cricket",    emoji:"🏏", color:"#6af7a0", q:"cricket OR IPL OR test match" },
    { id:"tech",    label:"AI & Tech",  emoji:"💻", color:"#a06af7", q:"artificial intelligence OR OpenAI OR tech startup" },
    { id:"world",   label:"World News", emoji:"🌍", color:"#f76a6a", q:"world news OR international OR global politics" }
  ],

  // ── EXTRA CATEGORIES (not selected by default) ─────────
  // User can click to add these on the start screen.
  EXTRA_CATEGORIES: [
    { id:"gaming",  label:"Gaming",     emoji:"🎮", color:"#6a9ff7", q:"video games OR gaming OR esports OR PlayStation OR Xbox" },
    { id:"movies",  label:"Movies",     emoji:"🎬", color:"#f76ab4", q:"movies OR Hollywood OR film release OR box office" },
    { id:"crypto",  label:"Crypto",     emoji:"₿",  color:"#f7c56a", q:"bitcoin OR crypto OR ethereum OR blockchain" },
    { id:"nba",     label:"NBA",        emoji:"🏀", color:"#f7826a", q:"NBA OR basketball OR LeBron OR NBA playoffs" },
    { id:"music",   label:"Music",      emoji:"🎵", color:"#c56af7", q:"music release OR album OR concert OR Spotify charts" },
    { id:"space",   label:"Space",      emoji:"🚀", color:"#6af7f7", q:"NASA OR SpaceX OR space exploration OR asteroid" }
  ]

};
