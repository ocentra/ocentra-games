export type ManifestResourceEntry = {
  path: string;
  guid?: string;
  hash?: string;
  checksum?: string;
  resourceEntryType: string;
};

export function dedupeResourcesByGuid(resources: ManifestResourceEntry[]): ManifestResourceEntry[] {
  const byGuid = new Map<string, ManifestResourceEntry>();
  const withoutGuid: ManifestResourceEntry[] = [];
  for (const r of resources) {
    if (r.guid) {
      const existing = byGuid.get(r.guid);
      if (!existing || (r.path.split('/').length > (existing.path.split('/').length))) {
        byGuid.set(r.guid, r);
      }
    } else {
      withoutGuid.push(r);
    }
  }
  return [...byGuid.values(), ...withoutGuid];
}
