import {
  DEFAULT_LOBBY_PAGE_SVG_CONTROLS,
  type LobbyPageSvgControls,
} from '../../AppPages/Lobby/LobbyPageSvgSurfaceControls';

export const DAILY_SPIN_SPINNER_CONTROLS: LobbyPageSvgControls = {
  ...DEFAULT_LOBBY_PAGE_SVG_CONTROLS,
  spinner: {
    ...DEFAULT_LOBBY_PAGE_SVG_CONTROLS.spinner,
    radius: 188,
    innerRadius: 44,
    startTextRadius: 84,
    startTextSize: 13,
    resultY: -58,
    numberBoxW: 118,
    numberBoxH: 46,
    centerGoldR: 70,
    arrowHeight: 126,
  },
};
