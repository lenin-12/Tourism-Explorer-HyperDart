import { getKindKey } from './KindIcons';

// Filter chips built from the kinds actually present in the results.
export default function KindFilter({ places, kind, onChange }) {
  const counts = new Map();
  places.forEach((p) => counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1));
  if (counts.size < 2) return null;

  return (
    <div className="tx-days" role="group" aria-label="Filter by type">
      <button className="tx-chip" aria-pressed={kind === null} onClick={() => onChange(null)}>
        All ({places.length})
      </button>
      {[...counts].map(([k, n]) => {
        const kindKey = getKindKey(k);
        return (
          <button
            key={k}
            className="tx-chip"
            data-kind={kindKey}
            aria-pressed={kind === k}
            onClick={() => onChange(k)}
          >
            <span className="tx-chip-dot" aria-hidden="true" style={{ background: 'var(--k-color)' }} />
            {k} ({n})
          </button>
        );
      })}
    </div>
  );
}
