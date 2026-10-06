export const PILL_COLORS = {
  violet: '#a08cf5',
  pink: '#f5a5bf',
  white: '#fbfbfd',
  yellow: '#f6c63f',
  orange: '#f59a4e',
  peach: '#f7c6a3',
  green: '#7bcb8c',
  blue: '#86b6f7'
};

export function PillIcon({ pill = {}, size = 28, tilt = 0, faded }) {
  const c = PILL_COLORS[pill.color] || '#e6e6ee';
  const c2 = PILL_COLORS[pill.color2] || c;
  const scale = pill.size === 'large' ? 1.12 : pill.size === 'small' ? 0.8 : 0.95;
  const stroke = 'rgba(28, 26, 51, .22)';
  let body;
  if (pill.shape === 'capsule') {
    body = (
      <g transform="rotate(-32 20 20)">
        <clipPath id={'cap-' + pill.color + pill.color2}><rect x="5" y="13.5" width="30" height="13" rx="6.5" /></clipPath>
        <g clipPath={'url(#cap-' + pill.color + pill.color2 + ')'}>
          <rect x="5" y="13.5" width="15" height="13" fill={c} />
          <rect x="20" y="13.5" width="15" height="13" fill={c2} />
          <rect x="7" y="15.5" width="26" height="3" rx="1.5" fill="#fff" opacity=".45" />
        </g>
        <rect x="5" y="13.5" width="30" height="13" rx="6.5" fill="none" stroke={stroke} strokeWidth="1.1" />
      </g>
    );
  } else if (pill.shape === 'softgel') {
    body = (
      <g transform="rotate(-24 20 20)">
        <ellipse cx="20" cy="20" rx="13" ry="9" fill={c} opacity=".92" stroke={stroke} strokeWidth="1" />
        <ellipse cx="15.5" cy="16.8" rx="5" ry="2.4" fill="#fff" opacity=".7" />
      </g>
    );
  } else if (pill.shape === 'oval') {
    body = (
      <g transform="rotate(-24 20 20)">
        <rect x="6" y="12" width="28" height="16" rx="8" fill={c} stroke={stroke} strokeWidth="1.1" />
        <line x1="20" y1="14.5" x2="20" y2="25.5" stroke={stroke} strokeWidth="1" />
        <rect x="9" y="14" width="10" height="3" rx="1.5" fill="#fff" opacity=".55" />
      </g>
    );
  } else {
    body = (
      <g>
        <circle cx="20" cy="20" r="11" fill={c} stroke={stroke} strokeWidth="1.1" />
        <line x1="12.5" y1="20" x2="27.5" y2="20" stroke={stroke} strokeWidth="1" />
        <ellipse cx="16" cy="15.5" rx="4" ry="2" fill="#fff" opacity=".55" />
      </g>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={'pill-icon' + (faded ? ' is-faded' : '')} style={{ transform: 'rotate(' + tilt + 'deg) scale(' + scale + ')' }}>
      {body}
    </svg>
  );
}
