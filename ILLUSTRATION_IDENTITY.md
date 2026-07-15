# HireDrop — Illustration Identity (R1)

Monoline spot illustrations that carry the "AI identity" across onboarding, the
marketing site, and the web app. Components live in `components/illustrations/`.

## Why not copy Sprout literally
Sprout uses human-figure line art. Our rule (ui-ux-pro-max): **never draw human
figures in SVG — it reads amateur.** So we take Sprout's *feel* (monoline, one
accent, scattered marks) but build it on **objects + abstract motifs** — which is
both more premium and uniquely ours (anchored on the AI orb).

## The system
- **Stroke:** single weight, brand purple `#6C5CE7`, round caps + joins. ~3px in a
  128×128 viewBox.
- **Accent fill:** exactly one focal element per scene gets a solid or gradient
  fill (`#6C5CE7`, or the orb gradient `#a78bfa → #6C5CE7`). Everything else is line.
- **Washes:** `#EEE9FF` for soft depth fills. `#a78bfa` for secondary lines +
  decorative marks.
- **Signature marks:** every scene scatters 3–4 of `+ × ✳ · ◦` (asymmetric, off to
  the sides) — this texture is what makes the set feel like a family.
- **Canvas:** transparent, 128×128 viewBox. Works on light (`#F7F7FB`/white) and
  dark surfaces.
- **Motif vocabulary:** shield, document, form field, paper plane, orb, checkmark,
  sparkle, cursor, connection node. Recognizable objects, never people.

## Current set (`components/illustrations/index.tsx`)
| Component | Motif | Use |
|---|---|---|
| `IllustrationSafe` | shield + check | ban-safe / account safety (onboarding Safety step ✅) |
| `IllustrationTailored` | document + sparkle | tailored applications / quality |
| `IllustrationSend` | paper plane + trail | applying / auto-apply |
| `IllustrationLaunch` | AI orb + check burst | done / welcome (onboarding Done step ✅) |

Usage: `<IllustrationSafe size={132} className="mx-auto" />`

## Do / Don't
- ✅ Objects, abstract motifs, the orb, scattered marks, one accent fill.
- ✅ Reuse the same stroke weight + mark language everywhere for cohesion.
- ❌ No human figures / body parts in SVG.
- ❌ No more than one solid-filled focal element per scene.
- ❌ Don't introduce off-brand colors — purple family + washes only.

## Roadmap (after R1 sign-off)
- Add: `IllustrationSearch` (finding roles), `IllustrationTrack` (status), a dark
  variant set for marketing dark sections.
- Wire into: signup intro, marketing How-It-Works / feature blocks, dashboard empty
  states.
