import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { CompetitionProgramsResponseSchema } from '@ocentra/endpoint-domain/schemas/competition';

describe('competition public feed', () => {
  it('keeps beta public programs empty until real events or tournaments are authored', async () => {
    const publicFeedPath = path.join(process.cwd(), 'packages', 'asset-editor', BucketPath.CompetitionProgramsIndex);
    const rawFeed = await readFile(publicFeedPath, 'utf8');
    const feed = CompetitionProgramsResponseSchema.parse(JSON.parse(rawFeed));

    expect(feed.programs).toEqual([]);
    expect(feed.featuredProgramId).toBeUndefined();
  });
});
