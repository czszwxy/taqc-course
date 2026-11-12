# Резюме, LinkedIn і GitHub

Рекрутер дивиться на резюме **15–30 секунд**, а на одну вакансію Trainee/Junior QA приходять сотні відгуків. За ці секунди він має побачити: хто ти (Trainee QA Automation), що вмієш (TypeScript, Playwright, тест-дизайн, SQL, API) і **доказ** — проєкти з посиланнями. Без комерційного досвіду проєкти і GitHub і є твоїм досвідом. Рекрутери прямо кажуть: для них важливо, що ти щось **зробив і довів до кінця**, а не те, чи за це платили.

## Загальні правила

- **1 сторінка**, одна колонка, один шрифт, мінімум кольорів і іконок. Без шкал «Playwright ★★★★☆» і відсотків: їх неможливо перевірити.
- **Англійською**: англомовне резюме приносить більше запрошень від сильніших компаній. Для конкретної української вакансії можна мати версію українською.
- **PDF** з назвою `Name-Surname-QA-Automation.pdf`, а не `Резюме.pdf`: деякі системи відбору (ATS) індексують і назву файлу.
- **Правда і лише правда**: про кожен рядок можуть спитати «розкажи детальніше».
- **Без зайвих персональних даних**: дата народження, сімейний стан, повна адреса не потрібні. Фото — за звичаями країни; для міжнародних компаній краще без нього.

## Структура для Trainee без досвіду

1. **Шапка**: ім'я, посада `Trainee / Junior QA Automation Engineer`, місто і країна (+ remote / готовність до релокації), нормальний email, телефон з кодом країни, LinkedIn, GitHub.
2. **Summary** (2–3 речення): хто ти, що вмієш (з доказом), що шукаєш.
3. **Skills** — групами, від головного: Testing → Automation → Tools. Лише те, про що впевнено поговориш на співбесіді.
4. **Projects** — **вище за Experience**, бо зараз це твій головний доказ: 2–3 проєкти з посиланнями, 1 речення «що це» і 3–4 пункти.
5. **Experience** — попередня робота у зворотному порядку, навіть не з IT. Пиши про переносні досягнення: уважність, комунікація, процеси, робота з клієнтами.
6. **Education / Courses** — коротко. Деякі тімліди скептично ставляться до сертифікатів QA-курсів, тож головний доказ — проєкти, а не сертифікат.
7. **Languages** — рівень англійської чесно за шкалою CEFR (B1, B2).

## Сильний пункт = дія + що + інструмент + результат

| Слабко | Сильно |
|---|---|
| Responsible for testing | Designed 40 test cases for a demo shop checkout using EP and BVA |
| Knowledge of Playwright | Automated 30 UI and API tests with Playwright + TypeScript (Page Objects, fixtures) |
| Found bugs | Reported 15 bugs with steps, severity and evidence; 3 of them critical |
| Worked with CI | Set up GitHub Actions: smoke on every PR, full run nightly, HTML report as an artifact |
| Familiar with SQL | Verified orders data after UI actions with SQL queries (JOIN, GROUP BY) |

Починай пункт з дієслова в минулому часі: *Automated, Designed, Reported, Set up, Built, Verified, Investigated*. Додавай числа, але з контекстом: «30 tests» звучить чесно, «improved quality by 300 %» — ні.

> [!WARNING]
> Ніколи не вигадуй досвід, компанії чи рівень. Чесне «навчальний проєкт» звучить краще за вигадку, що розвалюється на другому питанні.

## Зразок резюме

```text
OLENA KOVALENKO
Trainee QA Automation Engineer · Kyiv, Ukraine · open to remote
olena.k@example.com · +380 00 000 0000 · linkedin.com/in/<you> · github.com/<you>

SUMMARY
Trainee QA automation engineer with a solid base in test design and hands-on
experience automating UI and API tests with Playwright and TypeScript. Built a
test framework with Page Objects, fixtures and a CI pipeline for a demo shop.
Looking for a trainee/junior role in a team with strong engineering practices.

SKILLS
Testing:    test design (EP, BVA, decision tables, state transitions), checklists,
            test cases, bug reports, exploratory and API testing
Automation: TypeScript, Playwright Test (locators, fixtures, POM, API, mocking)
Tools:      Git, GitHub Actions, Chrome DevTools, SQL (SQLite), REST, JSON

PROJECTS
Gadgetly test framework — github.com/<you>/gadgetly-tests
  UI + API tests for a demo online shop (sign-in, cart, orders).
  • Automated 30 UI and API tests with Playwright + TypeScript (POM, fixtures)
  • Designed a test plan, a 40-item checklist and 15 test cases
  • Reported 12 bugs with steps, evidence and severity; 3 critical
  • Set up GitHub Actions: smoke on every PR, nightly full run, HTML report
Take-home assignment: account page — github.com/<you>/account-page-tests

EXPERIENCE
Customer Support Specialist, <Company> · 2022 – 2025
  • Reproduced and described 20+ customer issues a week for developers
  • Wrote a troubleshooting guide that cut repeated tickets by a third

EDUCATION
B.Sc. in Economics, <University> · 2021
QA Automation self-study course (TypeScript + Playwright), 2025

LANGUAGES
English — B2 · Ukrainian — native
```

> [!TIP]
> Адаптуй резюме під кожну вакансію: якщо в ній «API testing, Postman, SQL», ці слова мають бути в Skills і в проєктах (якщо це правда). Відгукуйся, навіть якщо збігаєшся на ~80 %: ідеального збігу вимог майже не буває.

## Чого уникати

- «відповідальний, комунікабельний, стресостійкий» без доказів;
- список із 30 технологій, з якими ти «знайомився»; рівень «Expert» після туторіалів;
- друкарські помилки (для QA особливо промовисто) — перевір інструментом і попроси когось прочитати;
- 3 сторінки, дрібний шрифт, дві колонки з графікою;
- однакове резюме на всі вакансії.

## LinkedIn

- **Headline**: не «Looking for job», а `Trainee QA Automation Engineer | TypeScript · Playwright · API testing`.
- **About**: 3–5 речень, як summary, плюс посилання на GitHub.
- **Experience**: не залишай порожнім, бо порожній профіль гірше видно в пошуку рекрутерів. Додай навчальний проєкт або курс як окремий пункт з описом.
- **Featured**: посилання на найкращий репозиторій і на тестове завдання.
- **Open to work**: увімкни (можна видимим лише рекрутерам). **Skills**: Playwright, TypeScript, Test Design, API Testing, SQL, Git.
- **Мережа й активність**: додавай рекрутерів і QA з компаній, що тобі цікаві; пиши короткі пости «що я дізнався». Рекрутери це помічають.

## GitHub як портфоліо

- **Закріпи (pin)** 2–3 найкращі репозиторії: фінальний проєкт (модуль 20), тестове завдання, міні-фреймворк.
- **Якість коду важливіша за дизайн**: охайна структура, зрозумілі назви, без закоментованих шматків.
- У кожного — **README**: що тестується, стек, як запустити, структура, скріншот звіту.
- **Зелений бейдж CI** (GitHub Actions) показує, що тести справді проходять.
- Осмислені коміти, `.gitignore`, жодних секретів і `node_modules`.
- **Profile README** (репозиторій з твоїм ім'ям користувача): 3–4 рядки про тебе і посилання.

> [!QA]
> Перевір свій GitHub як тестувальник: відкрий профіль у приватному вікні, склонуй проєкт і запусти за README. Рекрутер і тімлід зроблять саме це.

## Підсумок

- Резюме: 1 сторінка англійською, PDF з ім'ям і роллю в назві; шапка → Summary → Skills → **Projects** → Experience → Education → Languages.
- Пункти: дія + що + інструмент + результат (з числами); жодних вигадок, шкал і «Expert».
- Адаптуй під вакансію, відгукуйся при ~80 % збігу.
- LinkedIn: конкретний headline, About, заповнений Experience, Featured, Open to work.
- GitHub: закріплені проєкти з README, CI-бейджем, охайним кодом і чистою історією.
