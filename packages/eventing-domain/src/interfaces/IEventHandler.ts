import type { IEventRegistrar } from './IEventRegistrar';

export interface IEventHandler {
  eventRegistrar: IEventRegistrar;
  subscribeToEvents(): void;
  unsubscribeFromEvents(): void;
}

export interface IAssetRegistryHandler extends IEventHandler {
  readonly HANDLER_MARKER: unique symbol;
}
export const AssetRegistryHandlerMarker: IAssetRegistryHandler['HANDLER_MARKER'] =
  Symbol('AssetRegistryHandler') as IAssetRegistryHandler['HANDLER_MARKER'];

export interface INetworkRouterHandler extends IEventHandler {
  readonly HANDLER_MARKER: unique symbol;
}
export const NetworkRouterHandlerMarker: INetworkRouterHandler['HANDLER_MARKER'] = 
  Symbol('NetworkRouterHandler') as INetworkRouterHandler['HANDLER_MARKER'];
