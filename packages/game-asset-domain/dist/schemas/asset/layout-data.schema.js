import { z } from 'zod';
const Vector2Schema = z.object({
    x: z.number(),
    y: z.number(),
});
const SeatPositionSchema = z.object({
    id: z.number().int(),
    label: z.string().optional(),
    position: Vector2Schema.optional(),
    anchor: Vector2Schema.optional(),
    rotation: z.number().optional(),
    scale: z.union([z.number(), Vector2Schema]).optional(),
}).passthrough();
const LayoutPresetSchema = z.object({
    playerCount: z.number().int().min(1).optional(),
    seats: z.array(SeatPositionSchema).min(1),
    table: z.any().optional(),
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
const FlatLayoutDataSchema = z.object({
    defaultPlayerCount: z.number().int().min(1),
    presets: z.record(z.string(), LayoutPresetSchema),
    gameplay: z.record(z.unknown()).default({}),
    extensions: z.record(z.unknown()).default({}),
}).passthrough();
const NestedLayoutDataSchema = z.object({
    layout: FlatLayoutDataSchema,
    gameplay: z.record(z.unknown()).default({}),
    extensions: z.record(z.unknown()).default({}),
}).passthrough();
export const LayoutDataSchema = z.union([
    FlatLayoutDataSchema,
    NestedLayoutDataSchema,
]);
