# seo-launch — SEO post-launch чеклист для hiredrop.io

Обновлено: 2026-08-21 · ветка: feat/seo-launch

Источник цепочки: рил itsblakedavis «10 Things to Do Immediately After Launching Your
Website» (https://www.instagram.com/p/Db34eyMSIP6/). Игорь: пройти чеклист для hiredrop.io.

## Состояние

Аудит 2026-08-21 против 10 пунктов рила:

| # | Пункт | Было | Стало |
|---|---|---|---|
| 1 | Google Search Console | ❓ неизвестно | **нужен Игорь** (клик в GSC) |
| 2 | Sitemap → Google | ❌ /sitemap.xml был 404 | ✅ `app/sitemap.ts` (8 публичных URL) |
| 3 | Analytics | ✅ Vercel Analytics + Speed Insights | без изменений (GA не ставим — выбор) |
| 4 | Google Business Profile | — | N/A: не local business, скип |
| 5 | Keyword в title | ✅ «Automate Your Job Search» | + OG/twitter в layout, metadataBase |
| 6 | City в service pages | — | N/A: SaaS без гео-страниц, скип |
| 7 | Уникальные meta description | ❌ faq/privacy/terms/affiliate без метаданных | ✅ добавлены |
| 8 | Внутренние ссылки | частично (Header/Footer) | не трогал |
| 9 | Сжатие картинок | не проверено | открыто |
| 10 | Backlinks | нет работы | открыто (отдельная задача, не код) |

robots.txt тоже был 404 → ✅ `app/robots.ts` (закрыты /dashboard/, /onboarding/,
/auth/, /preview/, /extension/connect). `npx tsc --noEmit` чистый.

## Последний заход

- Создан `app/robots.ts` + `app/sitemap.ts` (конвенции сверены с `node_modules/next/dist/docs/` — кастомный Next).
- `app/layout.tsx`: metadataBase + openGraph + twitter (card summary, без og-image — его ещё нет как ассета).
- Уникальные `metadata` на faq / privacy / terms / affiliate (все four — серверные компоненты, проверено).

## Сломано / не доделано

- Нет og-image (1200×630) — карточки в соцсетях будут без картинки.
- Пункты 9 (image compression) и 10 (backlinks) не начаты.
- GSC-верификация и submit sitemap — только руками Игоря (аккаунт Google).

## Следующий шаг

Игорь: добавить hiredrop.io в Google Search Console (DNS или meta-tag верификация — если
meta-tag, скинуть тег мне, вставлю в layout) и сабмитнуть https://hiredrop.io/sitemap.xml.
