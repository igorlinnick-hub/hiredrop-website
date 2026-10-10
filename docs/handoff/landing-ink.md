# Landing: крем / чернила / белый (web)

Обновлено: 2026-10-06 · ветка: main (смержено)

## Что сделано

- **#251 (8a38da9):** маркетинговая палитра — `:root` крем `#F6F1E7`, чернила `#101014` (кнопки/заголовки), тёплые серые и кромки. Фиолет `#6C5CE7` только метками: «Hire» в лого, вторая строка h1 героя, live-точки/курсоры, ночные свечения, эйбрау «HOW IT WORKS». Футер gray-900 → ink. 14 компонентов лендинга.
- **#250:** `AffiliateBand` на главной (после GradientCTA, до футера). Героя в первом экране шар → `DropFigure` (печатает, зелёное кольцо на «Applied»). Пилюля «Human-in-the-loop AI» удалена. Наложение шагов «How it works» исправлено (grid-ячейка). «Claude AI» → «our algorithm», «AI» убран из видимого копирайта.
- **#254:** экраны входа/регистрации/сброса/подтверждения — скоуп `.hd-auth` (accent = чернила, общий `<Button>` не тронут). Drop убран из `AffiliateBand` (закрывал лица на узких экранах).

## Не трогать

- Футер «About HireDrop» («Its AI works with text only») — держит верификацию бренда Google.
- Дашборд: токены `:root` перекрыты в `.hd-dash-root`/`.dark`, он не затронут.

## Сломано / хвосты

- Эслинт-ошибки в файлах, которые мы не меняли: `AIProcess.tsx:57`, `ChromeExtensionDemo.tsx:95`, `SpeedEdge.tsx:158`, `LoginForm.tsx:34`. Давние, не блокируют.
- `components/landing/AIOrb.tsx` удалён (был без других потребителей).
- Пункты, которые ещё не сверяли: `/affiliate` и `/guides` в новой палитре целиком (делали только главную, вход и аффилиат-блок).

## Следующий шаг

Ничего срочного. Если Игорь попросит — перевести оставшиеся страницы (`/affiliate`, `/guides`, `/faq`) по тому же правилу: кнопки чернилами, тинты кремом, фиолет точечно.

## Файлы

`app/globals.css`, `app/page.tsx`, `app/login/page.tsx`, `app/auth/*`, `components/auth/AuthLayout.tsx`, `components/affiliate/AffiliateHero.tsx`, `components/landing/*` (Header, Hero, HeroCampaignDemo, SceneStrip, ProblemStats, HowItWorks, Features, ApplyModes, ChromeExtensionDemo, SpeedEdge, Pricing, FAQ, GradientCTA, Footer, AffiliateBand, DropCameo), `components/illustrations/AutoFillDemo.tsx`.
