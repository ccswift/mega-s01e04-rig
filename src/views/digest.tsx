import type { DigestRow, NightDigest } from '../digest/types.js';

function ownerCell(owner: string | null) {
  return owner ?? '—';
}

function rowClass(row: DigestRow): string | undefined {
  if (row.lastStatus === 'fail' || row.retries >= 3) return 'warn';
  return undefined;
}

export function DigestPage({ digest }: { digest: NightDigest }) {
  if (digest.rows.length === 0) {
    return (
      <>
        <h1>digest · {digest.night}</h1>
        <p class="mute">nothing ran</p>
      </>
    );
  }

  return (
    <>
      <h1>digest · {digest.night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last</th>
            <th>error</th>
            <th>first</th>
            <th>last</th>
          </tr>
        </thead>
        <tbody>
          {digest.rows.map((r) => (
            <tr class={rowClass(r)}>
              <td>{r.job}</td>
              <td>{ownerCell(r.owner)}</td>
              <td>{r.runs}</td>
              <td>{r.retries}</td>
              <td>{r.lastStatus}</td>
              <td>{r.lastError ?? '—'}</td>
              <td>{r.firstAt}</td>
              <td>{r.lastAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {digest.badLines > 0 ? (
        <p class="mute">{digest.badLines} bad line{digest.badLines === 1 ? '' : 's'} skipped</p>
      ) : null}
    </>
  );
}
