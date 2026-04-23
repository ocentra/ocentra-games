import { 
  PlayerUiInspector, 
  TableInspector, 
  HudInspector, 
  HudButtonInspector 
} from "./CardGameDesignStudio";

export const InspectorMap = {
  PlayerUI: PlayerUiInspector,
  TableZone: TableInspector,
  HudArtwork: HudInspector,
  HudButton: HudButtonInspector,
} as const;

export type InspectorType = keyof typeof InspectorMap;
