# Platform Status Model — витрина `/dashboard/platforms`

Единый источник логики статусов платформ. Правит `lib/constants.ts` (флаги `PLATFORMS`) +
`components/dashboard/PlatformConnections.tsx` (рендер). Написано 2026-08-01 после вопроса
Igor: «коннект = подключиться и залогиниться, зачем ready?».

## Главный принцип
**Слово статуса = ответ на вопрос юзера «надо ли мне что-то делать, чтобы мы могли туда подать?».**
Не тип платформы, не техническая деталь — только требуемое ДЕЙСТВИЕ юзера.

## Три типа платформ → три трека

### Type A — «Log-in» (подаём ОТ ИМЕНИ юзера через его сессию)
Job-борды, где отклик идёт через личный аккаунт юзера. Нужен его логин.
- Платформы: Indeed, ZipRecruiter (native, работают) + Glassdoor, Wellfound, Monster,
  CareerBuilder, Dice (пока «coming soon»).
- Флаги: `connectable: true`, `requiresLogin: true`.
- Статусы (детектит расширение, читая сессию на сайте платформы):
  - **Connect** (кнопка) — не залогинен / ещё не проверяли → действие: открыть сайт, залогиниться.
  - **not checked yet** — расширение давно не видело юзера на сайте (статус неизвестен/протух,
    TTL 7 дней, сбрасывается при reload расширения). **Не ошибка**, не «отвалилось».
  - **Connected** ✓ — расширение подтвердило живой логин → можно подавать как юзер.
  - **sign-in needed** (`logged_out`) — расширение увидело, что юзер вышел → надо залогиниться.

### Type B — «No-account» (guest-apply, заполняем как гость)
Формы карьерных сайтов компаний (ATS). Аккаунта/логина НЕТ — форма публична, любой заполняет.
- Платформы: Greenhouse, Lever, Ashby.
- Флаги: `connectable: false`, `requiresLogin: false`, `autoApply: true`, `stage: "auto"`, `beta: true`.
- Статус:
  - **Ready** ✓ — подключать нечего, работает из коробки. (Lever: единственный human-шаг —
    капчу решаешь ты; Ashby/GH — invisible reCAPTCHA, zero-touch.)

### Type C — «Public discovery» (только листинги, не apply-платформа на витрине)
- Google Jobs, RemoteOK — публичные листинги, footer-строка, без бейджа.
- **Workday** — backend discovery-only (наполняет пул). НЕ показываем на витрине как apply-
  платформу, пока не построен apply-спринт (account-gated multi-step). Появится как Type A/B
  когда apply готов.

## Почему ДВА слова (Connect/Connected vs Ready) — это правильно, не баг
Они отвечают на «надо ли мне действовать?»: Connect/Connected → ДА, залогинься; Ready → НЕТ,
ничего не нужно. Унификация соврала бы (см. выше). Разные типы платформ = разные состояния.

## UX-правило (чтоб не путать, Igor 08-01)
Список ГРУППИРОВАТЬ явными заголовками, а не мешать словари в плоском списке:
1. **«Your accounts — log in so we apply as you»** → Type A (Connect/Connected/not checked/sign-in needed).
2. **«No account needed — ready now»** → Type B (Ready).
3. **«Public — we apply directly»** → Type C (footer).

## Счётчик «X / N connected»
Считает ТОЛЬКО Type A (`connectable`). Type B (Ready) — always-on, НЕ в счётчике (подключать
нечего). → поэтому добавление Lever/Ashby (#51) не меняет «X/N».

## Инвариант для кода
- Новая платформа: сначала определи ТИП (A/B/C) → флаги ставь по типу → статус-бейдж следует
  автоматически. Никогда не давай Type B бейдж «Connect» и Type A бейдж «Ready».
- `stage` держать честным (`auto` = Ready-трек; `semi`/`connect` = coming-soon в Type A).
- Правило витрины [[feedback_concrete_dashboard_results]]: замеряемая дельта = число Ready / X-of-N.
