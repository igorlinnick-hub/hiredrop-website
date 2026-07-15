/**
 * HireDrop illustration identity — monoline spot illustrations.
 *
 * RULES (see ILLUSTRATION_IDENTITY.md):
 *  - Objects & abstract motifs only. NEVER human figures in SVG (reads amateur).
 *  - Single-weight monoline stroke in brand purple #6C5CE7, round caps/joins.
 *  - One focal element gets a solid/gradient accent fill; everything else is line.
 *  - Soft #EEE9FF washes for depth; #a78bfa for secondary + decorative marks.
 *  - Each scene carries 3–4 scattered marks (+ × ✳ · ◦) — the signature texture.
 *  - viewBox 0 0 128 128, transparent background (works on light or dark).
 */

const S = "#6C5CE7"; // stroke / primary
const L = "#a78bfa"; // light accent / decorative
const F = "#EEE9FF"; // fill wash

type MarkProps = { x: number; y: number; s?: number; c?: string };

const Plus = ({ x, y, s = 6, c = L }: MarkProps) => (
  <path d={`M${x - s} ${y}H${x + s}M${x} ${y - s}V${y + s}`} stroke={c} strokeWidth={2} strokeLinecap="round" />
);
const Cross = ({ x, y, s = 5, c = L }: MarkProps) => (
  <path
    d={`M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}`}
    stroke={c}
    strokeWidth={2}
    strokeLinecap="round"
  />
);
const Dot = ({ x, y, s = 2.5, c = L }: MarkProps) => <circle cx={x} cy={y} r={s} fill={c} />;
const Ring = ({ x, y, s = 5, c = L }: MarkProps) => (
  <circle cx={x} cy={y} r={s} stroke={c} strokeWidth={2} fill="none" />
);
const Sparkle = ({ x, y, s = 8, c = S }: MarkProps) => (
  <g transform={`translate(${x} ${y}) scale(${s / 8})`}>
    <path
      d="M0 -8 C0.9 -2.2 2.2 -0.9 8 0 C2.2 0.9 0.9 2.2 0 8 C-0.9 2.2 -2.2 0.9 -8 0 C-2.2 -0.9 -0.9 -2.2 0 -8 Z"
      fill={c}
    />
  </g>
);

export interface IllustrationProps {
  size?: number;
  className?: string;
}

function Frame({ size = 140, className, children }: IllustrationProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      role="img"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

/** Ban-safe: a shield with a check. */
export function IllustrationSafe(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <path
        d="M64 16 L100 30 L100 58 C100 83 86 100 64 112 C42 100 28 83 28 58 L28 30 Z"
        fill={F}
        fillOpacity={0.6}
        stroke={S}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path d="M48 61 L60 73 L82 48" stroke={S} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Sparkle x={26} y={40} s={7} c={S} />
      <Plus x={104} y={48} s={6} c={L} />
      <Cross x={32} y={98} s={5} c={L} />
      <Dot x={100} y={92} s={3} c={L} />
    </Frame>
  );
}

/** Tailored: a document with a sparkle and a highlighted field. */
export function IllustrationTailored(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <g transform="rotate(-6 64 64)">
        <rect x={40} y={24} width={48} height={80} rx={7} stroke={S} strokeWidth={3} fill="#ffffff" />
        <path d="M74 24 L88 38 L74 38 Z" fill={F} stroke={S} strokeWidth={3} strokeLinejoin="round" />
        <path d="M50 50 H78" stroke={L} strokeWidth={2.5} strokeLinecap="round" />
        <path d="M50 60 H78" stroke={L} strokeWidth={2.5} strokeLinecap="round" />
        <rect x={50} y={72} width={28} height={12} rx={3} fill={F} stroke={S} strokeWidth={2} />
      </g>
      <Sparkle x={94} y={30} s={10} c={S} />
      <Plus x={26} y={46} s={6} c={L} />
      <Cross x={34} y={102} s={5} c={L} />
      <Dot x={102} y={82} s={3} c={L} />
    </Frame>
  );
}

/** Send / apply: a paper plane with a motion trail. */
export function IllustrationSend(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <path d="M24 60 L64 72 L72 104 Z" fill={F} />
      <path d="M24 60 L104 24 L72 104 Z" stroke={S} strokeWidth={3} strokeLinejoin="round" />
      <path d="M24 60 L64 72 L104 24" stroke={S} strokeWidth={3} strokeLinejoin="round" />
      <path d="M64 72 L72 104" stroke={S} strokeWidth={3} strokeLinecap="round" />
      <path d="M14 96 Q32 84 26 66" stroke={L} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="1 7" />
      <Sparkle x={100} y={46} s={8} c={S} />
      <Plus x={42} y={30} s={6} c={L} />
      <Dot x={108} y={88} s={3} c={L} />
    </Frame>
  );
}

/** Done / welcome: the AI orb with a check and a celebratory burst. */
export function IllustrationLaunch(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <defs>
        <linearGradient id="hd-orb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={L} />
          <stop offset="1" stopColor={S} />
        </linearGradient>
      </defs>
      {/* burst rays */}
      <g stroke={L} strokeWidth={2.5} strokeLinecap="round">
        <path d="M64 22 V32" />
        <path d="M98 34 L91 41" />
        <path d="M106 64 H96" />
        <path d="M30 34 L37 41" />
        <path d="M22 64 H32" />
      </g>
      <circle cx={64} cy={62} r={22} fill="url(#hd-orb)" />
      <path d="M54 62 L61 69 L75 53" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Sparkle x={98} y={92} s={9} c={S} />
      <Sparkle x={30} y={96} s={6} c={L} />
      <Dot x={92} y={30} s={3} c={L} />
      <Plus x={34} y={80} s={6} c={L} />
    </Frame>
  );
}
