/**
 * Save /digest/:night as one self-contained HTML file (ADR 0001).
 * Usage: npx tsx --env-file-if-exists=.env scripts/save-digest.ts [night] [out]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const night = process.argv[2] ?? '2026-10-28';
const out = process.argv[3] ?? `docs/preview/index.html`;

const res = await createApp(loadConfig()).request(`/digest/${night}`);
if (!res.ok) {
  console.error(`save-digest: ${res.status} for /digest/${night}`);
  process.exit(1);
}
const html = await res.text();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`wrote ${out} (${html.length} bytes)`);
