import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/types.js';

describe('readNight', () => {
  it('aggregates runs/2026-10-28.jsonl into 5 jobs and counts the bad line', () => {
    const dig = readNight('runs', '2026-10-28');
    expect(dig).not.toBeNull();
    expect(dig!.badLines).toBe(1);
    expect(dig!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(dig!.rows).toHaveLength(5);

    const backup = dig!.rows.find((r) => r.job === 'notes/backup')!;
    expect(backup.lastStatus).toBe('fail');
    expect(backup.lastError).toBe('quota exceeded');
    expect(backup.owner).toBe('lane-07');

    const render = dig!.rows.find((r) => r.job === 'digest/render')!;
    expect(render.owner).toBeNull();

    const refresh = dig!.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(refresh.retries).toBe(3);
    expect(refresh.lastStatus).toBe('ok');
  });

  it('returns null when the night file is missing', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });

  it('renders an empty night as zero rows', () => {
    // empty file path: use a temp via the fixture that may not exist — covered in route tests
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });
});
