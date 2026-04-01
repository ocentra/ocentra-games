import { GameNameSchema, GameIdSchema, AssetNameSchema } from './schemas';

export interface ValidationState {
  isValid: boolean;
  errorMessage?: string;
}

function toValidationState(
  result: { success: true } | { success: false; error: { issues: { message: string }[] } }
): ValidationState {
  if (result.success) return { isValid: true };
  const msg = result.error.issues[0]?.message;
  return { isValid: false, errorMessage: msg };
}

export function validateGameName(gameName: string): ValidationState {
  return toValidationState(GameNameSchema.safeParse(gameName));
}

export function validateGameId(gameId: string): ValidationState {
  return toValidationState(GameIdSchema.safeParse(gameId));
}

export function validateAssetName(assetName: string): ValidationState {
  return toValidationState(AssetNameSchema.safeParse(assetName));
}
