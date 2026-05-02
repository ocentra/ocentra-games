import { schema } from '@ocentra/schema-domain/effect-builder';

const Vector2Schema = schema.object({
  x: schema.number(),
  y: schema.number(),
});

const SeatPositionSchema = schema.object({
  id: schema.number().int(),
  label: schema.string().optional(),
  position: Vector2Schema.optional(),
  anchor: Vector2Schema.optional(),
  rotation: schema.number().optional(),
  scale: schema.union([schema.number(), Vector2Schema]).optional(),
}).passthrough();

const LayoutPresetSchema = schema.object({
  playerCount: schema.number().int().min(1).optional(),
  seats: schema.array(SeatPositionSchema).min(1),
  table: schema.any().optional(),
  centerDeckPos: Vector2Schema.optional(),
  potPos: Vector2Schema.optional(),
}).passthrough().refine((data) => {
  if (data.playerCount !== undefined) {
    return data.seats.length === data.playerCount;
  }
  return true;
}, {
  message: 'Number of seats must match playerCount',
});

const FlatLayoutDataSchema = schema.object({
  defaultPlayerCount: schema.number().int().min(1),
  presets: schema.record(schema.string(), LayoutPresetSchema),
  gameplay: schema.record(schema.unknown()).default({}),
  extensions: schema.record(schema.unknown()).default({}),
}).passthrough();

const NestedLayoutDataSchema = schema.object({
  layout: FlatLayoutDataSchema,
  gameplay: schema.record(schema.unknown()).default({}),
  extensions: schema.record(schema.unknown()).default({}),
}).passthrough();

export const LayoutDataSchema = schema.union([
  FlatLayoutDataSchema,
  NestedLayoutDataSchema,
]);
