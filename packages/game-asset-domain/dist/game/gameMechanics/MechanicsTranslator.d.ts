import type { CardGameMechanicsData } from '../../schemas/asset/card-game-mechanics-data.schema';
import type { MechanicsSpec } from '@ocentra/game-domain/engine/mechanics/MechanicsSpec';
export declare function toMechanicsSpec(data: CardGameMechanicsData): MechanicsSpec;
