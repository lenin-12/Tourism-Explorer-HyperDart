import { useState } from 'react';
import { formatKm } from '../lib/geo';

// The signature element: a transit-line style ribbon of stops, in visiting order.
export default function TripRoute({
  stops,
  placeName,
  center,
  onRemove,
  onClear,
  onPreset,
  onNotify,
}) {
  const [copied, setCopied] = useState(false);

  const total = stops.reduce((sum, s) => sum + s.legKm, 0);

  const handleCopy = async () => {
    if (!stops.length) return;
    const lines = [
      `Day plan for ${placeName}:`,
      ...stops.map((s, i) => `${i + 1}. ${s.name} (${i === 0 ? formatKm(s.legKm) + ' from centre' : formatKm(s.legKm) + ' from prev stop'})`),
      `Total: about ${formatKm(total)} straight line.`,
    ];
    const text = lines.join('\n');
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onNotify?.('Day plan copied to clipboard! ✓');
    } catch {
      onNotify?.('Failed to copy plan to clipboard');
    }
  };

  const getMapsUrl = () => {
    if (!stops.length) return '#';
    const coords = [center && `${center.lat},${center.lon}`, ...stops.map((s) => `${s.lat},${s.lon}`)].filter(Boolean);
    return `https://www.google.com/maps/dir/${coords.join('/')}`;
  };

  return (
    <section aria-label="Day plan">
      <div className="tx-plan-presets" role="group" aria-label="Day plan presets">
        <span className="tx-preset-label">Presets:</span>
        <button className="tx-chip tx-preset-btn" onClick={() => onPreset(2)}>2 hours</button>
        <button className="tx-chip tx-preset-btn" onClick={() => onPreset(4)}>Half day</button>
        <button className="tx-chip tx-preset-btn" onClick={() => onPreset(6)}>Full day</button>
      </div>

      {!stops.length ? (
        <div style={{ marginTop: '12px' }}>
          <p className="tx-muted">
            Add places to build a day plan for {placeName}. Stops are ordered by nearest next stop.
          </p>
          <button className="tx-btn" onClick={() => onPreset(5)}>Suggest 5 stops</button>
        </div>
      ) : (
        <>
          <ol className="tx-route">
            {stops.map((s, i) => (
              <li key={s.id}>
                {i > 0 && <span className="tx-leg">{formatKm(s.legKm)} straight line</span>}
                {i === 0 && <span className="tx-leg">{formatKm(s.legKm)} from centre</span>}
                <div className="tx-stop">
                  <span>
                    <strong>{i + 1}.</strong> {s.name}
                  </span>
                  <button className="tx-x" aria-label={`Remove ${s.name}`} onClick={() => onRemove(s)}>×</button>
                </div>
              </li>
            ))}
          </ol>
          <p className="tx-muted">About {formatKm(total)} in straight lines. Real walking or driving routes will be longer.</p>
          <div className="tx-actions tx-plan-actions">
            <a
              className="tx-btn"
              target="_blank"
              rel="noreferrer"
              aria-label="Open route in Google Maps (opens in a new tab)"
              href={getMapsUrl()}
            >
              Open route in Maps ↗
            </a>
            <button
              className={`tx-btn${copied ? ' tx-just-added' : ''}`}
              aria-label="Copy day plan to clipboard"
              onClick={handleCopy}
            >
              {copied ? 'Copied ✓' : 'Copy plan'}
            </button>
            <button className="tx-btn tx-ghost" onClick={onClear}>Clear plan</button>
          </div>
        </>
      )}
    </section>
  );
}
