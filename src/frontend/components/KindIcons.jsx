export function getKindKey(kind) {
  if (!kind) return 'default';
  const k = kind.toLowerCase();
  if (k.includes('museum')) return 'museum';
  if (k.includes('worship') || k.includes('temple') || k.includes('church') || k.includes('mosque') || k.includes('shrine')) return 'worship';
  if (k.includes('fort') || k.includes('castle') || k.includes('palace')) return 'fort';
  if (k.includes('park') || k.includes('garden')) return 'park';
  if (k.includes('viewpoint') || k.includes('lookout')) return 'viewpoint';
  if (k.includes('monument') || k.includes('memorial')) return 'monument';
  if (k.includes('historic') || k.includes('archaeological') || k.includes('heritage')) return 'historic';
  return 'default';
}

export function isIndoorKind(kind) {
  if (!kind) return false;
  return kind.toLowerCase().includes('museum');
}

export function KindIcon({ kind, className = 'tx-icon', size = 28 }) {
  const key = getKindKey(kind);
  const props = {
    className,
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  switch (key) {
    case 'museum':
      return (
        <svg {...props}>
          <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 3L2 10h20L12 3z" />
        </svg>
      );
    case 'worship':
      return (
        <svg {...props}>
          <path d="M12 2v6m-3-3h6M5 22h14v-7l-7-5-7 5v7zM10 22v-4a2 2 0 0 1 4 0v4" />
        </svg>
      );
    case 'fort':
      return (
        <svg {...props}>
          <path d="M3 21h18M4 21V9l2-2v4h4V7l2-2 2 2v4h4V7l2 2v12M9 21v-5a3 3 0 0 1 6 0v5" />
        </svg>
      );
    case 'park':
      return (
        <svg {...props}>
          <path d="M12 22v-7m0 0a6 6 0 0 1-6-6c0-4 6-7 6-7s6 3 6 7a6 6 0 0 1-6 6z" />
          <path d="M8 12c1.5 2 4 2.5 4 2.5" />
        </svg>
      );
    case 'viewpoint':
      return (
        <svg {...props}>
          <path d="m2 20 7-10 5 6 3-4 5 8H2z" />
          <circle cx="17.5" cy="6.5" r="2.5" />
        </svg>
      );
    case 'monument':
      return (
        <svg {...props}>
          <path d="m9 22 2-18 1-2 1 2 2 18H9zM5 22h14" />
        </svg>
      );
    case 'historic':
      return (
        <svg {...props}>
          <path d="M3 21h18M6 21V7h12v14M6 11h12M10 7V4h4v3M9 21v-4a3 3 0 0 1 6 0v4" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
  }
}
