import { describe, it, expect } from 'vitest';
import { parsePrCheckIngestArgs } from './ingest';

describe('parsePrCheckIngestArgs', () => {
  it('parses required and optional flags', () => {
    expect(
      parsePrCheckIngestArgs([
        '--repo',
        'o/r',
        '--pr-json-file',
        '/tmp/pr.json',
        '--runs-json-file',
        '/tmp/runs.json',
      ]),
    ).toEqual({
      repoFull: 'o/r',
      prJsonFile: '/tmp/pr.json',
      runsJsonFile: '/tmp/runs.json',
    });
  });

  it('parses repo and pr-json only', () => {
    expect(parsePrCheckIngestArgs(['--repo', 'a/b', '--pr-json-file', '/p.json'])).toEqual({
      repoFull: 'a/b',
      prJsonFile: '/p.json',
      runsJsonFile: undefined,
    });
  });

  it('returns null when incomplete', () => {
    expect(parsePrCheckIngestArgs(['--repo', 'o/r'])).toBe(null);
  });
});
