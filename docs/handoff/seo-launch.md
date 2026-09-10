# seo-launch — органический поиск для hiredrop.io

Обновлено: 2026-09-09 · в main (website #140, #141; jobflow #172)

Цепочка про то, чтобы людей приводил Google/Safari **бесплатно**. Началась с рила
itsblakedavis «10 Things After Launching» (аудит 08-21), второй заход 09-09 —
вопрос Игоря «всё ли простроено, чтоб нас находили».

## Состояние

| Слой | Было до 09-09 | Стало |
|---|---|---|
| robots.txt / sitemap.xml | ✅ отдаются (08-21) | sitemap **генерится** из `PUBLIC_PAGES` (`lib/seo.ts`), 13 URL |
| canonical | ❌ нигде | ✅ на всех публичных страницах через `pageMetadata()` |
| og-image | ❌ нет (карточка = серая строка) | ✅ динамический 1200×630 (`lib/og.tsx`, satori + Space Grotesk), свой на каждую контентную страницу |
| twitter card | `summary` | `summary_large_image` |
| JSON-LD | ❌ нет | ✅ Organization + SoftwareApplication (главная), FAQPage (/faq + каждая контентная), BreadcrumbList, Article |
| Контентные страницы | 0 | 6: `/alternatives` + 2 сравнения, `/guides` + 2 гайда |
| Внутренние ссылки | Header/Footer, якоря битые вне `/` | колонка Resources в футере, `Guides` в шапке, якоря → `/#...`, «Keep reading» на каждой странице |
| Google Search Console | ❌ не подключён | ✅ **подключён как канал** — `jobflow/scripts/gsc.py`, property верифицирована, sitemap принят (13 URL, errors=0) |

## Что именно построено 09-09

- **`lib/seo.ts`** — `PUBLIC_PAGES` (реестр URL, из него sitemap) + `pageMetadata()`
  (title/description/canonical/OG/twitter одним вызовом). Новая публичная страница
  обязана попасть в реестр, иначе её нет в sitemap.
- **`lib/structured-data.ts`** — схемы. Правило: **только то, что реально работает**;
  платформы сверяются с `STATUS_MATRIX.json`.
- **`lib/og.tsx` + `app/**/opengraph-image.tsx`** — карточки шеринга. Шрифт —
  `assets/SpaceGrotesk-Bold.ttf` (**статический** инстанс; satori падает на variable
  TTF с `Cannot read properties of undefined`, команда регенерации — в комментарии файла).
- **`components/content/`** — `ContentLayout` (breadcrumbs + h1 + lead) и блоки
  (`Section`, `Callout`, `CompareTable`, `Steps`, `FaqBlock`, `CtaBand`, `RelatedLinks`).
  Light-only намеренно: Header/Footer лендинга захардкожены светлыми.
- **6 страниц** — ключевики `lazyapply alternative`, `aiapply alternative`,
  `auto apply indeed`, `ats resume keywords`.
- **Правка честности витрины**: убран **Workday** из Pricing/Features/FAQ/Privacy —
  в `STATUS_MATRIX.json` он `DEFERRED`, а витрина обещала его как поддерживаемый.
- `/extension` убран из sitemap и закрыт в robots — он редиректит на `/login`,
  краулер видел только редирект.

## Правила этой цепочки

1. **Числа конкурентов — только с их страницы и с датой проверки.** У обеих
   сравнительных страниц есть `sourceNote` под таблицей; без него таблицу не публиковать.
   LazyApply сверен 09-09 ($99/$149/$999 в год, 15/150/1500 в день). У AIApply цен на
   странице нет — поэтому у нас не названо ни одной суммы.
2. **Витрина цитирует бэкенд.** Список платформ на контентных страницах = VERIFIED в
   `STATUS_MATRIX.json` (Indeed, ZipRecruiter, Greenhouse, Lever, Ashby). LinkedIn и
   Workday не называть, пока статус не изменится.
3. Новая страница = строка в `PUBLIC_PAGES` + запись в `lib/content-index.ts`
   (иначе не попадёт ни в sitemap, ни в футер, ни в «Keep reading»).

## Сломано / не доделано

- Данных по запросам ещё нет: Google копит их **с момента верификации** (09-09), первые
  строки появятся через несколько дней. Смотреть `python jobflow/scripts/gsc.py queries`.
- Property — **URL-prefix** `https://hiredrop.io/`. Domain-property (все поддомены, http+https)
  требует TXT-записи у регистратора — мета-тегом её создать нельзя.
- Backlinks — работа не начата (каталоги, Product Hunt, гостевые). Не код.
- Лендинг рендерится клиентскими компонентами со скролл-ревилами (`opacity:0` до JS).
  Googlebot это исполняет, но у части AI-краулеров рендера нет. Мерить после GSC.
- Сжатие картинок (пункт 9 рила) — не проверено.

## Где остановились (конец сессии 09-09)

Всё смержено и проверено в проде — незакоммиченного нет ни в одном репо. Открытых веток
цепочки нет, worktree `~/Code/jw-seo` удалён. Следующая сессия начинает с чистого main.

Что НЕ делалось намеренно: контентные страницы light-only (Header/Footer лендинга
захардкожены светлыми — дать им тёмную тему = менять лендинг целиком, отдельная задача);
og-картинки одинаковой композиции для всех страниц (различаются kicker + заголовок).

## Следующий шаг

После мержа: дождаться деплоя, проверить в проде
`curl -s https://hiredrop.io/sitemap.xml | grep -c "<url>"` (ожидание 13) и
`curl -s https://hiredrop.io/alternatives/lazyapply | grep canonical`. Потом — через
несколько дней `python jobflow/scripts/gsc.py queries` и `pages`: писать следующие страницы
по РЕАЛЬНЫМ запросам, а не по догадкам.
