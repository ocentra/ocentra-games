import { useSyncExternalStore } from 'react';
import { CARD_GAME_LAYOUT_DRAFT_CHANNEL } from '@ocentra/game-layout-domain/draftChannel';

import { type IsolationComponentType } from '@ocentra/game-layout-domain/isolation-types';

export interface IsolatedItem {
  id: string;
  type: IsolationComponentType;
  label: string;
  config: unknown;
  assetPath?: string;
}

export interface IsolationState {
  items: IsolatedItem[];
  activeId: string | null;
}

const ISOLATION_CHANNEL = 'ocentra-isolation-hub';

class IsolationStore {
  private items: IsolatedItem[] = [];
  private activeId: string | null = null;
  private state: IsolationState = { items: [], activeId: null };
  private listeners: Set<() => void> = new Set();
  private channel: BroadcastChannel | null = null;
  private draftChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.channel = new BroadcastChannel(ISOLATION_CHANNEL);
      this.channel.onmessage = (event) => {
        if (event.data.type === 'SYNC') {
          this.items = event.data.items;
          this.activeId = event.data.activeId;
          this.notify();
        }
      };
      this.draftChannel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    }
  }

  getState = () => {
    return this.state;
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify = () => {
    this.state = {
      items: [...this.items],
      activeId: this.activeId,
    };
    this.listeners.forEach((l) => l());
  };

  private broadcast = () => {
    this.channel?.postMessage({
      type: 'SYNC',
      items: this.items,
      activeId: this.activeId,
    });
  };

  isolateComponent = (type: IsolationComponentType, label: string, config: unknown, assetPath?: string) => {
    const id = `${type}-${label}`;
    
    const existingIndex = this.items.findIndex(i => i.id === id);
    if (existingIndex !== -1) {
      this.items[existingIndex] = { id, type, label, config, assetPath };
    } else {
      this.items.push({ id, type, label, config, assetPath });
    }
    
    this.activeId = id;
    this.notify();
    this.broadcast();
    return id;
  };

  removeItem = (id: string) => {
    this.items = this.items.filter(i => i.id !== id);
    if (this.activeId === id) {
      this.activeId = this.items.length > 0 ? this.items[this.items.length - 1].id : null;
    }
    this.notify();
    this.broadcast();
  };

  setActiveItem = (id: string) => {
    this.activeId = id;
    this.notify();
    this.broadcast();
  };

  updateConfig = (id: string, config: unknown) => {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.config = config;
      this.notify();
      this.broadcast();

      if (item.assetPath && this.draftChannel) {
        this.draftChannel.postMessage({
          assetPath: item.assetPath,
          type: 'ISOLATED_UPDATE',
          componentType: item.type,
          componentLabel: item.label,
          config: config
        });
      }
    }
  };
}

export const isolationStore = new IsolationStore();

export function useIsolationState() {
  return useSyncExternalStore(isolationStore.subscribe, isolationStore.getState, isolationStore.getState);
}
