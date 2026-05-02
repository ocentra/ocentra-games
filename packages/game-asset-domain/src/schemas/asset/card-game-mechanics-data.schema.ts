import type { MechanicsSpec } from '@ocentra/game-domain/engine/mechanics/MechanicsSpec';
import {
  decodeMechanicsSpec,
  MechanicsManifestSchema,
  type MechanicsManifest,
} from '@ocentra/game-domain/schema/mechanics';

export type CardGameMechanicsData = MechanicsSpec;

export const CardGameMechanicsDataEffectSchema = MechanicsManifestSchema;

export const decodeCardGameMechanicsData = (input: unknown): CardGameMechanicsData =>
  decodeMechanicsSpec(input);

export type CardGameMechanicsManifestData = MechanicsManifest;
