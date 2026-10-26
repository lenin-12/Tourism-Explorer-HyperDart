import { formatKm } from '../lib/geo';

// The signature element: a transit-line style ribbon of stops, in visiting order.
export default function TripRoute({ stops, placeName, onRemove, onClear, onSuggest }) {
  if (!stops.length)
    return (
      <div>
        <p className="tx-muted">Add places to build a day plan for {placeName}. Stops are ordered by nearest next stop.</p>
        <button className="tx-btn" onClick={onSuggest}>Suggest 5 stops</button>
      </div>
    );
  const total = stops.reduce((sum, s) => sum + s.legKm, 0);
  return (
    <section aria-label="Day plan">
      <ol className="tx-route">
        {stops.map((s, i) => (
          <li key={s.id}>
            {i > 0 && <span className="tx-leg">{formatKm(s.legKm)} straight line</span>}
            {i === 0 && <span className="tx-leg">{formatKm(s.legKm)} from centre</span>}
            <div className="tx-stop">
              <span>{s.name}</span>
              <button className="tx-x" aria-label={`Remove ${s.name}`} onClick={() => onRemove(s)}>×</button>
            </div>
          </li>
        ))}
      </ol>
      <p className="tx-muted">About {formatKm(total)} in straight lines. Real walking or driving routes will be longer.</p>
      <button className="tx-btn tx-ghost" onClick={onClear}>Clear plan</button>
    </section>
  );
}
