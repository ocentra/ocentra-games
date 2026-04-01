# ActivityFeedDO

**Purpose:** Per-user activity feed: append items (type, payload), list with limit and before cursor. Max 500 items; FIFO trim.

**Shard key:** userId (handler: `env.ACTIVITY_FEED_DO.idFromName(userId)`; fan-out uses `idFromName(friendId)`).

**HTTP surface:** No WebSocket. POST path ending `/${ActivityFeedDOSegment.Append}`: body `type`, `payload`; GET path ending `/${ActivityFeedDOSegment.List}`: query `limit`, `before`.

**Message types:** N/A (HTTP only).

**Storage:** `this.ctx.storage`: key `ActivityFeedDOStoragePrefix.Items` (array of FeedItem: id, type, payload, timestamp). From boundary-domain do-storage-prefixes.

**Handlers:** [handleFeedRequest](../features/activity-feed.md) (feature-handlers.ts); route Feed.

**Domain constants:** endpoint-domain: HttpMethod, HttpStatus, HttpHeader, HttpContentType, ActivityFeedDOSegment; endpoint-domain game: FeedType; boundary-domain: ActivityFeedDOStoragePrefix.

```mermaid
sequenceDiagram
  participant Handler
  participant ActivityFeedDO
  Handler->>ActivityFeedDO: fetch Append or List
  ActivityFeedDO->>ActivityFeedDO: getItems/append/list; storage get/put
  ActivityFeedDO-->>Handler: JSON
```
