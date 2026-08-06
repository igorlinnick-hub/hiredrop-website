"use client";

import { useEffect, useRef, useState } from "react";

interface FreeTastePaywallProps {
  freeUsed: number;
  freeLimit: number;
}

const CAPTION = (n: number) =>
  `HireDrop applied to ${n} jobs for me — free 🚀 hiredrop.io`;

/**
 * The paywall moment, framed as a win. Shows when the lifetime free taste is
 * exhausted: celebrates the 40 applications that went out, offers the two paid
 * plans (checkout itself lives in Settings → Billing / Stripe — not here), and
 * hands the user a shareable result card. The share asset is rendered on a
 * client-side <canvas> — no external libraries, nothing leaves the browser.
 */
export default function FreeTastePaywall({ freeUsed, freeLimit }: FreeTastePaywallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const n = Math.max(freeUsed, freeLimit); // exhausted ⇒ show the full taste, e.g. 40

  useEffect(() => {
    // navigator.canShare only exists in secure contexts / some browsers. Probed
    // async (not sync in the effect body) so hydration paints one stable frame.
    const t = setTimeout(() => {
      try {
        const probe = new File([""], "probe.png", { type: "image/png" });
        setCanShareFiles(!!navigator.canShare && navigator.canShare({ files: [probe] }));
      } catch {
        setCanShareFiles(false);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = 1080;
      const H = 1080;

      // Deep-space ground + violet well breathing from the lower third — the
      // approved brand world (glass + space, 2026-08-05), replacing the old
      // grid-and-glow landing texture.
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(0, 0, W, H);
      const well = ctx.createRadialGradient(540, 1140, 0, 540, 1140, 980);
      well.addColorStop(0, "rgba(58,45,122,0.95)");
      well.addColorStop(0.55, "rgba(35,28,80,0.5)");
      well.addColorStop(1, "rgba(58,45,122,0)");
      ctx.fillStyle = well;
      ctx.fillRect(0, 0, W, H);

      // Sparse stars, falling-snow feel — deterministic scatter, a few brighter
      const STARS: [number, number, number, number][] = [
        [92, 88, 2.4, 0.5], [214, 210, 1.6, 0.3], [356, 74, 2, 0.42], [470, 168, 1.5, 0.25],
        [610, 96, 2.6, 0.55], [724, 232, 1.6, 0.3], [854, 120, 2.2, 0.45], [986, 214, 1.5, 0.28],
        [150, 356, 1.8, 0.32], [520, 320, 1.4, 0.22], [934, 372, 1.9, 0.35], [1020, 520, 1.5, 0.25],
        [64, 540, 1.6, 0.28], [990, 700, 1.7, 0.3], [80, 760, 1.4, 0.22], [1002, 880, 1.8, 0.3],
      ];
      for (const [sx, sy, sr, sa] of STARS) {
        ctx.fillStyle = `rgba(235,230,255,${sa})`;
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      }

      // Frosted glass slab holding the content — hairline rim + inner top light
      const slab = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };
      slab(36, 36, W - 72, H - 72, 40);
      ctx.fillStyle = "rgba(255,255,255,0.035)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.13)";
      ctx.lineWidth = 2;
      ctx.stroke();
      const topLight = ctx.createLinearGradient(0, 36, 0, 320);
      topLight.addColorStop(0, "rgba(255,255,255,0.07)");
      topLight.addColorStop(1, "rgba(255,255,255,0)");
      slab(36, 36, W - 72, H - 72, 40);
      ctx.fillStyle = topLight;
      ctx.fill();

      // The dimensional glass droplet, top-right — halo, violet body, specular
      ctx.save();
      ctx.translate(838, 96);
      ctx.scale(1.5, 1.5);
      const halo = ctx.createRadialGradient(50, 64, 6, 50, 64, 92);
      halo.addColorStop(0, "rgba(167,139,250,0.5)");
      halo.addColorStop(1, "rgba(167,139,250,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(-46, -40, 192, 210);
      const dropPath = () => {
        ctx.beginPath();
        ctx.moveTo(50, 8);
        ctx.bezierCurveTo(30, 44, 18, 62, 18, 78);
        ctx.arc(50, 78, 32, Math.PI, 0, true);
        ctx.bezierCurveTo(82, 62, 70, 44, 50, 8);
        ctx.closePath();
      };
      dropPath();
      const body = ctx.createRadialGradient(37, 40, 4, 52, 66, 74);
      body.addColorStop(0, "#efe8ff");
      body.addColorStop(0.42, "#8b7cf0");
      body.addColorStop(1, "#3f2f95");
      ctx.fillStyle = body;
      ctx.fill();
      ctx.save();
      ctx.translate(37, 48); ctx.rotate((-18 * Math.PI) / 180);
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 14, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fill();
      ctx.restore();
      ctx.restore();

      const grotesk = (weight: number, size: number) =>
        `${weight} ${size}px "Space Grotesk", "Inter", sans-serif`;

      // Wordmark — "Hire" purple + "Drop" white, same as the site header
      ctx.textBaseline = "alphabetic";
      ctx.font = grotesk(700, 56);
      ctx.fillStyle = "#8B7CF7";
      ctx.fillText("Hire", 72, 116);
      const hireW = ctx.measureText("Hire").width;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Drop", 72 + hireW, 116);

      // Giant number
      const num = String(n);
      ctx.font = grotesk(700, 430);
      const numGrad = ctx.createLinearGradient(0, 300, 0, 760);
      numGrad.addColorStop(0, "#A78BFA");
      numGrad.addColorStop(1, "#6C5CE7");
      ctx.fillStyle = numGrad;
      ctx.fillText(num, 66, 700);

      // Story lines
      ctx.fillStyle = "#FFFFFF";
      ctx.font = grotesk(700, 74);
      ctx.fillText("job applications,", 72, 810);
      ctx.fillText("sent for me — ", 72, 902);
      const sentW = ctx.measureText("sent for me — ").width;
      ctx.fillStyle = "#00CE9B";
      ctx.fillText("free", 72 + sentW, 902);

      // Brand hairline: violet → mint (the approved bottom element)
      const hair = ctx.createLinearGradient(72, 0, W - 72, 0);
      hair.addColorStop(0, "#6C5CE7");
      hair.addColorStop(1, "#00B894");
      ctx.fillStyle = hair;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(72, 936, W - 144, 4, 2); else ctx.rect(72, 936, W - 144, 4);
      ctx.fill();

      // Footer
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = grotesk(500, 34);
      ctx.fillText("The ban-safe AI that applies for you", 72, 992);
      ctx.fillStyle = "#8B7CF7";
      ctx.font = grotesk(700, 36);
      ctx.fillText("hiredrop.io", 72, 1038);
    };

    draw(); // immediate paint with fallback font
    // Repaint once the display face is actually loaded (fonts.load is async).
    if (typeof document !== "undefined" && document.fonts?.load) {
      Promise.all([
        document.fonts.load('700 430px "Space Grotesk"'),
        document.fonts.load('500 34px "Space Grotesk"'),
      ])
        .then(draw)
        .catch(() => {});
    }
  }, [n]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `hiredrop-${n}-applications.png`;
    a.click();
  }

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return;
    const file = new File([blob], `hiredrop-${n}-applications.png`, { type: "image/png" });
    try {
      await navigator.share({ files: [file], text: CAPTION(n) });
    } catch {
      // user closed the sheet — nothing to do
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(CAPTION(n));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — button just stays quiet
    }
  }

  return (
    <div className="rounded-xl border-2 border-accent/40 bg-surface overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* The paywall, framed as the payoff */}
        <div className="p-6 sm:p-8 flex flex-col">
          <span className="inline-flex self-start items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent mb-4">
            Free taste complete 🎉
          </span>
          <h2 className="text-2xl font-bold text-text" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {freeLimit} applications went out for you — free.
          </h2>
          <p className="mt-3 text-sm text-text2">
            That was the free taste: real applications, tailored cover letters, sent from
            your own browser. To keep applying — and unlock ATS resume tailoring — pick a
            plan. Cancel anytime.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="/dashboard/settings?tab=billing"
              className="block text-center rounded-[10px] bg-accent hover:bg-accent-hover text-white font-semibold px-5 py-3 transition shadow-lg shadow-accent/25"
            >
              Continue — $9/week
            </a>
            <a
              href="/dashboard/settings?tab=billing"
              className="block text-center rounded-[10px] border border-accent/40 hover:border-accent text-text font-semibold px-5 py-3 transition"
            >
              Monthly — $29
            </a>
          </div>
          <p className="mt-3 text-xs text-text2">
            Your jobs, history and profile stay exactly as they are.
          </p>
        </div>

        {/* The shareable result card — the viral asset, offered at the peak moment */}
        <div className="p-6 sm:p-8 bg-surface2/50 border-t lg:border-t-0 lg:border-l border-border">
          <p className="text-sm font-semibold text-text mb-3">
            Tell your job-hunt group chat 👇
          </p>
          <canvas
            ref={canvasRef}
            width={1080}
            height={1080}
            className="w-full max-w-[320px] rounded-xl border border-border shadow-lg"
          />
          <div className="mt-4 flex flex-wrap gap-2.5">
            {canShareFiles && (
              <button
                onClick={share}
                className="text-sm font-medium bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition"
              >
                Share
              </button>
            )}
            <button
              onClick={download}
              className="text-sm font-medium border border-accent/40 hover:border-accent text-text px-4 py-2 rounded-lg transition"
            >
              Download image
            </button>
            <button
              onClick={copyCaption}
              className="text-sm font-medium text-text2 hover:text-text px-3 py-2 rounded-lg transition"
            >
              {copied ? "Copied ✓" : "Copy caption"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
