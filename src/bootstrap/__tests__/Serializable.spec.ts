// Using globals from vitest.config.ts (globals: true)
import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { configureSerialization, deserialize, serialize, SCHEMA_VERSION_KEY } from '@ocentra/asset-domain/Serializable';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';

@serializableClass({
  schemaVersion: 1,
  assetType: 'ChildConfig',
  displayName: 'Child Config',
  category: AssetTypeCategory.Content,
})
class ChildConfig extends ScriptableObject {

  @serializable()
  value = 1;
}

@serializableClass({
  schemaVersion: 1,
  assetType: 'ParentConfig',
  displayName: 'Parent Config',
  category: AssetTypeCategory.Content,
})
class ParentConfig extends ScriptableObject {

  @serializable({ elementType: ChildConfig })
  children: ChildConfig[] = [new ChildConfig()];

  @serializable()
  label = 'test';
}

@serializableClass({
  schemaVersion: 1,
  assetType: 'ConfigWithDefaults',
  displayName: 'Config With Defaults',
  category: AssetTypeCategory.Content,
})
class ConfigWithDefaults extends ScriptableObject {

  @serializable()
  name = 'default';

  @serializable()
  count = 42;

  @serializable()
  optional?: string;
}

@serializableClass({
  schemaVersion: 2,
  assetType: 'MigratableConfig',
  displayName: 'Migratable Config',
  category: AssetTypeCategory.Content,
})
class MigratableConfig extends ScriptableObject {

  @serializable()
  value = 0;

  @serializable()
  migrated = false;

  static migrate(data: Record<string, unknown>): Record<string, unknown> {
    if (data[SCHEMA_VERSION_KEY] === 1) {
      return {
        ...data,
        value: (data.value as number) * 2,
        migrated: true,
        [SCHEMA_VERSION_KEY]: 2,
      };
    }
    return { ...data, [SCHEMA_VERSION_KEY]: 2 };
  }
}

@serializableClass({
  schemaVersion: 1,
  assetType: 'ConfigWithPrimitives',
  displayName: 'Config With Primitives',
  category: AssetTypeCategory.Content,
})
class ConfigWithPrimitives extends ScriptableObject {

  @serializable()
  text = 'hello';

  @serializable()
  number = 123;

  @serializable()
  flag = true;

  @serializable()
  nullable: string | null = null;

  @serializable()
  undefinedValue?: string;
}

@serializableClass({
  schemaVersion: 1,
  assetType: 'ConfigWithPlainObject',
  displayName: 'Config With Plain Object',
  category: AssetTypeCategory.Content,
})
class ConfigWithPlainObject extends ScriptableObject {

  @serializable()
  metadata: Record<string, unknown> = { key: 'value' };
}

describe('Serializable utilities', () => {
  afterEach(() => {
    configureSerialization({ deepClone: true, freezeResults: true, freezeInstances: false });
  });

  it('serializes nested serializable objects', () => {
    const parent = new ParentConfig();
    parent.children[0].value = 42;

    const json = serialize(parent);

    expect(json.label).toBe('test');
    expect(Array.isArray(json.children)).toBe(true);
    expect((json.children as Array<Record<string, unknown>>)[0].value).toBe(42);
    expect((json.children as Array<Record<string, unknown>>)[0][SCHEMA_VERSION_KEY]).toBe(1);
  });

  it('deserializes nested serializable objects', () => {
    const json = {
      label: 'loaded',
      children: [{ value: 99, __schemaVersion: 1 }],
      __schemaVersion: 1,
    };

    const config = deserialize(ParentConfig, json);

    expect(config.label).toBe('loaded');
    expect(config.children[0]).toBeInstanceOf(ChildConfig);
    expect(config.children[0].value).toBe(99);
  });

  it('supports immutability toggles', () => {
    configureSerialization({ freezeResults: false, freezeInstances: true });

    const json = serialize(new ParentConfig());
    expect(Object.isFrozen(json)).toBe(false);

    const instance = deserialize(ParentConfig, json as Record<string, unknown>);
    expect(Object.isFrozen(instance)).toBe(true);
  });

  it('handles default values when fields are missing', () => {
    const json = {
      [SCHEMA_VERSION_KEY]: 1,
      // name and count are missing, should use defaults
    };

    const config = deserialize(ConfigWithDefaults, json);

    expect(config.name).toBe('default');
    expect(config.count).toBe(42);
    expect(config.optional).toBeUndefined();
  });

  it('uses provided values over defaults', () => {
    const json = {
      [SCHEMA_VERSION_KEY]: 1,
      name: 'custom',
      count: 100,
    };

    const config = deserialize(ConfigWithDefaults, json);

    expect(config.name).toBe('custom');
    expect(config.count).toBe(100);
  });

  it('handles schema migration', () => {
    const oldJson = {
      value: 5,
      [SCHEMA_VERSION_KEY]: 1,
    };

    const config = deserialize(MigratableConfig, oldJson);

    expect(config.value).toBe(10); // Migrated: 5 * 2
    expect(config.migrated).toBe(true);
  });

  it('handles missing schema version gracefully', () => {
    const json = {
      value: 1,
      // No __schemaVersion
    };

    // Should not throw, but will warn
    const config = deserialize(ConfigWithDefaults, json);
    expect(config.name).toBe('default');
    expect(config.count).toBe(42);
  });

  it('handles schema version mismatch without migration', () => {
    @serializableClass({
      schemaVersion: 2,
      assetType: 'NoMigrationConfig',
      displayName: 'No Migration Config',
      category: AssetTypeCategory.Content,
    })
    class NoMigrationConfig extends ScriptableObject {

      @serializable()
      value = 0;
    }

    const json = {
      value: 5,
      [SCHEMA_VERSION_KEY]: 1, // Old version
    };

    // Should not throw, but will warn
    const config = deserialize(NoMigrationConfig, json);
    expect(config.value).toBe(5);
  });

  it('serializes primitive types correctly', () => {
    const config = new ConfigWithPrimitives();
    const json = serialize(config);

    expect(json.text).toBe('hello');
    expect(json.number).toBe(123);
    expect(json.flag).toBe(true);
    expect(json.nullable).toBeNull();
    expect(json.undefinedValue).toBeUndefined();
  });

  it('deserializes primitive types correctly', () => {
    const json = {
      [SCHEMA_VERSION_KEY]: 1,
      text: 'world',
      number: 456,
      flag: false,
      nullable: null,
    };

    const config = deserialize(ConfigWithPrimitives, json);

    expect(config.text).toBe('world');
    expect(config.number).toBe(456);
    expect(config.flag).toBe(false);
    expect(config.nullable).toBeNull();
    expect(config.undefinedValue).toBeUndefined();
  });

  it('handles empty arrays', () => {
    const parent = new ParentConfig();
    parent.children = [];

    const json = serialize(parent);
    expect(Array.isArray(json.children)).toBe(true);
    expect((json.children as unknown[]).length).toBe(0);

    const deserialized = deserialize(ParentConfig, json);
    expect(Array.isArray(deserialized.children)).toBe(true);
    expect(deserialized.children.length).toBe(0);
  });

  it('handles plain objects (non-serializable)', () => {
    const config = new ConfigWithPlainObject();
    config.metadata = { nested: { key: 'value' } };

    const json = serialize(config);
    expect(json.metadata).toEqual({ nested: { key: 'value' } });

    const deserialized = deserialize(ConfigWithPlainObject, json);
    expect(deserialized.metadata).toEqual({ nested: { key: 'value' } });
  });

  it('detects circular references and throws', () => {
    @serializableClass({
      schemaVersion: 1,
      assetType: 'CircularConfig',
      displayName: 'Circular Config',
      category: AssetTypeCategory.Content,
    })
    class CircularConfig extends ScriptableObject {

      @serializable()
      self?: CircularConfig;
    }

    const config = new CircularConfig();
    config.self = config; // Create circular reference

    expect(() => serialize(config)).toThrow('Circular reference detected while serializing object graph.');
  });

  it('supports deep clone toggle', () => {
    configureSerialization({ freezeResults: false });

    const parent = new ParentConfig();
    const json = serialize(parent);

    // With deepClone: false, modifying original shouldn't affect serialized (but arrays are still cloned)
    parent.label = 'modified';
    expect(json.label).toBe('test'); // Still 'test' because serialize creates new object

    configureSerialization({ deepClone: true });
  });

  it('handles arrays without elementType', () => {
    @serializableClass({
      schemaVersion: 1,
      assetType: 'ArrayConfig',
      displayName: 'Array Config',
      category: AssetTypeCategory.Content,
    })
    class ArrayConfig extends ScriptableObject {

      @serializable()
      numbers: number[] = [1, 2, 3];
    }

    const config = new ArrayConfig();
    const json = serialize(config);

    expect(Array.isArray(json.numbers)).toBe(true);
    expect(json.numbers).toEqual([1, 2, 3]);

    const deserialized = deserialize(ArrayConfig, json);
    expect(deserialized.numbers).toEqual([1, 2, 3]);
  });
});

describe('JSON5 serialization with system/data structure', () => {
  it('serializes to system/data format', () => {
    const config = new ConfigWithPrimitives();
    config.text = 'test json5';
    config.number = 999;

    const json5 = config.serialize();

    expect(json5).toContain('system');
    expect(json5).toContain('data');
    expect(json5).toContain('assetType');
    expect(json5).toContain('schemaVersion');
    expect(json5).toContain('displayName');
    expect(json5).toContain('category');
    expect(json5).toContain('text: "test json5"');
    expect(json5).toContain('number: 999');
  });

  it('deserializes from system/data format', () => {
    const json5 = `{
  "system": {
    "assetType": "ConfigWithPrimitives",
    "schemaVersion": 1
  },
  "data": {
    "text": "world",
    "number": 456,
    "flag": false,
    "nullable": null
  }
}`;

    const config = ScriptableObject.deserialize(ConfigWithPrimitives, json5);

    expect(config).toBeInstanceOf(ConfigWithPrimitives);
    expect(config.text).toBe('world');
    expect(config.number).toBe(456);
    expect(config.flag).toBe(false);
    expect(config.nullable).toBeNull();
  });


  it('handles nested objects in system/data format', () => {
    const parent = new ParentConfig();
    parent.children[0].value = 42;
    parent.label = 'parent test';

    const json5 = parent.serialize();
    const restored = ScriptableObject.deserialize(ParentConfig, json5);

    expect(restored.label).toBe('parent test');
    expect(restored.children[0]).toBeInstanceOf(ChildConfig);
    expect(restored.children[0].value).toBe(42);
  });

  it('handles schema migration in system/data format', () => {
    const oldJson5 = `{
  "system": {
    "assetType": "MigratableConfig",
    "schemaVersion": 1
  },
  "data": {
    "value": 5
  }
}`;

    const config = ScriptableObject.deserialize(MigratableConfig, oldJson5);

    expect(config.value).toBe(10);
    expect(config.migrated).toBe(true);
  });

});

