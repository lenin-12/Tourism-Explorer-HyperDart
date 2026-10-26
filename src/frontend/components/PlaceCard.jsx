import { useEffect, useRef, useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import { fetchPlacePhoto, fetchWiki } from '../lib/api';
import { formatKm } from '../lib/geo';
import { getKindKey, KindIcon } from './KindIcons';

export default function PlaceCard({ place, inPlan, selected, onToggle, onSelect, onHover, onNotify }) {
  const ref = useRef(null);
  const isSelfClick = useRef(false);
  const [justAdded, setJustAdded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const kindKey = getKindKey(place.kind);

  // Fallback photo resolution chain
  const photoAsync = useAsync((s) => fetchPlacePhoto(place, s), [place.id]);
  const photo = photoAsync.data;
  const isLoadingPhoto = photoAsync.status === 'loading';

  // Text summary from Wikipedia if available
  const wiki = useAsync((s) => fetchWiki(place.wikipedia, s), [place.id], Boolean(place.wikipedia));
  const text = wiki.data?.text || photo?.description || null;

  // when its map pin is clicked from outside, bring this card into view
  useEffect(() => {
    if (selected && !isSelfClick.current) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    isSelfClick.current = false;
  }, [selected]);

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
    isSelfClick.current = true;
    onSelect(place.id);
    setExpanded((prev) => !prev);
  };

  const showImage = Boolean(photo?.image && !imgFailed);

  return (
    <article
      ref={ref}
      className={`tx-card${selected ? ' tx-selected' : ''}${expanded ? ' tx-expanded' : ''}`}
      data-kind={kindKey}
      aria-current={selected || undefined}
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
            <KindIcon kind={place.kind} size={36} />
          </div>
        )}
      </div>
      <div className="tx-body">
        <div className="tx-badges">
          <span className="tx-badge tx-kind-badge">{place.kind}</span>
          <span className="tx-badge tx-dist-badge">{formatKm(place.distanceKm)} from centre</span>
        </div>
        <h3>{place.name}</h3>
        {place.address && <p className="tx-muted tx-place-address">{place.address}</p>}
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
              isSelfClick.current = true;
              onSelect(place.id);
              setExpanded((prev) => !prev);
            }}
          >
            {expanded ? 'Show less ▲' : 'Read more ▼'}
          </button>
        )}
        {place.hours && <p className="tx-muted">Hours: {place.hours}</p>}
        <div className="tx-actions">
          <button
            className={`tx-btn${inPlan ? ' tx-on' : ''}${justAdded ? ' tx-just-added' : ''}`}
            aria-label={`${inPlan ? 'Remove' : 'Add'} ${place.name} ${inPlan ? 'from' : 'to'} day plan`}
            onClick={handleToggle}
          >
            {justAdded ? 'Added ✓' : inPlan ? 'Remove from plan' : 'Add to plan'}
          </button>
          <a
            className="tx-link"
            target="_blank"
            rel="noreferrer"
            aria-label={`Directions to ${place.name} (opens in a new tab)`}
            href={`https://www.openstreetmap.org/directions?route=%3B${place.lat}%2C${place.lon}`}
            onClick={(e) => e.stopPropagation()}
          >
            Directions ↗
          </a>
          {place.website && (
            <a
              className="tx-link"
              target="_blank"
              rel="noreferrer"
              aria-label={`Website of ${place.name} (opens in a new tab)`}
              href={place.website}
              onClick={(e) => e.stopPropagation()}
            >
              Website ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
