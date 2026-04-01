# MarketplaceDO

**Purpose:** Global marketplace (single DO instance idFromName('market')): list listings, buy (listingId, buyerId), sell (sellerId, itemId, itemType, price), history (userId query). Currency from endpoint-domain. Max 2000 listings, 500 history entries.

**Shard key:** `'market'` (handler: `ns.get(ns.idFromName('market'))`).

**HTTP surface:** GET `/${MarketplaceDOSegment.List}` (query limit); POST `/${MarketplaceDOSegment.Buy}` (body listingId, buyerId); POST `/${MarketplaceDOSegment.Sell}` (body sellerId, itemId, itemType, price); GET History (MarketplaceDOPaths.History + userId query).

**Message types:** N/A (HTTP only).

**Storage:** MarketplaceDOStoragePrefix (boundary-domain): listings, history.

**Handlers:** handleMarketplaceRequest (feature-handlers.ts).

**Domain constants:** endpoint-domain: MarketplaceDOSegment, Http*; endpoint-domain credits: Currency; boundary-domain: MarketplaceDOStoragePrefix.

```mermaid
sequenceDiagram
  participant Handler
  participant MarketplaceDO
  Handler->>MarketplaceDO: fetch List/Buy/Sell/History (id market)
  MarketplaceDO->>MarketplaceDO: list/buy/sell; storage
  MarketplaceDO-->>Handler: JSON
```
