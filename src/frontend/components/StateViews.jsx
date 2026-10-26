export function Skeleton() {
  return (
    <div className="tx-list" role="status" aria-busy="true">
      <span className="tx-sr">Loading places</span>
      {[0, 1, 2, 3].map((i) => <div key={i} className="tx-card tx-skel" />)}
    </div>
  );
}

const ERRORS = {
  config: 'The places service is not set up correctly (missing key or rejected request). Retrying will not fix this.',
  rate: 'The places service is busy. Wait a moment, then try again.',
  timeout: 'The places service took too long to answer.',
  network: 'Could not reach the places service. Check your connection.',
  http: 'The places service returned an error.',
};

export function ErrorView({ error, onRetry }) {
  return (
    <div className="tx-state" role="alert">
      <p>{ERRORS[error?.type] ?? 'Something went wrong while loading places.'}</p>
      {error?.type !== 'config' && <button className="tx-btn" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyView({ place, category, radiusKm, onWiden }) {
  return (
    <div className="tx-state">
      <p>No {category.label.toLowerCase()} found within {radiusKm} km of {place}.</p>
      <p className="tx-muted">This may be a gap in the map data, not proof that nothing is there. </p>
      {onWiden && <button className="tx-btn" onClick={onWiden}>Search within 25 km</button>}
    </div>
  );
}

export function NoPlaceView() {
  return <div className="tx-state"><p>I show tourist places: sights, museums, temples, forts and parks. Try "things to do in Paris".</p></div>;
}
