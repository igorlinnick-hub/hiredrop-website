// Signature decorative marks — subtle monoline accents (+ × ✨ • ◦) scattered in
// brand purple. Absolute, decorative-only layer; the parent must be `relative`.
// Keep opacities low — this is texture, never a focal element.

type MarkType = "sparkle" | "plus" | "cross" | "dot" | "ring";
interface Mark {
  t: string; // top %
  l: string; // left %
  s: number; // size px
  o: number; // opacity
  type: MarkType;
  light?: boolean; // use lighter accent2
}

const DEFAULT_MARKS: Mark[] = [
  { t: "14%", l: "7%", s: 18, o: 0.35, type: "sparkle" },
  { t: "24%", l: "90%", s: 13, o: 0.3, type: "plus", light: true },
  { t: "68%", l: "5%", s: 11, o: 0.25, type: "cross", light: true },
  { t: "80%", l: "93%", s: 15, o: 0.3, type: "sparkle" },
  { t: "44%", l: "96%", s: 6, o: 0.4, type: "dot", light: true },
  { t: "58%", l: "3%", s: 11, o: 0.22, type: "ring", light: true },
  { t: "9%", l: "58%", s: 5, o: 0.35, type: "dot" },
  { t: "88%", l: "38%", s: 13, o: 0.2, type: "plus", light: true },
];

function MarkGlyph({ mark }: { mark: Mark }) {
  const color = mark.light ? "#a78bfa" : "#6C5CE7";
  const half = mark.s / 2;
  const common = { stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, fill: "none" };
  return (
    <span
      className="absolute"
      style={{ top: mark.t, left: mark.l, opacity: mark.o, transform: "translate(-50%, -50%)" }}
      aria-hidden
    >
      <svg width={mark.s} height={mark.s} viewBox={`0 0 ${mark.s} ${mark.s}`}>
        {mark.type === "plus" && <path d={`M${half} 2V${mark.s - 2}M2 ${half}H${mark.s - 2}`} {...common} />}
        {mark.type === "cross" && (
          <path d={`M3 3L${mark.s - 3} ${mark.s - 3}M${mark.s - 3} 3L3 ${mark.s - 3}`} {...common} />
        )}
        {mark.type === "dot" && <circle cx={half} cy={half} r={half - 1} fill={color} />}
        {mark.type === "ring" && <circle cx={half} cy={half} r={half - 2} {...common} />}
        {mark.type === "sparkle" && (
          <path
            transform={`translate(${half} ${half}) scale(${mark.s / 16})`}
            d="M0 -8 C0.9 -2.2 2.2 -0.9 8 0 C2.2 0.9 0.9 2.2 0 8 C-0.9 2.2 -2.2 0.9 -8 0 C-2.2 -0.9 -0.9 -2.2 0 -8 Z"
            fill={color}
          />
        )}
      </svg>
    </span>
  );
}

export default function DecorMarks({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {DEFAULT_MARKS.map((m, i) => (
        <MarkGlyph key={i} mark={m} />
      ))}
    </div>
  );
}
