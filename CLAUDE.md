# QA Academy — project guide for Claude

Self-study web app that takes a learner from zero to **Trainee QA Automation Engineer** (manual QA → tech basics → TypeScript → Playwright → job prep). Single learner, runs locally, no backend, no accounts, no paid APIs.

- **UI language:** English. **Lesson content:** Ukrainian, with English technical terms (`string`, test case, severity…). Code identifiers, test names and model answers for QA artifacts in English.
- Owner is a beginner: explanations must assume zero background, be concrete, QA-flavoured.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run validate   # validates ALL content + proves every code task is solvable — run after every content change
npm run typecheck  # tsc on src/ and scripts/
npm run build      # typecheck + production build
```

Windows note: Node is installed at `C:\Program Files\nodejs` — if `node` is not on PATH in a shell, prefix with `$env:Path = "C:\Program Files\nodejs;" + $env:Path`.

Launcher: `Start QA Academy.cmd` (CRLF line endings, ASCII only) + desktop shortcut `QA Academy.lnk` with icon `launcher/qa-academy.ico`. It opens http://localhost:5173 if a server is already listening, otherwise runs `npm install` (first time) and `npm run dev -- --open`. The dev port is pinned (`strictPort`, `DEV_PORT` in vite.config.ts) because localStorage progress is tied to that origin — never change the port.

## Code style (enforced by a TS-patterns hook on edits)
No nested ternaries (use a small function or a Record lookup), no magic numbers (named consts, e.g. `formatModuleNumber` in `src/lib/format.ts`), prefer `map/filter/reduce` over raw loops in app code. Content task files (`content/**`) are learner exercises and intentionally use loops.

## Theme
Colors are CSS variables in `src/index.css` (`:root` = light, `.dark` = dark), exposed to Tailwind as `bg-canvas / bg-surface / bg-hover / bg-sunken / border-line / text-fg / text-muted / text-faint / *-accent* / *-ok* / *-bad* / *-warn*`. Layering: canvas < surface < hover (hover is always *lighter* in dark mode). Body text targets ~12:1 contrast, secondary ≥ 4.5:1. Code never uses ligatures (beginners must see `===`, `>=`). Monaco themes `qa-dark` / `qa-light` in `src/monaco/setup.ts` mirror the palette.

## Stack

Vite 6 + React 19 + TypeScript, React Router 7, Tailwind CSS v4 (CSS-variable tokens in `src/index.css`, dark mode via `.dark` class), Zustand (+ persist → localStorage), Zod (content schemas), react-markdown + remark-gfm + rehype-highlight, Monaco (`@monaco-editor/react`, bundled locally — no CDN), real `typescript` compiler in a Web Worker.

## Architecture

```
content/                     ← ALL course content (data only, no code changes needed to add lessons)
  course.json                ← tracks → modules (slug, title, planned lesson titles). Modules without a folder show as "coming soon".
  modules/<NN-slug>/module.json
  modules/<NN-slug>/lessons/<NN-slug>/lesson.json   ← title, minutes, summary, resources[]
  modules/<NN-slug>/lessons/<NN-slug>/lesson.md     ← theory (Markdown, callouts)
  modules/<NN-slug>/lessons/<NN-slug>/tasks/<NN-slug>/task.json (+ starter.ts / solution.ts / tests.ts for code tasks)
src/
  content/schema.ts          ← Zod schemas = the content format contract (source of truth)
  content/loader.ts          ← import.meta.glob discovery; builds Course tree; lazy-loads lesson.md and task .ts files
  runner/compiler.ts         ← pure: real TS compiler over in-memory FS (strict, ES2022 libs, CommonJS emit)
  runner/harness.ts          ← pure: Jest-like describe/it/expect + CommonJS loader + console capture
  runner/harness-dts.ts      ← globals the compiler sees (console, describe/it/test/expect, captureConsole)
  runner/client.ts           ← main-thread API: checkCode / runCode (compile worker reused; exec worker per run, 5 s timeout)
  runner/*.worker.ts         ← Web Workers
  features/progress/         ← Zustand stores (progress + settings) and selectors (task/lesson/module stats)
  features/tasks/            ← one view per task type + forms.ts (rules, bug matching) + generators.ts (value-set)
  playground/                ← intentionally buggy demo pages (Bug Playground) + registry.ts
  pages/                     ← Dashboard, ModulePage, LessonPage (Theory/Resources/Practice tabs), TaskPage, Settings, Playground
scripts/validate-content.ts  ← Node; reuses compiler/harness/forms/generators to verify content
lab/                         ← (future) real Playwright project + local mock API for hands-on labs
```

IDs come from folder names: lesson id `11-ts-basics/02-variables-and-types`, task id `<lessonId>/<task-folder>`. **Never rename content folders after release** — progress in localStorage is keyed by these ids. Numeric prefixes (`01-`, `02-`) define order; lesson number N maps to `course.json` planned lesson N.

## Content format

### lesson.json
```json
{ "title": "...", "minutes": 50, "summary": "one line (Ukrainian)",
  "resources": [{ "title": "...", "url": "https://...", "kind": "docs|article|video|course|tool|book", "lang": "en|uk", "note": "optional", "needsVerification": true }] }
```
Resource rules: only well-known sources (typescriptlang.org, playwright.dev, MDN, istqb.org, glossary.istqb.org, git-scm.com, code.visualstudio.com, uk.javascript.info, official channels). **Never invent URLs.** For videos use YouTube **search** URLs (`https://www.youtube.com/results?search_query=...`) instead of guessing video IDs. Always `"needsVerification": true` (the learner verifies; UI shows a badge + "I checked it" toggle).

### lesson.md
Markdown + GFM tables. Callouts: a blockquote starting with `[!TIP]`, `[!NOTE]`, `[!WARNING]`, `[!IMPORTANT]` or `[!QA]` (QA angle — connect the topic to testing). Code fences: `ts`, `bash`, `json`, `text`. Internal links starting with `/` use the router (e.g. `/playground`). Structure: intro (why it matters for QA) → sections with examples → callouts → `## Підсумок` bullet summary. ~100–180 lines.

### task.json — common fields
`type`, `title` (English), `hints[]` (progressive, revealed one by one; Markdown), `explanation` (Markdown "How to approach it", shown after a failed attempt), `optional?`, `variantOf?` (folder name of the main task in the same lesson → this task becomes its "similar task"; must have the same type).

| type | extra fields | how it's checked |
|---|---|---|
| `quiz` | `questions[]` (`kind`: `single` / `multiple` / `text`), `show?` (sample size per attempt), `passScore` (default 0.8), `intro?` | auto; per-option `explain`, per-question `explanation`; retry = new random sample (seed) |
| `code` | `statement`, `codeRules[]` (`require`/`forbid` regex on comment-stripped code, use sparingly) + files `starter.ts`, `solution.ts`, `tests.ts` | real TS compile (strict) of solution + tests, then hidden tests in a worker |
| `value-set` | `generator: { name, params }` (see `features/tasks/generators.ts`, e.g. `bva-range`) | set comparison with targeted feedback; "similar task" = new seed → new generated problem |
| `test-case` | `statement`, `playground?`, `rules[]`, `model` (title, type, priority, preconditions, testData, steps[], expectedResult), `checklist[]` | built-in structure rules + task `rules` → then model answer + self-review checklist |
| `bug-report` | `statement`, `playground`, `minBugs`, `bugs[]` (`id`, `title`, `match[]` regexes — ALL must match, `severity[]` accepted, `severityWhy`, `model` report), `checklist[]` | quality rules → match report to a known bug (prefers bugs whose patterns appear in title/actual) → severity check |
| `classify` | `statement`, `categories[]` (`id`, `label`, `description?`), `items[]` (`id`, `text`, `category`, `explain?`), `show?`, `passScore` | each item assigned to one category; retry = new random sample (seed). Ideal for theory modules: "error/defect/failure", "smoke/sanity/regression" |
| `order` | `statement`, `items[]` **in the correct order** (≥ 3) | UI shuffles; exact order required; green/red per row; correct order revealed after 2 fails |
| `written` | `statement`, `playground?`, `fields[]` (`id`, `label`, `kind`: `text`/`textarea`/`list`, `placeholder?`, `hint?`), `rules[]`, `model` (field id → string or string[]), `checklist[]` | all fields required + rules → model answer + self-review checklist + Copy for review. Use for acceptance criteria, requirement reviews, charters, plans |
| `table` | `statement`, `playground?`, `givenColumns[]` (header labels), `answerColumns[]` (`id`, `label`, `options[]`), `rows[]` (`given[]` same length as givenColumns, `answers` {colId → option}, `explain?`) | every answer cell must match; green/red per cell; row `explain` shown for wrong rows; answers revealed after 2 fails. Use for decision tables, state transition tables, partition tables, traceability matrices |

Value-set generators (`src/features/tasks/generators.ts`, presets in `range-presets.json`): `bva-range` (params `field`, `min`, `max`, `unit?`, `approach`: `two-value` | `three-value`) and `ep-range` (one representative per integer partition: below / inside / above). Seed 0 uses the task params; other seeds pick a random preset.

Field rules (`rules[]`): `{ field, check, value?, message }` where `check` ∈ `required | minLength | minItems | mentionsAny | mentionsAll | notMentions | equals | oneOf`; `field: "any"` = all fields joined. Regexes are case-insensitive with the `u` flag — don't use `\b` next to Cyrillic, avoid unnecessary escapes (u-mode is strict), cover EN + UK wording.

### Code task conventions
- `starter.ts` must export the same names/signatures as `solution.ts` (functions with empty body + `// твій код тут`). The starter must NOT pass (validator enforces).
- `tests.ts`: `import { fn } from './solution';` then `describe/it/expect`. Third argument of `it(name, fn, hint)` is a Ukrainian hint shown when that test fails — write one for every non-trivial test explaining the likely mistake. Cover boundaries/empty input. `captureConsole(() => fn())` returns printed lines.
- Matchers: toBe, toEqual/toStrictEqual (deep, ignores undefined props), toBeTruthy/Falsy, toBeNull/Undefined/Defined/NaN, toBeGreaterThan(OrEqual)/LessThan(OrEqual), toBeCloseTo, toContain, toHaveLength, toHaveProperty, toMatch, toBeInstanceOf, toBeTypeOf, toThrow, `.not`, `.resolves`/`.rejects`.
- Only use language features taught so far in the module (e.g. no `map/filter` in module 11). Compiler: ES2022 libs, no DOM, strict, `noImplicitReturns`.
- Statement in Ukrainian with examples in a ```ts block; 2–3 hints; explanation with the idea + common mistake.
- Give ~1 task per lesson a `-v2` similar variant (`variantOf`).

### Bug Playground
Pages in `src/playground/`, registered in `registry.ts`, routed standalone (no app chrome) in `App.tsx`. Each page has intentional bugs behind flags (`getBugs(fixed)`) and a `?fixed` query param that disables them (for future Playwright "must pass on fixed / fail on buggy" grading; never advertise `?fixed` to the learner). Keep the page's bug flags and the task's `bugs[]` catalog in sync. Use semantic HTML, labels and `data-testid` for future automation.

- Shared chrome: `PlaygroundShell.tsx` (brand header, yellow "Requirements (for testers)" panel, optional **Reset demo data** button, `isFixedMode()`, `PgField`, `inputClass`, `formatUah`). Data lives in `src/playground/data/*.json`.
- Pages and bug counts: signup 7, login 6, cart 6, search 6, order 5, todo 6 (todo persists to localStorage keys `qa-playground:todo` / `qa-playground:todo-fixed`).
- Tasks reference a page with `playground: "<id>"` (test-case, bug-report, written, table) → "Open page" button (`PlaygroundLink` in `features/tasks/shared.tsx`). The validator rejects unknown ids.
- Bug catalog regexes: every `match` pattern must hit the report; ties are broken by hits in title + actual result, then by catalog order. Make patterns specific enough that one bug's model never matches another bug better (the validator checks self-matching). Avoid bare `case` (matches "test case"), `esc` (matches "description"), `три` (matches "отримати").
- Table/given cells and other Markdown fields: wrap emails in backticks, otherwise they render as mailto links.

## Progress & UX rules
- Progress in localStorage (`qa-academy:progress`, `qa-academy:settings`); export/import JSON on Settings page.
- Lesson complete = theory marked read + all non-optional main tasks solved (solving any variant counts for the group).
- Solution reveal: code after 3 failed attempts (or confirm), test-case model after 2 (or confirm); bug-report "reveal remaining bugs" with confirm.
- "Copy for review" button builds a Markdown bundle the learner can paste to Claude for detailed feedback (no API calls from the app).

## Status / roadmap
- ✅ App skeleton, 9 task engines (quiz, code, value-set, test-case, bug-report, classify, order, written, table), Bug Playground: Sign-up, Login, Shopping cart, Search & filters, Order status flow, To-do (36 bugs in total).
- ✅ Module 01 "Introduction to Testing" — 7 lessons, 21 tasks (quiz + classify/order/written per lesson).
- ✅ Module 02 "Testing Types & Levels" — 8 lessons, 23 tasks.
- ✅ Module 03 "Test Design Techniques" — 8 lessons, 23 main tasks + 1 variant (EP/BVA generators, decision & state tables).
- ✅ Module 04 "Test Documentation" — 7 lessons, 21 tasks (testability, checklists, test case, traceability table, plan, statuses, metrics & summary report).
- ✅ Module 11 "Programming Basics with TypeScript" — 10 lessons, 40 main tasks + 10 variants.
- ✅ Module 05 "Bugs & Bug Tracking" — 7 lessons, 19 tasks (text-described bugs only, no playground answers).
- ✅ Module 06 "QA Practice Lab" — 9 lessons, 30 main tasks + 1 variant: approach & requirements review (text features), then hands-on pages: login (checklist, test case, bug hunt), registration, cart (decision table, bug hunt), search (charter, bug hunt), order (transition run table, bug reports), regression run on login (table + summary report), Todo mini-project (checklist, test case, bug hunt, summary report).
- Theory-module pattern (modules 01–05): each lesson = quiz (6–8 questions, show 5) + 2 practical tasks (classify / order / written), easy → harder. Never put Bug Playground bug answers in model answers of other modules (spoilers for the module 06 bug hunt).
- Next suggested batch: module 07 "How the Web Works" (8 lessons) + module 08 "HTTP, REST APIs & JSON" (8 lessons). They will likely need new engines: CSS/XPath selector tasks (sandboxed iframe over a small HTML snippet) and DevTools hunts (find a value in Console/Network of a playground page). Reuse the playground pages for DevTools practice instead of creating new ones where possible.
- ⏳ Remaining modules in batches (owner reviews each batch). Planned engines to add when needed: CSS/XPath selector tasks (sandboxed iframe), DevTools hunts, SQL (sql.js), Playwright-API simulator over playground pages with mutation grading, `lab/` with real `@playwright/test` + `npm run lab:check <id>`, local mock REST API (Node, zero deps).
- Full outline lives in `content/course.json`.

## Git
Repository on branch `main`, remote `origin` = https://github.com/czszwxy/taqc-course.git (push after each committed batch). Commit after every validated batch (`npm run validate` green) with a message like `Add module 03 Test Design Techniques`, so the owner can always roll back. Never rewrite history (no reset --hard / force) without the owner's explicit request. `.gitattributes` keeps `*.cmd` in CRLF.

## Workflow for a new content batch
1. Read this file and `src/content/schema.ts`; look at one existing lesson as a template.
2. Create `module.json`, lessons, tasks. Keep the course.json lesson titles in sync (lesson number = position).
3. `npm run validate` until green; `npm run typecheck` if code changed.
4. Spot-check in the browser (`npm run dev`).
