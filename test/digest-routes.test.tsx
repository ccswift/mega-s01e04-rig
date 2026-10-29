import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function appWithRuns(runsDir: string) {
  return createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
}

describe('digest routes', () => {
  it('GET /digest/:night returns 200 for a real night', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await appWithRuns('runs').request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('digest · 2026-10-28');
    expect(html).toContain('notes/backup');
    expect(html).toContain('digest/render');
  });

  it('GET /digest/:night returns 404 when the night file is missing', async () => {
    const res = await appWithRuns('runs').request('/digest/1999-01-01');
    expect(res.status).toBe(404);
  });

  it('empty night renders "nothing ran"', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    const res = await appWithRuns(dir).request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('a night with a bad line still renders', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(
      join(dir, '2026-01-02.jsonl'),
      [
        '{"at":"2026-01-02T01:00:00+01:00","job":"a/job","status":"ok","owner":"rook"}',
        'NOT JSON',
        '{"at":"2026-01-02T02:00:00+01:00","job":"b/job","status":"fail","owner":null,"error":"x"}',
        '',
      ].join('\n'),
    );
    const htmlRes = await appWithRuns(dir).request('/digest/2026-01-02');
    const html = await htmlRes.text();
    expect(htmlRes.status).toBe(200);
    expect(html).toContain('a/job');
    expect(html).toContain('b/job');
    expect(html).toContain('1 bad line');

    const jsonRes = await appWithRuns(dir).request('/api/digest/2026-01-02');
    const rows = (await jsonRes.json()) as { job: string }[];
    expect(jsonRes.status).toBe(200);
    expect(rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
  });

  it('GET /api/digest/:night matches page job order for 2026-10-28', async () => {
    const app = appWithRuns('runs');
    const html = await (await app.request('/digest/2026-10-28')).text();
    const rows = (await (await app.request('/api/digest/2026-10-28')).json()) as { job: string }[];
    const jobs = rows.map((r) => r.job);
    expect(jobs).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    for (const job of jobs) expect(html).toContain(job);
    // page table order follows the same job sort
    const positions = jobs.map((j) => html.indexOf(j));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('GET /api/digest/:night returns 404 when missing', async () => {
    const res = await appWithRuns('runs').request('/api/digest/1999-01-01');
    expect(res.status).toBe(404);
  });
});

describe('board digest links', () => {
  it('links both nights on disk to a digest', async () => {
    const html = await (await appWithRuns('runs').request('/')).text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toContain('ok ');
    expect(html).toContain('retry ');
    expect(html).toContain('fail ');
  });
});
