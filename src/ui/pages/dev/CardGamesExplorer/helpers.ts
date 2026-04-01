import type { GameSummary, Game, GameDetail, Section } from './types';
import { SECTIONS } from './types';

export function categorize(g: GameSummary): string {
  const n = g.name.toLowerCase();
  const desc = g.description.toLowerCase();
  const type = (g.type ?? '').toLowerCase();
  if (n.includes('poker') || n.includes("hold'em") || n.includes('stud') || n.includes('omaha') || type.includes('poker')) return 'Poker';
  if (n.includes('solitaire') || n.includes('patience') || n.includes('klondike') || n.includes('freecell') || n.includes('spider')) return 'Solitaire';
  if (n.includes('domino')) return 'Dominoes';
  if (n.includes('rummy') || n.includes('gin') || n.includes('canasta') || n.includes('mahjong')) return 'Rummy';
  if (n.includes('bridge') || n.includes('whist') || n.includes('euchre') || n.includes('spades') || n.includes('hearts') || desc.includes('trick-taking') || desc.includes('trick taking')) return 'Trick-taking';
  if (n.includes('scopa') || n.includes('cassino') || n.includes('basra') || desc.includes('fishing')) return 'Fishing';
  if (n.includes('uno') || n.includes('crazy eights') || desc.includes('shedding')) return 'Shedding';
  if (n.includes('blackjack') || n.includes('baccarat') || n.includes('casino')) return 'Casino';
  if (n.includes('tarot') || n.includes('tarok') || n.includes('tarock')) return 'Tarot';
  return 'Other';
}

export function enrich(g: GameSummary): Game {
  const completeSections = SECTIONS.filter(s => g.completeness[s]).length;
  return {
    ...g,
    normalizedName: g.name.toLowerCase().replace(/^(the|a|an)\s+/i, ''),
    category: g.category ?? categorize(g),
    subcategory: g.subcategory ?? null,
    completenessPercent: Math.round((completeSections / SECTIONS.length) * 100),
  };
}

export function renderSection(detail: GameDetail, section: Section): string {
  const d = (detail as unknown as Record<string, unknown>)[section];
  if (!d) return '';
  if (typeof d === 'string') return d;
  const dObj = d as Record<string, unknown>;

  switch (section) {
    case 'overview': {
      const parts: string[] = [];
      if (dObj.description) parts.push(String(dObj.description));
      if (dObj.type) parts.push(`Type: ${dObj.type}`);
      if (dObj.origin) parts.push(`Origin: ${dObj.origin}`);
      if (dObj.players) parts.push(`Players: ${dObj.players}`);
      if (dObj.deck) parts.push(`Deck: ${dObj.deck}`);
      if (dObj.difficulty) parts.push(`Difficulty: ${dObj.difficulty}`);
      if (dObj.duration) parts.push(`Duration: ${dObj.duration}`);
      return parts.join('\n');
    }
    case 'history':
      return [
        dObj.origins,
        ...((dObj.timeline ?? []) as string[]).map((t: string) => `  - ${t}`),
        dObj.evolution, dObj.cultural,
      ].filter(Boolean).join('\n');
    case 'setup':
      return [
        dObj.players && `Players: ${dObj.players}`,
        dObj.deck && `Deck: ${dObj.deck}`,
        dObj.equipment && `Equipment: ${dObj.equipment}`,
        dObj.dealing && `Dealing: ${dObj.dealing}`,
      ].filter(Boolean).join('\n');
    case 'rules':
      return [
        dObj.objective && `Objective: ${dObj.objective}`,
        dObj.gameplay && `\nGameplay:\n${dObj.gameplay}`,
        dObj.scoring && `\nScoring:\n${dObj.scoring}`,
        ...((dObj.keyRules ?? []) as string[]).map((r: string) => `  - ${r}`),
      ].filter(Boolean).join('\n');
    case 'strategy':
      return [
        dObj.basic && `Basic:\n${dObj.basic}`,
        dObj.intermediate && `\nIntermediate:\n${dObj.intermediate}`,
        dObj.advanced && `\nAdvanced:\n${dObj.advanced}`,
        ...((dObj.tips ?? []) as string[]).map((t: string) => `  - ${t}`),
      ].filter(Boolean).join('\n');
    case 'variations':
      return ((dObj.list ?? []) as string[]).map((v: string) => `- ${v}`).join('\n');
    case 'ai': {
      const diff = dObj.difficulty as Record<string, string> | undefined;
      const parts: string[] = [];
      if (diff?.easy) parts.push(`Easy:\n${diff.easy}`);
      if (diff?.medium) parts.push(`Medium:\n${diff.medium}`);
      if (diff?.hard) parts.push(`Hard:\n${diff.hard}`);
      const considerations = (dObj.considerations ?? []) as string[];
      if (considerations.length) parts.push(`\nConsiderations:\n${considerations.map((c: string) => `  - ${c}`).join('\n')}`);
      return parts.join('\n\n');
    }
    case 'sources': {
      const primary = (dObj.primary ?? []) as { name?: string; url?: string }[];
      const links = primary.map((s) => `${s.name} — ${s.url}`);
      return [...links, ...((dObj.additional ?? []) as string[])].join('\n');
    }
    default:
      return JSON.stringify(d, null, 2);
  }
}
