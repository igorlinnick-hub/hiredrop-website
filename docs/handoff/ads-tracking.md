# ads-tracking — Meta Pixel + Google Ads tag, identity keys, opt-out

Обновлено: 2026-09-28 · ветка: `feat/ads-tracking`

## Что есть

**Инертно, пока не заданы env.** Без `NEXT_PUBLIC_META_PIXEL_ID` / `NEXT_PUBLIC_GOOGLE_ADS_ID`
сайт ведёт себя как раньше: в HTML нет тегов, ни одна страница не качает даже наш JS с адресами
тегов (он в отдельном lazy-чанке), новых cookie нет.

| Файл | Роль |
|---|---|
| `lib/adPixels.ts` | все правила: env, opt-out, allowlist маршрутов, гард конверсии, `trackAd`, `mergeSignupAttribution` (без импортов — тестируется `node --test`) |
| `lib/adPixelCode.ts` | base code Meta/gtag — единственное место с URL тегов |
| `components/AdPixels.tsx` | в root layout; решает план страницы, лениво грузит `AdPixelRuntime` |
| `components/AdPixelRuntime.tsx` | `next/script` + PageView/конверсия |
| `lib/attribution.ts` | + `utm_term`, `utm_id`, `fbclid`, `gclid`, `gbraid`, `wbraid`; `getSignupAttribution()` |
| `app/auth/callback/route.ts` | мерж identity-ключей; cookie `hd_new_signup` |
| `app/privacy/choices/` | «Your Privacy Choices»: тумблер + GPC + запись в аккаунт |
| `tests/ad-pixels.test.ts` | 22 теста |

**Где грузятся теги** — allowlist: `/`, `/login`, `/signup`, `/faq`, `/affiliate/**`,
`/alternatives/**`, `/guides/**`. Нигде больше (dashboard, onboarding, auth, preview, extension,
privacy, terms). Не грузятся и на публичной странице с `email`/`affiliate`/токенами в query/hash
(`/signup?affiliate=…&email=…` — пиксель отдал бы адрес в Meta). Новая маркетинговая страница =
строка в `PUBLIC_EXACT`/`PUBLIC_PREFIXES` + упоминание в политике, раздел 6.

Meta: `autoConfig` off, `fbq.disablePushState = true` (иначе Meta сам шлёт PageView на
клиентском переходе в /dashboard), PageView шлём сами. gtag: `send_page_view:false`, page_view
шлём сами — тоже только на публичных.

## Env (Vercel, build-time)

- `NEXT_PUBLIC_META_PIXEL_ID` — только цифры
- `NEXT_PUBLIC_GOOGLE_ADS_ID` — `AW-<цифры>`
- `NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL` — label конверсии «Sign-up»
- `NEXT_PUBLIC_META_DOMAIN_VERIFICATION` → `<meta name="facebook-domain-verification">`

Кривое значение (не та форма) = как не заданное. После смены env нужен редеплой.

## Контракты с бэкендом

**event_id регистрации = `reg_<user_id>`** — Meta `eventID` у `CompleteRegistration` и Google
`transaction_id`. Бэкенд дедупит свои серверные события по нему.

**`profiles.attribution`** (пишется один раз, `.is("attribution", null)`):
- first-touch: `utm_source|medium|campaign|content|term|id`, `ref`, `fbclid`, `gclid`, `gbraid`,
  `wbraid`, `landing_page`, `captured_at`
- identity при signup: `fbp` (`_fbp`), `fbc` (`_fbc`), `ua` (≤300, **только** Meta-атрибуция:
  fbc/fbclid или utm_source ∈ facebook/fb/instagram/ig/meta), `ads_optout: true` (cookie
  `hd_ads_optout=1` или GPC / `Sec-GPC: 1`). При opt-out `fbp/fbc/ua` не пишутся вовсе.
- `/privacy/choices` у залогиненного делает read-merge-write `ads_optout` (true / ключ удалён).

**Бэкенд обязан** не слать CAPI при `ads_optout === true`.

**Конверсия регистрации**: callback ставит `hd_new_signup=<uid>` (15 мин, не httpOnly), если
аккаунт создан < 60 мин назад, не аффилиат (строка в `affiliates`, `affiliate_intent`, или
`next=/dashboard/affiliate`), не recovery, есть хоть один ID и нет opt-out. Следующая страница
(любая, вкл. /onboarding) шлёт конверсию, стирает cookie, ставит `hd_reg_fired_<uid>`.
`InitiateCheckout` — в `BillingSection`, только если пиксель уже в памяти вкладки.
Purchase в браузере не шлём никогда.

## Как проверить на проде

- **Meta**: Events Manager → пиксель → Test events → открыть hiredrop.io → `PageView`.
  Регистрация тестового аккаунта → `CompleteRegistration` с Event ID `reg_<uuid>`.
- **Google**: tagassistant.google.com → hiredrop.io → `page_view`, после регистрации
  `conversion` с `send_to=AW-…/<label>` и `transaction_id=reg_<uuid>`.
- **Opt-out**: /privacy/choices → Opt out → на / теги не грузятся (DevTools → Network:
  нет `connect.facebook.net`/`googletagmanager`).

Локально (так проверено 09-28): `next build` с фейковыми
`NEXT_PUBLIC_META_PIXEL_ID=000000000000000 NEXT_PUBLIC_GOOGLE_ADS_ID=AW-000000000`, `next start`,
headless Chromium: запись вызовов `fbq` + перехват запросов к google/doubleclick.

## Открытые вопросы

- RLS на запись `profiles.attribution` из `/privacy/choices` по схеме разрешён («Users can update
  own profile»), но живой сессией не проверен. Отказ RLS страница показывает текстом.
- GPC залогиненного попадает в аккаунт только при signup (`Sec-GPC`) или визите на
  /privacy/choices. Нужен ли синк GPC→аккаунт из дашборда — решение Игоря.
- **Automatic Advanced Matching** в Events Manager — держать ВЫКЛ: он читает поля email на
  /signup, /login, это не описано в политике. Хешированный email шлёт бэкенд.
- Enhanced Conversions (Google) и Consent Mode не делались (только США).
