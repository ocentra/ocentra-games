# Serialization (asset-domain)

`@ocentra/asset-domain` provides decorators and utilities for serializing/deserializing ScriptableObject assets to JSON5 format with a `system`/`data` structure. This format separates metadata (system) from the actual asset data (data).

---

## 1. Overview

| API / Type                | Purpose                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| `serializable` decorator  | Marks class fields as serializable with optional metadata (labels, min/max). |
| `serialize(instance)`     | Converts a decorated class instance into a plain object.                     |
| `deserialize(Class, data)` | Instantiates the class from serialized data (with optional migration).      |
| `instance.serialize()`    | Converts ScriptableObject instance to JSON5 format with system/data structure. |
| `ScriptableObject.deserialize()` | Instantiates class from JSON5 content.                              |
| `configureSerialization`  | Adjust runtime options (deep clone, freeze results).                         |
| `getSerializableFields`   | Introspect metadata (useful for editors or tooling).                         |
| `SCHEMA_VERSION_KEY`      | Constant used to track version numbers during serialization.                 |

Import from `@ocentra/asset-domain` (or `@ocentra/asset-domain/ScriptableObject`, `@ocentra/asset-domain/Serializable`, `@ocentra/asset-domain/serialization/decorators` as needed).

---

## 2. Decorating a Class

```ts
import { serializable } from '@ocentra/asset-domain'

export class PlayerSettings {
  @serializable({ label: 'Display Name' })
  name = 'Anonymous'

  @serializable({ label: 'Sound Volume', min: 0, max: 100 })
  volume = 70

  @serializable({ label: 'Favorite Deck', optional: true })
  deckId?: string
}
```

- `serializable` stores metadata via `reflect-metadata`. Ensure `import 'reflect-metadata'` is executed once (already done inside `Serializable.ts`).
- Options can include `label`, `min`, `max`, `step`, `group`, `inputType`, etc. These are primarily for UI introspection.

---

## 3. Serializing and Deserializing

### Using JSON5 Format (For Assets)

For assets that extend `ScriptableObject`, use JSON5 serialization:

```ts
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject'

const player = new PlayerSettings()
player.volume = 85

// Serialize to JSON5 with system/data structure
const json5 = player.serialize()
// Result: JSON5 string with system (metadata) and data (fields) structure
// {
//   system: {
//     guid: 'abc123...',
//     assetType: 'PlayerSettings',
//     schemaVersion: 1,
//     displayName: 'PlayerSettings',
//     category: 'Content'
//   },
//   data: {
//     name: 'Anonymous',
//     volume: 85,
//     deckId: null
//   }
// }

// Deserialize from JSON5
const restored = ScriptableObject.deserialize(PlayerSettings, json5)
// restored is a new PlayerSettings instance with volume = 85
```

### Using Low-Level Object Serialization

For internal use or when you need the plain object representation:

```ts
import { serialize, deserialize } from '@ocentra/asset-domain'

const player = new PlayerSettings()
player.volume = 85

const raw = serialize(player)
// raw is a plain object (used internally by JSON5 serialization)
// { name: 'Anonymous', volume: 85, deckId: undefined }

const restored = deserialize(PlayerSettings, raw)
// restored is a new PlayerSettings instance with volume = 85
```

Behind the scenes:

- `serialize` respects metadata, deep clones the object, and records `schemaVersion` (if provided).
- `deserialize` deep clones inputs, applies migrations when schema versions mismatch, and rehydrates decorated fields.
- `ScriptableObject` provides `serialize()` and `deserialize()` methods to convert to/from JSON5 format with system/data structure.

---

## 4. Schema Versions & Migration

Add a static `schemaVersion` to your class. Optionally provide a `migrate` function that accepts the raw serialized data when versions differ.

```ts
@serializable()
export class LayoutConfig {
  static schemaVersion = 2

  @serializable({ label: 'Table Size' })
  tableSize = 8

  @serializable({ label: 'Theme', optional: true })
  theme?: string

  static migrate(data: Record<string, unknown>) {
    if (data.__schemaVersion === 1) {
      // Example: rename property from "tableCount" -> "tableSize"
      if (typeof data.tableCount === 'number' && data.tableSize === undefined) {
        data.tableSize = data.tableCount
        delete data.tableCount
      }
    }
    data.__schemaVersion = LayoutConfig.schemaVersion
    return data
  }
}
```

When `deserialize(LayoutConfig, raw)` sees a different `__schemaVersion`, it calls `migrate` (if defined). You are responsible for updating the schema version inside the migration result.

---

## 5. Array and Nested Types

Use `elementType` to automatically deserialize array entries:

```ts
export class Deck {
  @serializable({ elementType: Card })
  cards: Card[] = []
}
```

If you omit `elementType`, arrays are cloned as plain values. When provided, `deserialize` recursively rehydrates each entry using the constructor.

---

## 6. Runtime Options

`configureSerialization` allows you to adjust three flags:

```ts
import { configureSerialization } from '@ocentra/asset-domain'

configureSerialization({
  deepClone: false,       // skip deep cloning (useful for performance, but mutates original)
  freezeResults: false,   // do not freeze serialized output
  freezeInstances: true,  // freeze deserialized class instances
})
```

Defaults:

- `deepClone`: true
- `freezeResults`: true
- `freezeInstances`: false

---

## 7. Inspecting Metadata

`getSerializableFields` returns raw metadata for generating editors or inspector UIs:

```ts
import { getSerializableFields } from '@ocentra/asset-domain'

const fields = getSerializableFields(PlayerSettings)
// [{ key: 'name', options: { label: 'Display Name' }, defaultValue: 'Anonymous', ... }, ...]
```

Each entry contains the original default value, options, and design type.

---

## 8. Testing & Utilities

- **Tests**: Example specs live in the app bootstrap (`src/bootstrap/__tests__/Serializable.spec.ts`) or in asset-domain tests.
- **Helpers**: `Serializable` exposes `SCHEMA_VERSION_KEY` for reading/writing version markers.
- **Deep clones**: Use the serializer to clone decorated objects safely (especially when classes contain nested serializable classes).

---

## 9. Asset File Format (JSON5)

Assets are stored as `.asset` files in JSON5 format with a `system`/`data` structure:

```json5
{
  system: {
    guid: 'ddc6d965-14a7-4586-8a15-674e0daf8b5c',
    assetType: 'CardGameMode',
    schemaVersion: 1,
    displayName: 'Claim',
    category: 'Game',
    gameId: 'claim',
    treePath: 'Resources/GameMode/CardGames/claim/claim.asset',
  },
  data: {
    baseBet: 10,
    initialNumberOfCards: 3,
    maxNumberOfCards: 13,
    // ... other serialized fields
  },
}
```

The `system` section contains metadata about the asset:
- `guid`: Unique identifier for the asset
- `assetType`: The type/class name of the asset
- `schemaVersion`: Version of the data schema
- `displayName`: Human-readable name
- `category`: Category for organization
- `gameId`: Optional game identifier
- `treePath`: File path in the asset tree

The `data` section contains the actual serialized fields decorated with `@serializable`.

---

## 10. Tips

- Always update `schemaVersion` when changing the shape of serialized data, and implement a migration path.
- Keep migrations idempotent (safe to run multiple times).
- **Use JSON5 serialization for assets**: Use `instance.serialize()` and `ScriptableObject.deserialize()` for all asset files.
- The low-level `serialize()` and `deserialize()` functions work with plain objects and are used internally by the ScriptableObject system.
- Consider freezing instances (`freezeInstances`) in read-only contexts to catch accidental mutation.
