import { useEffect, useRef } from 'react';
import { useAsync } from '../hooks/useAsync';
import { fetchWiki } from '../lib/api';
import { formatKm } from '../lib/geo';

export default function PlaceCard({ place, inPlan, selected, onToggle, onSelect }) {
  const ref = useRef(null);
  // Description and photo are optional: if Wikipedia has nothing, we show nothing.
  const wiki = useAsync((s) => fetchWiki(place.wikipedia, s), [place.id], Boolean(place.wikipedia));
  const info = wiki.data;

  // when its map pin is clicked, bring this card into view
  useEffect(() => { if (selected) ref.current?.scrollIntoView({ block: 'nearest' }); }, [selected]);

  return (
    <article ref={ref} className={`tx-card${selected ? ' tx-selected' : ''}`} aria-current={selected || undefined}>
      {info?.image && <img className="tx-thumb" src={info.image} alt="" loading="lazy" />}
      <div className="tx-body">
        <h3>{place.name}</h3>
        <p className="tx-meta">{place.kind} · {formatKm(place.distanceKm)} from centre</p>
        {place.address && <p className="tx-muted">{place.address}</p>}
        {info?.text && <p className="tx-desc">{info.text}</p>}
        {place.hours && <p className="tx-muted">Hours: {place.hours}</p>}
        <div className="tx-actions">
          {/* the visible text already changes, so no aria-pressed; the label names the place for screen readers */}
          <button className={`tx-btn${inPlan ? ' tx-on' : ''}`} aria-label={`${inPlan ? 'Remove' : 'Add'} ${place.name} ${inPlan ? 'from' : 'to'} day plan`}
                  onClick={() => onToggle(place)}>
            {inPlan ? 'Remove from plan' : 'Add to plan'}
          </button>
          <button className="tx-btn" aria-label={`Show ${place.name} on map`} onClick={() => onSelect(place.id)}>Show on map</button>
          <a className="tx-link" target="_blank" rel="noreferrer" aria-label={`Directions to ${place.name} (opens in a new tab)`}
             href={`https://www.openstreetmap.org/directions?route=%3B${place.lat}%2C${place.lon}`}>Directions</a>
          {place.website && <a className="tx-link" target="_blank" rel="noreferrer" aria-label={`Website of ${place.name} (opens in a new tab)`} href={place.website}>Website</a>}
        </div>
      </div>
    </article>
  );
}
