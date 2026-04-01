const FRENCH_SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
const FRENCH_RANKS_52 = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"] as const;

function french52CardIds(): string[] {
  const out: string[] = [];
  for (const s of FRENCH_SUITS) {
    for (const r of FRENCH_RANKS_52) {
      out.push(`${r}_${s}`);
    }
  }
  return out;
}

const CACHE = new Map<string, string[]>();

function cacheKey(d: string, s: string, r: string): string {
  return `${d}\0${s}\0${r}`;
}

export function getCardIds(
  deckType: string,
  suitSet: string,
  rankSet: string
): string[] {
  const key = cacheKey(deckType, suitSet, rankSet);
  const cached = CACHE.get(key);
  if (cached) return cached;

  let ids: string[] = [];
  if (
    (deckType === "Standard 52" || deckType === "Standard 52 + Joker(s)") &&
    suitSet === "French" &&
    rankSet === "Standard_52"
  ) {
    ids = french52CardIds();
    if (deckType.includes("Joker")) {
      ids.push("joker_1", "joker_2");
    }
  }

  CACHE.set(key, ids);
  return ids;
}
