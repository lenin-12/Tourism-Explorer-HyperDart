import { useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import { fetchPlacePhoto, fetchWiki } from '../lib/api';
import { formatKm } from '../lib/geo';
import { getKindKey, KindIcon } from './KindIcons';

function TopPickCard({ place, inPlan, selected, onToggle, onSelect, onHover, onNotify }) {
  const [justAdded, setJustAdded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const kindKey = getKindKey(place.kind);

  const photoAsync = useAsync((s) => fetchPlacePhoto(place, s), [place.id]);
  const photo = photoAsync.data;
  const isLoadingPhoto = photoAsync.status === 'loading';

  const wiki = useAsync((s) => fetchWiki(place.wikipedia, s), [place.id], Boolean(place.wikipedia));
  const text = wiki.data?.text || photo?.description || null;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!inPlan) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
      onNotify?.(`Added "${place.name}" to day plan`);
    }
    onToggle(place);
  };

  const handleCardClick = (e) => {
    if (e.target.closest('button, a')) return;
    onSelect(place.id);
    setExpanded((prev) => !prev);
  };

  const showImage = Boolean(photo?.image && !imgFailed);

  return (
    <article
      className={`tx-card tx-pick-card${selected ? ' tx-selected' : ''}${expanded ? ' tx-expanded' : ''}`}
      data-kind={kindKey}
      onClick={handleCardClick}
      onMouseEnter={() => onHover?.(place.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className={`tx-card-media${isLoadingPhoto ? ' tx-skel' : ''}`}>
        {showImage ? (
          <img
            className="tx-card-img"
            src={photo.image}
            alt={place.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : isLoadingPhoto ? null : (
          <div className="tx-card-placeholder" aria-hidden="true">
            <KindIcon kind={place.kind} size={40} />
          </div>
        )}
      </div>
      <div className="tx-body">
        <div className="tx-badges">
          <span className="tx-badge tx-kind-badge">{place.kind}</span>
          <span className="tx-badge tx-dist-badge">{formatKm(place.distanceKm)}</span>
        </div>
        <h3>{place.name}</h3>
        {text && (
          <p className={`tx-desc${expanded ? ' tx-desc-expanded' : ''}`}>
            {text}
          </p>
        )}
        {text && (
          <button
            type="button"
            className="tx-link tx-linkbtn tx-expand-toggle"
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(place.id);
              setExpanded((prev) => !prev);
            }}
          >
            {expanded ? 'Show less ▲' : 'Read more ▼'}
          </button>
        )}
        <div className="tx-actions">
          <button
            className={`tx-btn${inPlan ? ' tx-on' : ''}${justAdded ? ' tx-just-added' : ''}`}
            aria-label={`${inPlan ? 'Remove' : 'Add'} ${place.name} ${inPlan ? 'from' : 'to'} day plan`}
            onClick={handleToggle}
          >
            {justAdded ? 'Added ✓' : inPlan ? 'Remove from plan' : 'Add to plan'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function TopPicks({ places, plan, selectedId, onSelect, onHover, onNotify }) {
  if (!places || places.length < 3) return null;

  return (
    <section className="tx-top-picks" aria-label="Top picks">
      <div className="tx-top-picks-head">
        <h3>Top picks</h3>
        <span className="tx-muted" style={{ fontSize: '0.85rem' }}>Highlighted sights nearby</span>
      </div>
      <div className="tx-top-picks-row" role="region" aria-label="Top picks carousel">
        {places.map((place) => (
          <TopPickCard
            key={place.id}
            place={place}
            inPlan={plan.has(place.id)}
            selected={place.id === selectedId}
            onToggle={plan.toggle}
            onSelect={onSelect}
            onHover={onHover}
            onNotify={onNotify}
          />
        ))}
      </div>
    </section>
  );
}
