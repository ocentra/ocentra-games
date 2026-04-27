const GUEST_ADJECTIVES = [
  'Wandering',
  'Lucky',
  'Sneaky',
  'Dusty',
  'Moonlit',
  'Cheeky',
  'Velvet',
  'Midnight',
  'Bluffing',
  'Crimson',
  'Silver',
  'Rogue',
  'Mischief',
  'Whispering',
  'Stormy',
  'Golden',
  'Jolly',
  'Cosmic',
  'Restless',
  'Shady',
  'Wobbly',
  'Sparkly',
  'Sleepy',
  'Turbo',
  'Curious',
  'Loopy',
  'Breezy',
  'Daring',
  'Playful',
  'Rowdy',
] as const;

const GUEST_NAMES = [
  'Harry',
  'Luna',
  'Tom',
  'Mira',
  'Rocco',
  'Daisy',
  'Nico',
  'Zara',
  'Otto',
  'Poppy',
  'Bruno',
  'Cleo',
  'Rex',
  'Milo',
  'Nell',
  'Ivy',
  'Jasper',
  'Penny',
  'Theo',
  'Nova',
  'Mabel',
  'Winston',
  'Dottie',
  'Archie',
  'Trixie',
  'Benny',
  'Bonnie',
  'Frankie',
  'Ginny',
  'Monty',
] as const;

const GUEST_ADJECTIVE_SET = new Set<string>(GUEST_ADJECTIVES);
const GUEST_NAME_SET = new Set<string>(GUEST_NAMES);

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function createGuestDisplayName(seed: string): string {
  const adjectiveHash = hashSeed(`${seed}:adjective`);
  const nameHash = hashSeed(`${seed}:name`);
  const suffixHash = hashSeed(`${seed}:suffix`);
  const adjective = GUEST_ADJECTIVES[adjectiveHash % GUEST_ADJECTIVES.length];
  const name = GUEST_NAMES[nameHash % GUEST_NAMES.length];
  const suffix = String((suffixHash % 1000) + 1).padStart(3, '0');
  return `${adjective} ${name} ${suffix}`;
}

function hasGeneratedGuestDisplayName(displayName: string | null | undefined): boolean {
  if (!displayName) {
    return false;
  }

  const match = /^([A-Za-z]+) ([A-Za-z]+) (\d{3})$/.exec(displayName.trim());
  if (!match) {
    return false;
  }

  const [, adjective, name] = match;
  return GUEST_ADJECTIVE_SET.has(adjective) && GUEST_NAME_SET.has(name);
}

export function isGuestIdentity(input: {
  isGuest?: boolean;
  uid?: string | null;
  displayName?: string | null;
  email?: string | null;
} | null | undefined): boolean {
  if (!input) {
    return false;
  }

  if (input.isGuest) {
    return true;
  }

  if (input.displayName?.startsWith('Guest-')) {
    return true;
  }

  if (hasGeneratedGuestDisplayName(input.displayName)) {
    return true;
  }

  return Boolean(input.uid && input.email === '');
}
