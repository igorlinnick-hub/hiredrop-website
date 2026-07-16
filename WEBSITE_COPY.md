# HireDrop — Website Copy Deck (ban-safe positioning)

> Структура офферов по модели Sprout (проверенная, конвертящая), смысл — НАШ (ban-safe, human-in-control, quality-not-spam).
> Источник стратегии: `HANDOFF_02.md`. Голос: человеческий, НЕ «agent/learns/Career Intelligence». Продаём **безопасность + результат**, не робота.
> Статус: copy готов к ревью Игорем → потом внедрение в компоненты (`components/landing/*`). Код Next читать `node_modules/next/dist/docs/` перед правкой (AGENTS.md).

---

## 0. Позиционирование — фундамент

**Одна строка (site tagline):**
> **Apply to more jobs — without risking your account.**

**Почему это работает и чего НЕ делает никто:** весь рынок продаёт объём и скорость («200 заявок пока спишь»). Это триггерит страх №1 соискателя — «меня забанят?». Мы — единственные, кто продаёт **безопасность аккаунта**, и у нас это **технически правда** (заявки идут с домашнего IP юзера, human-пейсинг, без обхода капчи).

**4 столпа (в порядке приоритета на сайте):**
1. **Ban-safe** — твой аккаунт остаётся твоим. Подача с твоего браузера, человеческий темп, без shady-автоматизации.
2. **Ты контролируешь** — review-before-send по умолчанию. Ничего не уходит без твоего «ок».
3. **Качество, не спам** — резюме + письмо под каждую вакансию. Не 200 одинаковых.
4. **Настроил раз → работает** — берёт сложные ATS (Workday/Greenhouse/Lever), что съедают твой вечер.

**Голос — правила:**
- ✅ «your account stays safe», «review before it sends», «tailored to each job», «applies like you would, just faster», «the forms that eat your evening»
- ❌ «agent that learns», «Career Intelligence», «200 applications while you sleep», «1000 applications», «fully automated» без «you review»
- Продаём **исход** (интервью) и **безопасность**, не «бота».

**Против кого позиционируемся** (для comparison-секции): **ApplyBlast/LazyApply** (blast-тулы, что банят аккаунты) и **ручная подача** (безопасно, но убивает вечера). НЕ против Sprout впрямую (не наш враг для атаки; отличаемся десктоп+сложные ATS+ban-safe).

---

## 1. Hero  → `components/landing/Hero.tsx` (ПЕРЕПИСАТЬ)

**Badge:** `Human-in-the-loop AI · Your account stays yours`

**Headline:**
> Apply to more jobs.
> **Without risking your account.**

**Subheadline:**
> HireDrop finds roles, tailors your resume and cover letter for each one, and applies from your own browser — at a human pace, so your account stays safe. You review before anything sends.

**CTA:** `Get Started Free` · вторичная `See how it works`

**Social proof:** `Join [REAL#] job seekers applying the safe way` _(заменить на реальное число; сейчас в коде «2,400+» — подтвердить)_

**Hero-орб prompts (ПЕРЕПИСАТЬ, сейчас volume-фрейм):**
- «Will this get my account banned?» → «No — it applies from your browser, at a human pace, like you would.»
- «Do I approve before it sends?» → «Yes. You review every application first.»
- «Will my cover letter sound like me?» → «Yes — tailored to each role, in your voice.»
- «Can it handle Workday forms?» → «Yes — the multi-step ATS forms too.»

---

## 2. Ticker / Coverage  → `components/landing/Ticker.tsx`

**Строка:** `Applies across Indeed and thousands of company application forms`
**Логотипы/слова:** Indeed · Greenhouse · Lever · Workday · Ashby · +company career pages
_(LinkedIn НЕ выпячивать — см. платформенную карту в HANDOFF.)_

---

## 3. Pain Points  → НОВАЯ секция (у Sprout есть, у нас нет — ДОБАВИТЬ)

**Headline:** `Sound familiar?`
**Subheadline:** `Job searching is exhausting enough. The tools meant to help often make it worse.`

**Bullets (боль → наша территория):**
- Filling out the same Workday form for the 10th time tonight?
- Scared an auto-apply bot will get your account flagged or banned?
- Blasting the same generic resume everywhere — and hearing nothing back?
- Lost track of where you even applied?
- Want the speed of automation, but not the risk?

**Transition:** `Meet HireDrop — automation that respects your account.`

---

## 4. How It Works  → `components/landing/HowItWorks.tsx` (ПЕРЕПИСАТЬ под semi-auto)

**Headline:** `Set it once. Stay in control.`

1. **Tell HireDrop what you want** — role, location, must-haves. Set it once.
2. **It finds & scores matching jobs** — across Indeed and company career sites, ranked to your profile.
3. **It tailors everything** — a fresh resume + cover letter written for each specific role.
4. **You approve → it applies** — from your own browser, at a human pace. Review each one, or let it run. Your call.

---

## 5. Features — 4 карточки  → `components/landing/Features.tsx` (ПЕРЕПИСАТЬ; зеркалим 4 карточки Sprout)

1. **You stay in control**
   Review every application before it sends. Nothing goes out without your OK. Or flip to auto — your choice, not ours.
2. **Tailored, never spammed**
   A resume and cover letter matched to each role and company. Not 200 identical blasts that recruiters ignore.
3. **Your account stays safe**
   Applies from your own browser, at a human pace — the way you would, just faster. No captcha-cracking, no server bots that get accounts banned.
4. **Handles the forms that eat your evening**
   Multi-step Workday, Greenhouse, Lever, Ashby — the complex ATS forms — filled for you, end to end.

---

## 6. Feature Benefits Grid  → внутри Features или новая (зеркалим 9 булетов Sprout)

- **Applies from your own IP** — not a shared server that platforms flag.
- **Review-before-send by default** — full control, every time.
- **Tailored per role** — resume + cover letter matched to each job.
- **ATS-friendly formatting** — reads cleanly in employer systems.
- **Works on complex ATS** — Workday, Greenhouse, Lever, Ashby.
- **Human-paced daily limits** — protects your account by design.
- **Invisible to employers** — they see a normal application, never "HireDrop".
- **Your data encrypted** — resumes and details stay protected.

---

## 7. Comparison Table  → НОВАЯ секция — ⭐ НАШ УБОЙНЫЙ БЛОК (у Sprout есть, у нас нет)

**Headline:** `HireDrop vs. the alternatives`
**Subheadline:** `The speed of automation, without the account risk.`

| | **HireDrop** | **Blast tools** (ApplyBlast, LazyApply) | **Applying manually** |
|---|:---:|:---:|:---:|
| Tailored to each job | ✅ | ❌ generic | ✅ but slow |
| Your account stays safe | ✅ your browser, human pace | ❌ bans accounts | ✅ |
| You review before it sends | ✅ | ❌ | ✅ |
| Handles Workday / complex ATS | ✅ | ⚠️ breaks | 😩 painful |
| Applies from YOUR browser (not a server) | ✅ | ❌ | ✅ |
| Time per application | ⚡ seconds | ⚡ seconds | 🐌 15–20 min |

**CTA:** `Try HireDrop free`

---

## 8. Stats / Social Proof  → `components/landing/StatsCounter.tsx` + НОВАЯ testimonials-секция

- Stats: `[REAL#] job seekers` · `[REAL#] applications sent safely` · `0 accounts banned` _(если правда — это киллер-стат; подтвердить прежде чем ставить)_
- Testimonials: **НЕ выдумывать.** Собрать реальные у первых юзеров после лонча. Зеркалим формат Sprout (имя + результат: «landed X interviews»). Плейсхолдер до реальных.

---

## 9. Pricing  → `components/landing/Pricing.tsx` (лимиты = БЕЗОПАСНОСТЬ, не объём)

**Headline:** `Simple plans. Safe by design.`
**Subheadline:** `Daily limits keep every application human-paced — so you move fast without putting your account at risk.`

Тиры (из backend `subscriptions.py`): Free 10/день · Pro 50/день · Elite 200/день _(цены подтвердить у Игоря)_.
**Reframe:** лимит подаётся как фича защиты — «human-paced daily limit that protects your account», не «бластани 200».

Все тиры включают: review-or-auto · tailored resume + cover letter · complex-ATS support · applies from your browser.

---

## 10. FAQ  → `components/landing/FAQ.tsx` (ban-safe вопрос — ПЕРВЫМ)

1. **Will this get my account banned?** ⭐ (первым, это страх №1)
   No. HireDrop applies from your own browser at a human pace — the same way you would, just faster. We never crack captchas or run server bots that platforms flag. Built-in daily limits keep everything human-paced.
2. **Do I stay in control?**
   Yes. By default you review and approve every application before it sends. Prefer hands-off? Switch to auto anytime.
3. **Will employers know I used HireDrop?**
   No. They receive a normal, tailored application — no HireDrop branding.
4. **Which sites does it apply to?**
   Indeed, plus thousands of company application forms (Greenhouse, Lever, Workday, Ashby).
5. **Are the resumes and cover letters ATS-friendly?**
   Yes — formatted to read cleanly in employer systems, tailored to each role.
6. **How is this different from blast tools?**
   Blast tools fire hundreds of identical applications from their servers — which gets accounts flagged. HireDrop tailors each one and applies from your browser at a safe pace.
7. **What if a captcha or verification appears?**
   It pauses and hands it to you — you clear it in a couple seconds, and it continues. (On a normal setup this rarely happens.)
8. **Technical issue?** → support email / dashboard feedback.

---

## 11. Final CTA  → `components/landing/GradientCTA.tsx`

**Headline:** `Apply smarter. Stay safe. Land more interviews.`
**Subheadline:** `Join [REAL#] job seekers who automate their search without risking the account they've built.`
**CTA:** `Get Started Free`

---

## 12. Внедрение — план (после ревью copy)
1. Hero — headline/sub/badge/орб-prompts (убрать «50/day», «while you sleep»).
2. Добавить Pain Points + Comparison Table (новые компоненты).
3. Переписать HowItWorks (semi-auto), Features (4 ban-safe карточки), FAQ (ban-safe первым).
4. Pricing — reframe лимитов как безопасность.
5. Заменить все `[REAL#]` на подтверждённые числа; testimonials — только реальные.
6. Перед кодом: читать кастомные Next-доки (`node_modules/next/dist/docs/`).

## Открытые вопросы к Игорю
- [ ] Реальные числа: сколько юзеров / заявок сейчас? Можно ли честно сказать «0 accounts banned»?
- [ ] Цены тиров (Free/Pro/Elite) — подтвердить.
- [ ] Оставляем ли «auto» режим на сайте видимым, или продаём только review-first, а auto прячем в настройки?
