import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { FileExtension, PathSeparator, RandomString } from '@ocentra/endpoint-domain/constants/paths';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';
import { sanitizePathComponent, buildSafePathKey } from '@ocentra/endpoint-domain/utils/path-sanitizer';

export const buildSafeBucketKey = buildSafePathKey;

export function buildMatchKey(matchId: MatchId): string {
  return `${BucketPath.Matches}${sanitizePathComponent(matchId)}${FileExtension.Json}`;
}

export function buildDeletedMatchKey(matchId: MatchId): string {
  return `${BucketPath.MatchesDeleted}${sanitizePathComponent(matchId)}${FileExtension.Json}`;
}

export function buildAnonymizedMatchKey(matchId: MatchId): string {
  return `${BucketPath.MatchesAnonymized}${sanitizePathComponent(matchId)}${FileExtension.Json}`;
}

export function buildDisputeKey(disputeId: string): string {
  return `${BucketPath.Disputes}${sanitizePathComponent(disputeId)}${FileExtension.Json}`;
}

export function buildArchiveKey(matchId: MatchId): string {
  return `${BucketPath.Archive}${sanitizePathComponent(matchId)}${FileExtension.Json}`;
}

export function buildEvidenceKey(disputeId: string, filename: string): string {
  return buildSafePathKey(BucketPath.DisputesEvidence, disputeId, sanitizePathComponent(filename));
}

export function generateUniqueFilename(prefix: string, extension: string = FileExtension.Json): string {
  return `${sanitizePathComponent(prefix)}${PathSeparator.Dash}${Date.now()}${PathSeparator.Dash}${Math.random().toString(RandomString.Radix).substring(RandomString.StartIndex, RandomString.Length)}${extension}`;
}
