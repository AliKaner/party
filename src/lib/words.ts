// Client-side English word list for gameplay validation.
// Ported near-verbatim from the design handoff's wordlist.js.
// Used both client-side (instant feedback) and server-side in Convex
// mutations (authoritative validation).

const RAW = [
  "apple","arm","art","ant","air","area","army","actor","atom","aunt","axis","angle","anchor","alarm","album",
  "bag","ball","bank","bar","bat","bear","bed","bell","belt","bird","boat","body","bone","book","boot","box","boy","bread","brick","bridge","brush","bus",
  "cake","calm","camp","card","care","cart","cash","cat","cave","chain","chair","chalk","chart","cheek","chest","chief","child","chin","city","claim","clay","clip","cloud","club","coal","coat","code","coin","cold","color","comb","cook","cool","corn","cost","couch","court","cover","crab","crane","cream","crew","crop","crown","cube","curve",
  "dance","dark","dart","dawn","deal","deer","desk","dice","diet","dirt","dish","dock","dog","doll","door","dot","dove","down","draft","drain","drama","dream","dress","drink","drive","drum","duck","dust","duty",
  "eagle","earth","east","edge","eel","egg","elbow","empire","engine","enter","equal","error","event","exit","exam",
  "face","fact","fair","fall","fame","farm","fast","fear","feast","fence","field","film","fish","flag","flame","flat","fleet","floor","flow","foam","fog","food","foot","force","forest","form","fort","fox","frame","frog","fruit","fuel",
  "game","gap","garden","gate","gem","germ","ghost","giant","gift","glass","globe","glow","glue","goal","gold","golf","gown","grain","grape","grass","gravy","grid","grief","grill","group","guard","guess","guest","guide","gulf","gum",
  "habit","hair","half","hall","hammer","hand","harp","hat","hawk","head","heart","heat","heel","help","herb","hero","hill","hint","hip","hive","hold","hole","home","honey","hood","hook","horn","horse","hose","hotel","house","hunt",
  "ice","icon","idea","inch","index","ink","inn","input","iron","island","issue","item","ivory",
  "jacket","jam","jar","jaw","jazz","jelly","job","joke","joy","juice","jump","jungle","junk",
  "kettle","key","kick","kid","king","kiss","kit","kite","knee","knife","knight","knot",
  "lace","lady","lake","lamp","land","lane","large","laser","law","layer","leaf","leg","lemon","lens","level","light","limb","lime","line","lion","list","lock","log","loop","lord","loss","love",
  "machine","magic","maid","mail","major","map","march","mark","mask","mass","meal","meat","medal","melon","melt","menu","metal","meter","mice","mild","mile","milk","mill","mind","mint","mist","mode","mole","monk","moon","mop","moss","moth","mount","mouse","mouth","mud","mule","music",
  "nail","name","navy","neck","nest","net","news","node","noise","noon","north","nose","note","novel","number","nurse","nut",
  "oak","oar","oath","ocean","offer","oil","onion","opal","open","orbit","order","organ","otter","outer","oven","owl","oxide",
  "paint","pair","palm","panel","paper","park","party","path","peace","peach","peak","pearl","pen","phone","photo","piano","pig","pilot","pine","pipe","plane","plant","plate","point","pond","pool","potato","power","prize","proof","pulse","puppy","purse",
  "quack","quail","quality","quart","queen","quest","quick","quiet","quilt","quiz",
  "rabbit","race","radio","rail","rain","ranch","range","rank","rate","raven","razor","reef","result","ribbon","rice","ridge","ring","river","road","robe","robot","rock","roof","room","root","rose","route",
  "sail","salad","salt","sand","scale","scarf","school","score","screen","sea","seal","seat","shape","sharp","sheep","shelf","ship","shirt","shoe","shop","shore","sign","silk","silver","skirt","sky","sleep","smile","smoke","snake","snow","soap","socks","song","soup","space","spark","speed","spice","spoon","sport","spring","stage","stamp","star","steam","steel","stem","stick","stone","storm","story","stove","straw","stream","street","sugar","suit","summer","sun","swan","sweet","sword",
  "table","tail","talk","tank","taste","team","tent","test","thumb","tiger","time","toast","tomato","tone","tool","tooth","touch","tower","town","toy","trail","train","trap","tray","tree","trip","truck","trunk","tube","tulip","tuna","tunnel","turtle",
  "umbrella","uncle","under","union","unit","upper","urban","urge","use","usual",
  "valley","value","van","vase","veil","vein","velvet","venue","verse","vessel","vest","video","view","village","vine","violet","virus","visit","voice","void","voter",
  "wagon","waist","walk","wall","wand","water","wave","wax","wealth","wheat","wheel","whistle","white","window","wine","wing","winter","wire","wolf","wood","wool","word","world","worm",
  "yacht","yard","yarn","year","yellow","yield","yolk","youth",
  "zebra","zero","zinc","zone","zoo",
];

export const WORDS: string[] = [...new Set(RAW.map((w) => w.toUpperCase()))];
export const WORD_SET = new Set(WORDS);

export const WORDS_BY_LETTER: Record<string, string[]> = {};
for (const w of WORDS) {
  const l = w[0];
  if (!WORDS_BY_LETTER[l]) WORDS_BY_LETTER[l] = [];
  WORDS_BY_LETTER[l].push(w);
}

// letters with enough supply to be fair round choices
export const VIABLE_LETTERS = Object.keys(WORDS_BY_LETTER).filter(
  (l) => WORDS_BY_LETTER[l].length >= 6
);

export function isValidWord(word: string): boolean {
  return WORD_SET.has((word || "").trim().toUpperCase());
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomLetter(exclude: string[] = []): string {
  const pool = VIABLE_LETTERS.filter((l) => !exclude.includes(l));
  return randomFrom(pool.length ? pool : VIABLE_LETTERS);
}

export function randomWordStartingWith(
  letter: string,
  excludeSet: Set<string> = new Set()
): string | null {
  const pool = (WORDS_BY_LETTER[letter] || []).filter((w) => !excludeSet.has(w));
  if (!pool.length) return null;
  return randomFrom(pool);
}

export function letterCounts(str: string): Record<string, number> {
  const c: Record<string, number> = {};
  for (const ch of str) c[ch] = (c[ch] || 0) + 1;
  return c;
}

export function wordFitsLetters(
  word: string,
  availableCounts: Record<string, number>
): boolean {
  const need = letterCounts(word);
  for (const k in need) {
    if (!availableCounts[k] || availableCounts[k] < need[k]) return false;
  }
  return true;
}

export function shuffleString(str: string): string[] {
  const arr = str.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Pick a base word (6-8 letters) and return its shuffled letters as the round's tile set.
export function scrambleRoundLetters(excludeSet: Set<string> = new Set()): {
  letters: string[];
  sourceWord: string;
} {
  const candidates = WORDS.filter(
    (w) => w.length >= 6 && w.length <= 8 && !excludeSet.has(w)
  );
  const base = randomFrom(
    candidates.length ? candidates : WORDS.filter((w) => w.length >= 5)
  );
  return { letters: shuffleString(base), sourceWord: base };
}

export function randomWordFromLetters(
  availableCounts: Record<string, number>,
  excludeSet: Set<string> = new Set()
): string | null {
  const pool = WORDS.filter(
    (w) => !excludeSet.has(w) && w.length >= 3 && wordFitsLetters(w, availableCounts)
  );
  if (!pool.length) return null;
  return randomFrom(pool);
}

export const DAILY_WORDS = [
  { word: "HOUSE", category: "Home & Living" },
  { word: "RIVER", category: "Nature" },
  { word: "CHESS", category: "Games" },
  { word: "BREAD", category: "Food" },
  { word: "CLOUD", category: "Sky" },
  { word: "MUSIC", category: "Art" },
  { word: "PLANT", category: "Nature" },
  { word: "STORM", category: "Weather" },
  { word: "TIGER", category: "Animals" },
  { word: "TRAIN", category: "Transport" },
  { word: "GLASS", category: "Home & Living" },
  { word: "BEACH", category: "Nature" },
  { word: "CANDY", category: "Food" },
  { word: "SWORD", category: "History" },
  { word: "PIANO", category: "Art" },
];

export function getDailyWordForToday() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return DAILY_WORDS[dayIndex % DAILY_WORDS.length];
}

export const BLUFF_WORDS = [
  { word: "PETRICHOR", definition: "The pleasant earthy smell after rain falls on dry ground." },
  { word: "GALLIVANT", definition: "To wander around in search of fun or amusement." },
  { word: "QUIXOTIC", definition: "Extremely idealistic and unrealistic in a romantic way." },
  { word: "SONDER", definition: "The realization that every stranger has a life as vivid as your own." },
  { word: "LOLLYGAG", definition: "To spend time aimlessly instead of doing something useful." },
  { word: "CATTYWAMPUS", definition: "Positioned diagonally or askew; not straight." },
  { word: "FLIBBERTIGIBBET", definition: "A silly, flighty, or overly talkative person." },
  { word: "BAMBOOZLE", definition: "To deceive or trick someone." },
  { word: "NINCOMPOOP", definition: "A foolish or silly person." },
  { word: "SNOLLYGOSTER", definition: "A clever, unscrupulous person guided by personal gain." },
];

export const FAKE_DEF_POOL = [
  "A type of medieval tax collected in candles instead of coins.",
  "The act of pretending to sneeze to politely end a conversation.",
  "A nautical term for tying a rope with exactly three knots.",
  "An old tailoring term for a sleeve sewn on backwards by mistake.",
  "A folk dance performed only during the first snowfall.",
  "A children's game involving tossing a coin into a well for luck.",
  "The sound a wooden cart makes when missing a wheel.",
  "A 19th-century term for a poorly written letter.",
  "A small tool once used to remove wax from candle wicks.",
  "An old term for someone who arrives fashionably late to dinner.",
  "A type of bread that rises twice as slowly in cold weather.",
  "A carpenter's term for a plank cut slightly too short.",
  "The last sip left in a teapot, considered bad luck to drink.",
  "A style of handwriting used only for signing formal letters.",
  "A garden pest that only eats the leaves of rose bushes.",
];
