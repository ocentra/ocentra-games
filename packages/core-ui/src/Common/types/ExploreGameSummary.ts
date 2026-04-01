export interface ExploreGameSummary {
  slug: string;
  name: string;
  category?: string;
  subcategory?: string | null;
  player_mode?: string | null;
  difficulty: string;
  players: string;
  quality: string;
}
