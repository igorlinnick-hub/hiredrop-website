"use client";

import { useEffect, useRef, useState } from "react";

// Honest, defensible facts — no fabricated traction or interview multipliers.
const STATS = [
  { value: 100, label: "From your own browser", suffix: "%" },
  { value: 3, label: "Apply Modes for precision", suffix: "" },
  { value: 0, label: "Captchas cracked — the safe way", suffix: "" },
];

function AnimatedNumber({
  target,
  suffix,
  active,
}: {
  target: number;
  suffix: string;
  active: boolean;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!active) return;
    setCurrent(0);
    const duration = 2000;
    const steps = 60;
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      const progress = 1 - Math.pow(1 - frame / steps, 3);
      setCurrent(Math.round(target * progress));
      if (frame >= steps) {
        setCurrent(target);
        clearInterval(interval);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [active, target]);

  return (
    <span
      className="text-5xl font-bold text-[#6C5CE7] block"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {active ? current.toLocaleString() : "0"}
      {suffix}
    </span>
  );
}

export default function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setActive(true);
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="stats" ref={ref} className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 text-center">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <AnimatedNumber
                target={stat.value}
                suffix={stat.suffix}
                active={active}
              />
              <p className="text-[#6B6B8A] text-base mt-3">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
