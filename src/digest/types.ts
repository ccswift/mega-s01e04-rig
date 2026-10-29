import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// One aggregated job row from a night's JSONL run log.
export type JobStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type NightDigest = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

type LogLine = {
  at: string;
  job: string;
  status: JobStatus;
  owner: string | null;
  error?: string;
};

function isStatus(s: unknown): s is JobStatus {
  return s === 'ok' || s === 'retry' || s === 'fail';
}

function parseLine(raw: string): LogLine | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.at !== 'string' || typeof o.job !== 'string' || !isStatus(o.status)) return null;
    const owner = o.owner === null || typeof o.owner === 'string' ? (o.owner as string | null) : null;
    const error = typeof o.error === 'string' ? o.error : undefined;
    return { at: o.at, job: o.job, status: o.status, owner, error };
  } catch {
    return null;
  }
}

/** Read `runs/<night>.jsonl`. Returns null when the file is missing. */
export function readNight(runsDir: string, night: string): NightDigest | null {
  const path = join(runsDir, `${night}.jsonl`);
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return null;
  }

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (!line) {
      badLines += 1;
      continue;
    }
    const prev = byJob.get(line.job);
    if (!prev) {
      byJob.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error ?? null,
        firstAt: line.at,
        lastAt: line.at,
      });
      continue;
    }
    prev.runs += 1;
    if (line.status === 'retry') prev.retries += 1;
    prev.lastStatus = line.status;
    prev.lastError = line.error ?? null;
    prev.lastAt = line.at;
    prev.owner = line.owner;
  }

  const rows = [...byJob.values()].sort((a, b) => a.job.localeCompare(b.job));
  return { night, rows, badLines };
}

/** Counts of jobs by last status — for the board night links. */
export function nightCounts(digest: NightDigest): { ok: number; retry: number; fail: number } {
  let ok = 0;
  let retry = 0;
  let fail = 0;
  for (const r of digest.rows) {
    if (r.lastStatus === 'ok') ok += 1;
    else if (r.lastStatus === 'retry') retry += 1;
    else fail += 1;
  }
  return { ok, retry, fail };
}
