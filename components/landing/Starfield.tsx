// A deterministic starfield (no Math.random → no hydration mismatch). Small white
// dots that twinkle. Purely decorative; render inside a dark, positioned layer.

const STARS = Array.from({ length: 54 }, (_, i) => ({
  // spread across using coprime multipliers so it looks scattered but is stable
  left: (i * 41) % 100,
  top: (i * 71) % 100,
  size: 1 + (i % 3), // 1–3px
  delay: (i % 9) * 0.45,
  dur: 2.6 + (i % 5) * 0.6,
  bright: i % 6 === 0, // a few brighter/larger
}));

export default function Starfield({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.bright ? s.size + 1 : s.size,
            height: s.bright ? s.size + 1 : s.size,
            boxShadow: s.bright ? "0 0 6px rgba(255,255,255,0.7)" : "none",
            animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
