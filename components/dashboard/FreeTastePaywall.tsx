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

      // Night backdrop — mirrors the landing's GradientCTA section
      ctx.fillStyle = "#0F0F17";
      ctx.fillRect(0, 0, W, H);

      // Purple glows
      const glow = (x: number, y: number, r: number, alpha: number) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(108,92,231,${alpha})`);
        g.addColorStop(1, "rgba(108,92,231,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      };
      glow(160, 120, 620, 0.5);
      glow(950, 980, 680, 0.4);
      glow(560, 540, 900, 0.15);

      // Faint grid — the hero's signature texture
      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

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

      // Footer
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = grotesk(500, 34);
      ctx.fillText("The ban-safe AI that applies for you", 72, 984);
      ctx.fillStyle = "#8B7CF7";
      ctx.font = grotesk(700, 36);
      ctx.fillText("hiredrop.io", 72, 1032);
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
