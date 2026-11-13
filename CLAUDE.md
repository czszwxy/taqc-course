# my-university — project guide for Claude

Self-study web app (formerly "QA Academy") with a **catalog of IT professions**: the learner picks a course on the main menu (`/`) and goes from zero to their first job. Courses: QA Automation Engineer — TypeScript + Playwright (complete, 20 modules), QA Automation Engineer — Python + pytest + Playwright (being written, Python modules first), Manual QA Engineer, Python Developer, Frontend Developer, Backend Developer (Node.js). Single learner, runs locally, no backend, no accounts, no paid APIs. The owner may sell the courses later: write all content from official docs and own knowledge — **never** copy or paraphrase other course providers' materials (e.g. Mate Academy).

- **UI language:** English. **Lesson content:** Ukrainian, with English technical terms (`string`, test case, severity…). Code identifiers, test names and model answers for QA artifacts in English.
- Owner is a beginner: explanations must assume zero background, be concrete, QA-flavoured.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173 (also serves the Gadgetly mock API at /api)
npm run validate   # validates ALL content + proves every code task is solvable — run after every content change
npm run validate:lab  # runs every Playwright task (reference must pass + catch all bugs, starter must not pass) in real Chromium — run after changing Playwright tasks or playground pages
npm run lab        # the learner's own Playwright practice tests in lab/tests (npm run lab:report, npm run lab:setup = install Chromium)
npm run typecheck  # tsc on src/ and scripts/
npm run build      # typecheck + production build
```

Windows note: Node is installed at `C:\Program Files\nodejs` — if `node` is not on PATH in a shell, prefix with `$env:Path = "C:\Program Files\nodejs;" + $env:Path`.

Launcher: `Start QA Academy.cmd` (CRLF line endings, ASCII only) + desktop shortcut `QA Academy.lnk` with icon `launcher/qa-academy.ico`. It opens http://localhost:5173 if a server is already listening, otherwise runs `npm install` (first time), `npm run lab:setup` (Chromium into lab/.browsers, no-op when present) and `npm run dev -- --open`.

**Playwright browsers and the Claude app:** Claude's shell runs inside the Claude desktop app package, so anything it writes to `%LOCALAPPDATA%` (e.g. the default `ms-playwright` folder) lands in a *virtualized* copy (`…\Packages\Claude_*\LocalCache\Local\…`) that the owner's own processes cannot see. That is why the lab keeps its browser in the project: `npm run lab:setup` (scripts/lab-setup.ts) installs Chromium into `lab/.browsers` (gitignored), `lab/playwright.config.ts` sets PLAYWRIGHT_BROWSERS_PATH to it when it exists (workers inherit it), and `/__lab/status` checks it first. The project drive (D:\) is not virtualized, so installs done by Claude are visible to the owner's dev server.

The dev port is pinned (`strictPort`, `DEV_PORT` in vite.config.ts) because localStorage progress is tied to that origin — never change the port.

## Code style (enforced by a TS-patterns hook on edits)
No nested ternaries (use a small function or a Record lookup), no magic numbers (named consts, e.g. `formatModuleNumber` in `src/lib/format.ts`), prefer `map/filter/reduce` over raw loops in app code. Content task files (`content/**`) are learner exercises and intentionally use loops.

## Theme ("QA Notebook")
The app's own look (chosen by the owner so it does not resemble other course platforms): light = **grid paper** with ink, a yellow **highlighter** and a red **pen**; dark = a **blueprint** (navy paper, light grid). Colors are CSS variables in `src/index.css` (`:root` = light, `.dark` = dark), exposed to Tailwind as `bg-canvas / bg-surface / bg-hover / bg-sunken / border-line / text-fg / text-muted / text-faint / *-accent* / text-accent-on / *-ok* / *-bad* / *-warn* / bg-highlight + text-highlight-fg / text-pen / *-track*`. Layering: canvas < surface < hover (hover is always *lighter* in dark mode). Body text targets ~12:1 contrast, secondary ≥ 4.5:1. Text on `bg-accent` uses `text-accent-on` (never hard-coded white — the dark accent is light).
- Fonts are bundled locally via `@fontsource-variable/*` (imported in `src/main.tsx`; all with Cyrillic): Manrope (`font-sans`, UI and body), Lora (`font-display`, page titles and lesson headings), Caveat (`font-hand`, short handwritten notes in pen colour — use sparingly), JetBrains Mono (`font-mono`, code and the Monaco editors). Code never uses ligatures (beginners must see `===`, `>=`).
- Notebook helpers (index.css components): `.page` (solid paper card for long reading on top of the grid), `.marker` (highlighter behind a word; full marker in dark mode), `.hand` (handwritten red-pen note), `.sticky-note`, `.track-tab` + `track-1…6` (coloured divider tab per course track; `trackClass(i)` / `TrackTab` in `components/ui.tsx`, `trackIndexOf(moduleSlug)` in `src/app/tracks.ts`). Callouts render as notes: TIP = sticky note with tape, NOTE = index card, WARNING = dashed box, IMPORTANT = red-pen box, QA = ink-bordered card; labels in the handwritten font.
- Layout: a top bar (`src/app/Layout.tsx`: logo, Course map, Bug Playground, lessons counter, theme, settings) — no global sidebar. The home page is the **course map** (tracks → module cards with one checkbox per lesson). Lesson pages show `LessonMenu` (the current module's lessons, `src/app/LessonMenu.tsx`) as a sticky column on ≥lg and a collapsible menu on small screens. Status icons are notebook checkboxes (`StatusIcon`).
- Monaco themes `qa-dark` / `qa-light` in `src/monaco/setup.ts` mirror the palette. Playground pages keep their own fake-product look (PlaygroundShell) and are not themed.

## Stack

Vite 6 + React 19 + TypeScript, React Router 7, Tailwind CSS v4 (CSS-variable tokens in `src/index.css`, dark mode via `.dark` class), Zustand (+ persist → localStorage), Zod (content schemas), react-markdown + remark-gfm + rehype-highlight, Monaco (`@monaco-editor/react`, bundled locally — no CDN), real `typescript` compiler in a Web Worker, `sql.js` (SQLite in WebAssembly, wasm bundled locally via `?url`) for SQL tasks, **Pyodide** (CPython in WebAssembly, npm `pyodide`; vite.config.ts serves its 5 files at `/pyodide/` in dev/preview and emits them into `dist/pyodide/`) for Python tasks. Dev-only: `jsdom` (validator checks selector tasks), `tsx`.

## Architecture

```
content/                     ← ALL course content (data only, no code changes needed to add lessons)
  databases/<name>.sql       ← SQLite setup scripts for sql tasks (gadgetly.sql = clean shop data; gadgetly-anomalies.sql = defects applied on top)
  courses/<id>.json          ← one profession each (catalog fields + tracks → modules). Modules are a SHARED POOL: a course lists module slugs; one module (Git, SQL, testing theory, Getting Hired, Python basics…) can be in several courses and its progress counts in all. A module entry needs `lessons` (planned titles) only when the module is not built yet. Modules without a folder show as "coming soon". Module numbers shown in the UI are positions inside the course; folder prefixes (`21-…`) are pool ids (unique, two digits).
  modules/<NN-slug>/module.json
  modules/<NN-slug>/lessons/<NN-slug>/lesson.json   ← title, minutes, summary, resources[]
  modules/<NN-slug>/lessons/<NN-slug>/lesson.md     ← theory (Markdown, callouts)
  modules/<NN-slug>/lessons/<NN-slug>/tasks/<NN-slug>/task.json (+ starter.ts / solution.ts / tests.ts for code tasks)
src/
  content/schema.ts          ← Zod schemas = the content format contract (source of truth)
  content/loader.ts          ← import.meta.glob discovery; builds Course tree; lazy-loads lesson.md and task .ts files
  runner/compiler.ts         ← pure: real TS compiler over in-memory FS (strict, ES2022 libs, CommonJS emit)
  runner/harness.ts          ← pure: Jest-like describe/it/expect + CommonJS loader + console capture
  runner/harness-dts.ts      ← globals the compiler sees (console, timers, fake fetch, describe/it/expect, hooks, captureConsole); TEST_GLOBALS_DTS is also added to Monaco
  runner/fake-fetch.ts       ← pure: offline fake fetch (Gadgetly API at https://api.gadgetly.test) for async/fetch lessons
  runner/mutation.ts         ← pure: tests-mode checking (learner tests vs subject.ts and mutants)
  runner/client.ts           ← main-thread API: checkCode / runCode (compile worker reused; exec worker per run, 5 s timeout)
  runner/*.worker.ts         ← Web Workers
  runner/python/qa_runner.py ← Python test runner (runs inside Pyodide): test_* functions and Test* classes without __init__ (fresh instance per test, names `TestCart::test_add`), assert messages like pytest ("assert 4 == 5"), docstring = hint, fixtures (yield, scopes, conftest.py), parametrize, capsys, tmp_path (fresh folder per test under /tmp/qa-tmp, wiped each run); run_program for the Run button
  runner/python/pytest_shim.py ← offline pytest subset written into the task folder as pytest.py (raises, approx, fail, mark.parametrize, custom marks, fixture)
  runner/python.worker.ts    ← loads Pyodide once from /pyodide/ and runs jobs; python-client.ts = main-thread API (5 s per run after Python loaded; a timeout kills the worker) + checkPythonSolution / checkPythonTests (mutants) + evaluatePythonRules
  features/python/           ← PythonTaskView (Monaco "python", Run / Check, tests mode with mutants)
  features/progress/         ← Zustand stores (progress + settings) and selectors (task/lesson/module stats)
  features/playwright/       ← playwright task view (lazy), client.ts (lab endpoints), grade.ts (pure grading), monaco-types.ts (real @playwright/test .d.ts for the editor)
  features/sql/              ← sql task engine (engine.ts: pure run/compare/check on a fresh DB per run; load.ts: lazy sql.js; SqlTaskView.tsx, lazy-loaded)
  features/tasks/            ← one view per task type + forms.ts (rules, bug matching) + generators.ts (value-set) + selectors.ts (CSS/XPath checking, pure) + techCheck.ts (tech-check sampling, scoring, Claude/mentor prompts, pure)
  playground/                ← intentionally buggy demo pages (Bug Playground) + registry.ts
  pages/                     ← Dashboard, ModulePage, LessonPage (Theory/Resources/Practice tabs), TaskPage, Settings, Playground
server/mock-api.ts           ← Gadgetly REST API mounted into the Vite dev/preview server (/api buggy, /api-fixed correct); data in server/mock-data.json
server/checkout-api.ts       ← pure handlers of the module 20 checkout API (quote, orders, tracking) wired into mock-api.ts; rules/catalogue in src/playground/data/checkout.json (shared with CheckoutPage)
lab/playwright.config.ts     ← Playwright config: `npm run lab` runs lab/tests; with QA_LAB_RUN_DIR (set by the runner) it runs one graded spec as several projects (correct page + one per bug)
server/lab-runner.ts         ← real Playwright runs for playwright tasks: POST /__lab/run, GET /__lab/status (mounted by vite.config.ts); runLab() also used by scripts/validate-lab.ts
server/lab-types.ts          ← shared lab constants/types (LAB_BASE_URL, LAB_BUGS_KEY, results)
scripts/validate-lab.ts      ← runs every playwright task's solution/starter through runLab()
scripts/validate-content.ts  ← Node; reuses compiler/harness/mutation/forms/generators/selectors (jsdom) to verify content; runs tasks one at a time (real timers); python tasks run through scripts/python-node.ts (Pyodide in Node + the same qa_runner.py)
lab/                         ← real Playwright: playwright.config.ts, tests/ (learner practice, example.spec.ts), .runs/ (temporary graded runs, gitignored)
```

IDs come from folder names: lesson id `11-ts-basics/02-variables-and-types`, task id `<lessonId>/<task-folder>`. **Never rename content folders after release** — progress in localStorage is keyed by these ids. Numeric prefixes (`01-`, `02-`) define order; lesson number N maps to planned lesson N of the module in the course outline.

## Content format

### lesson.json
```json
{ "title": "...", "minutes": 50, "summary": "one line (Ukrainian)",
  "resources": [{ "title": "...", "url": "https://...", "kind": "docs|article|video|course|tool|book", "lang": "en|uk", "note": "optional", "needsVerification": true }] }
```
Resource rules: only well-known sources (typescriptlang.org, playwright.dev, MDN, istqb.org, glossary.istqb.org, git-scm.com, code.visualstudio.com, uk.javascript.info, official channels). **Never invent URLs.** For videos use YouTube **search** URLs (`https://www.youtube.com/results?search_query=...`) instead of guessing video IDs. Always `"needsVerification": true` (the learner verifies; UI shows a badge + "I checked it" toggle).

### lesson.md
Markdown + GFM tables. Callouts: a blockquote starting with `[!TIP]`, `[!NOTE]`, `[!WARNING]`, `[!IMPORTANT]` or `[!QA]` (QA angle — connect the topic to testing). Code fences: `ts`, `python`, `bash`, `json`, `sql`, `yaml`, `text`. Internal links starting with `/` use the router (e.g. `/playground`). Structure: intro (why it matters for QA) → sections with examples → callouts → `## Підсумок` bullet summary. ~100–180 lines.

### task.json — common fields
`type`, `title` (English), `hints[]` (progressive, revealed one by one; Markdown), `explanation` (Markdown "How to approach it", shown after a failed attempt), `optional?`, `variantOf?` (folder name of the main task in the same lesson → this task becomes its "similar task"; must have the same type).

| type | extra fields | how it's checked |
|---|---|---|
| `quiz` | `questions[]` (`kind`: `single` / `multiple` / `text`), `show?` (sample size per attempt), `passScore` (default 0.8), `intro?`, `playground?` | auto; per-option `explain`, per-question `explanation`; retry = new random sample (seed) |
| `code` | `statement`, `codeRules[]` (`require`/`forbid` regex on comment-stripped code, use sparingly), `mode?` (`solution` default / `tests`), `mutants[]` + `minTests?` (tests mode) + files `starter.ts`, `solution.ts`, `tests.ts`; any other `*.ts` in the task folder is a read-only **support file** the code can import (`./money`) | solution mode: real TS compile (strict) of solution + tests, then hidden tests in a worker. Tests mode: the learner writes tests for `subject.ts`; they must pass on it and fail on every `mutants/<id>.ts` (mutation testing, `src/runner/mutation.ts`) |
| `value-set` | `generator: { name, params }` (see `features/tasks/generators.ts`, e.g. `bva-range`) | set comparison with targeted feedback; "similar task" = new seed → new generated problem |
| `test-case` | `statement`, `playground?`, `rules[]`, `model` (title, type, priority, preconditions, testData, steps[], expectedResult), `checklist[]` | built-in structure rules + task `rules` → then model answer + self-review checklist |
| `bug-report` | `statement`, `playground`, `minBugs`, `bugs[]` (`id`, `title`, `match[]` regexes — ALL must match, `severity[]` accepted, `severityWhy`, `model` report), `checklist[]` | quality rules → match report to a known bug (prefers bugs whose patterns appear in title/actual) → severity check |
| `classify` | `statement`, `categories[]` (`id`, `label`, `description?`), `items[]` (`id`, `text`, `category`, `explain?`), `show?`, `passScore` | each item assigned to one category; retry = new random sample (seed). Ideal for theory modules: "error/defect/failure", "smoke/sanity/regression" |
| `order` | `statement`, `items[]` **in the correct order** (≥ 3) | UI shuffles; exact order required; green/red per row; correct order revealed after 2 fails |
| `written` | `statement`, `playground?`, `fields[]` (`id`, `label`, `kind`: `text`/`textarea`/`list`, `placeholder?`, `hint?`), `rules[]`, `model` (field id → string or string[]), `checklist[]` | all fields required + rules → model answer + self-review checklist + Copy for review. Use for acceptance criteria, requirement reviews, charters, plans |
| `table` | `statement`, `playground?`, `givenColumns[]` (header labels), `answerColumns[]` (`id`, `label`, `options[]`), `rows[]` (`given[]` same length as givenColumns, `answers` {colId → option}, `explain?`) | every answer cell must match; green/red per cell; row `explain` shown for wrong rows; answers revealed after 2 fails. Use for decision tables, state transition tables, partition tables, traceability matrices |
| `sql` | `statement`, `database` (name or array of names from `content/databases/*.sql`, run in order), `challenges[]` (`id`, `prompt`, `model`, `verify?`, `orderMatters?`, `rules[]` require/forbid regex on the query, `explain?`) | each run uses a fresh in-memory copy. SELECT challenge: learner result vs model result (set comparison unless `orderMatters`; column names ignored, column count/order matter). Change challenge (`verify` set): run the statement, then `verify`, compare with the same after the model (order matters → put ORDER BY in `verify`). Validator: model runs, SELECT models return ≥1 row, change models really change the verify result, rule regexes compile and pass on the model. References revealed after 2 fails |
| `playwright` | `statement`, `playground` (page id), `mutants[]` (`id` = a bug flag from that page's `bugIds` in registry.ts, `description`, `hint`), `minTests?`, `codeRules[]` + files `starter.ts`, `solution.ts` (full spec files importing `@playwright/test`) | real Playwright in Chromium via the dev-server runner: the spec must be green on the correct page and red on every page variant with one mutant bug turned on; `codeRules` on the spec. `validate` checks files/ids/rules statically; `validate:lab` runs reference + starter |
| `python` | `statement`, `codeRules[]` (regex on code without `#` comments), `mode?` (`solution` / `tests`), `mutants[]` + `minTests?` (tests mode) + files `starter.py`, `solution.py`, `tests.py`; other `*.py` = read-only support files (`subject.py` in tests mode), `mutants/<id>.py` | real Python (Pyodide) in a worker. Solution mode: hidden `tests.py` (`from solution import fn`, `test_*` functions, docstring = hint) on the learner's `solution.py`; Run executes `solution.py` and shows print() output. Tests mode: learner's `tests.py` must pass on `subject.py` and fail on every mutant. Validator runs them in Node with Pyodide |
| `tech-check` | `intro?`, `show` (default 12), `secondsPerQuestion` (default 120), `passScore`, `questions[]` (`id`, `module` = slug of the module the question checks, `question`, `answer` model answer, `keyPoints[]`, `followUp?` {question, answer}) | interview simulation: a session draws `show` questions **balanced across modules** (round-robin) and only from modules of the current course; soft timer; the learner answers out loud, opens the model answer and ticks the key points they said; score = share of ticked points (≥ passScore). Results by topic link to modules to revisit. Buttons: "Practice with Claude" (interviewer prompt with the bank), "Questions for a mentor", Copy for review. Validator: unique ids, known module slugs, every course containing the host module gets ≥ 1 question (warns when fewer than `show`) |
| `selector` | `statement`, `syntax` (`css` or `xpath`), `html` (snippet; targets marked `data-expect="<challengeId> …"`, marker stripped before display), `challenges[]` (`id`, `prompt`, `model`, `rules[]` require/forbid regex on the selector text, `explain?`) | live match count + highlighting in a sandboxed iframe; a selector is correct when it matches exactly the marked elements (+ rules); reference selectors revealed after 2 fails. Validator runs every `model` through jsdom. Use for CSS/XPath/locator practice |

Value-set generators (`src/features/tasks/generators.ts`, presets in `range-presets.json`): `bva-range` (params `field`, `min`, `max`, `unit?`, `approach`: `two-value` | `three-value`) and `ep-range` (one representative per integer partition: below / inside / above). Seed 0 uses the task params; other seeds pick a random preset.

Field rules (`rules[]`): `{ field, check, value?, message }` where `check` ∈ `required | minLength | minItems | mentionsAny | mentionsAll | notMentions | equals | oneOf`; `field: "any"` = all fields joined. Regexes are case-insensitive with the `u` flag — don't use `\b` next to Cyrillic, avoid unnecessary escapes (u-mode is strict), cover EN + UK wording.

### Code task conventions
- Runtime available to task code: `console`, timers (`setTimeout`…), `fetch` — an **offline fake** of the Gadgetly API at `https://api.gadgetly.test` (`src/runner/fake-fetch.ts`, seed in `src/runner/fake-api-data.json`: token `test-token-42`, user 42, order 1002, next order id 1003), test hooks `beforeEach/afterEach/beforeAll/afterAll`, `captureConsole` / `captureConsoleAsync`, `toThrow(ErrorClass)`. Per-test timeout 2 s, whole run 5 s.
- Type-level checks: put `// @ts-expect-error` lines inside an exported, never-called `compileTimeChecks()` in tests.ts (e.g. assigning to a readonly field). If the learner's types are too loose, TS2578 "Unused '@ts-expect-error'" appears (it has a tip in `ts-tips.ts`).
- Tests mode (module 14+): files `subject.ts` (correct code, shown read-only), `mutants/<id>.ts` (full copies of subject.ts with ONE bug each), `starter.ts` (starting tests file), `solution.ts` (reference tests that must kill every mutant); task.json lists `mutants[{ id, description, hint }]` — `hint` is shown while the mutant survives, `description` after it is caught. `codeRules` apply to the learner's tests (e.g. require `beforeEach`).
- Markdown in task JSON: inline code that contains a template literal needs a double-backtick span, e.g. ``` `` return `${a}`; `` ``` — single backticks around it break the rendering.
- `starter.ts` must export the same names/signatures as `solution.ts` (functions with empty body + `// твій код тут`). The starter must NOT pass (validator enforces).
- `tests.ts`: `import { fn } from './solution';` then `describe/it/expect`. Third argument of `it(name, fn, hint)` is a Ukrainian hint shown when that test fails — write one for every non-trivial test explaining the likely mistake. Cover boundaries/empty input. `captureConsole(() => fn())` returns printed lines.
- Matchers: toBe, toEqual/toStrictEqual (deep, ignores undefined props), toBeTruthy/Falsy, toBeNull/Undefined/Defined/NaN, toBeGreaterThan(OrEqual)/LessThan(OrEqual), toBeCloseTo, toContain, toHaveLength, toHaveProperty, toMatch, toBeInstanceOf, toBeTypeOf, toThrow, `.not`, `.resolves`/`.rejects`.
- Only use language features taught so far in the module (e.g. no `map/filter` in module 11). Compiler: ES2022 libs, no DOM, strict, `noImplicitReturns`.
- Statement in Ukrainian with examples in a ```ts block; 2–3 hints; explanation with the idea + common mistake.
- Give ~1 task per lesson a `-v2` similar variant (`variantOf`).

### Python task conventions
- Starters: the same signatures as the solution with `# твій код тут` + `pass` (a body with only a comment is a SyntaxError). The starter must NOT pass (validator enforces); a "fix the code" starter may contain the bugs/syntax errors to fix.
- `tests.py`: `from solution import fn`, one behaviour per `test_*` function, a Ukrainian docstring hint on every non-trivial test (shown when it fails), boundaries and empty input covered. Plain `assert` — the runner shows compared values. Programs that print: purge and import inside a test with `capsys` (see 21-python-basics/01-first-program/02-print-report). File tasks: tests create their files in the built-in `tmp_path` fixture and pass paths to the learner's functions (see 24-python-oop-files lessons 05–06, 08).
- Multi-step projects: each later step gets the reference solution of the earlier step as a read-only support file (e.g. `models.py` in 24-python-oop-files/08-mini-project), so a mistake in step 1 never blocks step 2.
- Theory examples must not be the solution of a task in the same lesson — use another domain for the example.
- pytest tasks (module 25+) use tests mode: `"mode": "tests"`, `subject.py` (correct code, shown read-only), `mutants/<id>.py` (full copies of subject.py with ONE bug each, 3–6 per task), `starter.py` = the learner's `tests.py` start (imports + one example test that kills at most one mutant + `# твій код тут`), `solution.py` = reference tests that kill every mutant; `minTests`; every mutant has a `hint` naming the behaviour to test (shown while it survives) and a `description` (shown once caught). A "fix the test" starter may contain a wrong expectation (red on the correct subject).
- Available: the Python standard library and the pytest subset above (no pip packages in the browser yet — requests/Playwright for Python need the local lab, planned for modules 27–29). Per run 5 s.
- Only use language features taught so far in the module; Python style: snake_case, 4-space indents, f-strings.

### SQL task conventions
- Database facts the tasks rely on are listed in the header comment of `content/databases/gadgetly.sql` (users 7, 9, 10 have no orders; product 6 never ordered; user 9 city NULL; prices are integer UAH; dates are TEXT `YYYY-MM-DD`). Change the seed only together with the tasks — the validator will catch most breakages.
- Prompts name the exact columns in order; ask for "0, not NULL" explicitly when COALESCE is needed; avoid ties when `orderMatters` (add a tie-breaker to the prompt).
- sql.js returns no result set for a 0-row SELECT, so "no rows" and "not a SELECT" compare equal — fine for verify queries that should become empty.
- Use `rules` to stop hard-coded answers where the technique matters (e.g. require `left\s+join|not\s+(in|exists)` for "rows without a match", `<=\s*0` for "0 or less").
- Writing task JSON through a bash heredoc strips backslashes in regexes — write content with the Write tool (bundles) instead.

### Playwright task conventions
- Specs use relative URLs (`page.goto('/playground/login')`); baseURL is the app (port 5173). Lab timeouts: test 15 s, expect 3 s, action 5 s.
- Bug variants: each project's browser user agent gets `qa-lab-bugs=<none|bugId>` appended (lab/playwright.config.ts) — a learner's own `storageState` or new tabs/contexts keep it; pages read it through `withLabMode(getBugs(fixed))` (PlaygroundShell; localStorage `qa-lab:bugs` is only a fallback). It wins over `?fixed`. Every new playground page must wrap its flags the same way and list them in `bugIds` (registry.ts) in the same order. A page's bug count shown in the Playground is `bugIds.length` (registry derives it).
- API tasks: the `request` fixture (and `browser.newContext`) inherit the project's user agent, so the marker also reaches `server/mock-api.ts`, which applies it to its own bug flags (`applyLabBugs` + `labBugsFromUserAgent` in server/lab-types.ts) — API bugs are graded like page bugs (`bugIds` of the `api` page). Mutant ids may come from any page's `bugIds` (API + UI tasks mix them); `playground` only picks the "Open page" link.
- The mock API store is shared by all projects of a run (and by the owner's API console): API specs must create their own data, address it by id, clean it up, and never assert global counts or call `/reset`.
- Visual tasks: if the spec contains `toHaveScreenshot(`, the runner first runs the correct project with `--update-snapshots` (baseline), then all projects; graded runs share one snapshot folder (`snapshotPathTemplate`).
- The dev app runs React StrictMode: effects (and their fetches) run twice on mount — mocks in references must not rely on call counters (use a flag that the test flips).
- Starters: imports + one complete example test + `// твій код тут`; they must pass on the correct page but miss some bugs (or break a code rule) — `validate:lab` enforces that the starter does not pass.
- Prefer user-facing locators in references (getByRole/getByLabel/getByText, getByTestId when needed). Watch for partial label matches (`getByLabel('Password', { exact: true })`) and for requirement-panel text when using getByText.
- A Check runs ~5–20 s; keep 2–6 mutants per task.

### Bug Playground
Pages in `src/playground/`, registered in `registry.ts`, routed standalone (no app chrome) in `App.tsx`. Each page has intentional bugs behind flags (`getBugs(fixed)`) and a `?fixed` query param that disables them (for future Playwright "must pass on fixed / fail on buggy" grading; never advertise `?fixed` to the learner). Keep the page's bug flags and the task's `bugs[]` catalog in sync. Use semantic HTML, labels and `data-testid` for future automation.

- Shared chrome: `PlaygroundShell.tsx` (brand header, yellow "Requirements (for testers)" panel, optional **Reset demo data** button, `isFixedMode()`, `PgField`, `inputClass`, `formatUah`). Data lives in `src/playground/data/*.json`.
- Pages and bug counts: signup 7, login 6, cart 6, search 6, order 5, account 8 (module 16: session in localStorage `gadgetly:token`, orders from `GET /api/orders`, confirm/prompt/alert, Help chat iframe = `/playground/help-widget`, Terms link → `/playground/terms` in a new tab), todo 6 (todo persists to localStorage keys `qa-playground:todo` / `qa-playground:todo-fixed`), devtools 6 (DevTools Lab: hidden values, console messages, network requests, storage — answers exist only in DevTools), responsive 4 (layout bugs at certain widths), api 6 (bugs live in `server/mock-api.ts`; the page is an in-app API client with docs and a JWT decoder), checkout 12 (module 20 system under test: 7 page flags in CheckoutPage.tsx + 5 checkout API flags in mock-api.ts getBugs — all listed in the `checkout` page's bugIds, page flags first; the page talks to /api-fixed when `?fixed`; totals always come from `POST /api/checkout/quote`; placing an order waits `processingMs` so a double click is observable).
- Gadgetly API (`server/mock-api.ts`): products (14, from `src/playground/data/products.json`), login → deterministic JWT for `qa@gadgetly.test` / `Test1234` (user 42; order 1002 is theirs, 1001 belongs to user 17), orders CRUD, `/slow?ms=`, `/lab/*` helpers for the DevTools Lab, checkout endpoints (`/checkout/products|quote|orders|orders/:id?phone=`, orders start at #2001, DELETE for cleanup), `POST /reset`. Status codes and limits live in `server/mock-data.json` (hook: no magic numbers). Answers in content tasks depend on this seed data — change it only together with the tasks.
- Tasks reference a page with `playground: "<id>"` (test-case, bug-report, written, table, quiz) → "Open page" button (`PlaygroundLink` in `features/tasks/shared.tsx`). The validator rejects unknown ids.
- Bug catalog regexes: every `match` pattern must hit the report; ties are broken by hits in title + actual result, then by catalog order. Make patterns specific enough that one bug's model never matches another bug better (the validator checks self-matching). Avoid bare `case` (matches "test case"), `esc` (matches "description"), `три` (matches "отримати").
- Table/given cells and other Markdown fields: wrap emails in backticks, otherwise they render as mailto links.

## Progress & UX rules
- Progress in localStorage (`my-university:progress`, `my-university:settings` — copied once from the old `qa-academy:*` keys, which stay as a backup; settings also hold `currentCourseId`); export/import JSON on Settings page (imports old `qa-academy` files too).
- Routes: `/` catalog (main menu), `/course/:id` course map (sets the current course), `/module/:slug`, `/learn/:module/:lesson[/:task]` (module-centric; pages use `useCourseForModule` — the current course if it lists the module, otherwise the first course that does).
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
- ✅ Module 07 "How the Web Works" — 8 lessons, 24 tasks (selector tasks for CSS and XPath, DevTools hunts on the DevTools Lab, responsive bug hunt).
- ✅ Module 12 "TypeScript: Types & Working with Data" — 9 lessons, 36 main tasks + 9 variants.
- ✅ Module 13 "TypeScript: OOP, Modules & Async" — 9 lessons, 36 main tasks + 8 variants (support files, Promises with real timers, fetch against the offline fake API).
- ✅ Module 14 "Your First Automated Tests" — 5 lessons, 17 tasks; 8 tests-mode tasks with 37 mutants.
- ✅ Module 09 "Command Line, Git & GitHub" — 7 lessons, 21 tasks + 1 variant (command tables, order flows, commit-message and .gitignore classification, PR description, merge-conflict code task with conflict markers in starter.ts, test-code review).
- ✅ Module 10 "SQL for Testers" — 6 lessons, 18 tasks + 3 variants; new `sql` task engine (sql.js) on the Gadgetly training database; lesson 6 uses `gadgetly-anomalies.sql` for integrity checks.
- ✅ Module 15 "Playwright Basics" — 9 lessons, 25 tasks + 4 variants; new `playwright` task engine (real @playwright/test in Chromium via the dev server, mutation grading against playground bug variants); 10 Playwright tasks on login, signup, search, todo, cart and the API console.
- ✅ Module 16 "Playwright in Practice" — 9 lessons, 23 tasks + 1 variant; 10 Playwright tasks (describe/hooks/tags on the order page, debugging broken login tests, dialogs/iframe/new tab and session/storageState and route mocking on the new account page, Page Object on signup, custom fixtures and request inspection on the DevTools Lab, data-driven cart tests, visual comparisons on the responsive page).
- ✅ Module 17 "API Testing & Framework Design" — 7 lessons, 19 tasks; 5 Playwright tasks with mock-API mutants (first API tests, contract validation, CRUD with cleanup, API + UI on the account page — it now shows order totals — and a capstone mini framework with clients, page objects and fixtures).
- ✅ Module 18 "CI/CD for Test Automation" — 4 lessons, 12 tasks (pipeline order, when-to-run table, YAML meaning table, write a Playwright workflow, sharded run with merged report, investigate a failed CI run, flaky maintenance classify + stabilization plan).
- ✅ Module 08 "HTTP, REST APIs & JSON" — 8 lessons, 24 tasks (hands-on with the API console: status-code run, params hunt, CRUD flow, token hunt, API bug hunt).
- Theory-module pattern (modules 01–05, 09): each lesson = quiz (6–8 questions, show 5) + 2 practical tasks (classify / order / written), easy → harder. Never put Bug Playground bug answers in model answers of other modules (spoilers for the module 06 bug hunt).
- ✅ Module 19 "Getting Hired" — 12 lessons (expanded from research of real junior QA interviews: DOU 250+ questions, junior bar, job-search articles): question banks per topic (theory, JS/TS, Playwright, web/HTTP/API, SQL/Git/Agile, final mixed exam), practical on-the-spot tasks, English, job search, Claude mock interview. Original 6 lessons: mock-interview quizzes per lesson, written answers (theory differences, "test an elevator", your framework, CV, STAR, tell me about yourself), 3 TypeScript live-coding tasks, a Playwright live-coding task on login, and a 4-part take-home simulation on the account page (plan → bug hunt with a 7-bug catalog → graded automation → README). The account-page bug answers live only in lesson 04 — keep them out of other modules.
- ✅ Module 20 "Final Portfolio Project" — 5 lessons, 18 tasks on the new Gadgetly Checkout page + checkout API (12 bugs): brief/requirements review/test plan, checklist, decision table (fee × discount), boundary test case, a 12-bug hunt (UI + API), then 5 graded Playwright milestones (page object, fixtures, quote API tests, API + UI flows with cleanup, an 8-mutant regression suite), and the portfolio track: own repo on the public Toolshop demo (practicesoftwaretesting.com + API/Swagger) with CI, README, final review. Checkout bug answers live only in module 20 lesson 02.
- Course outline complete (modules 01–20). Next: owner feedback and polish.
- ✅ Tech checks (`tech-check` task type): the last lesson of the last module of each block is a tech check over the whole block — 05 lesson 08 (QA fundamentals 01–05, 31 questions), 06 lesson 10 (practical QA, 17, show 10), 10 lesson 07 (web, HTTP, Git, SQL 07–10, 29), 14 lesson 06 (TypeScript & first tests 11–14, 29), 18 lesson 05 (test automation 15–18, 29), 24 lesson 09 (Python 21–24, 32). Modules are shared, so the Python QA and Manual QA courses get the first ones automatically (questions are filtered to the course's modules). For the Python course add one more at the end of the automation block; never put Bug Playground bug answers into tech-check answers.
- ✅ Python engine: `python` task type (Pyodide worker, pytest-like runner, tests mode with mutants, Node validation).
- ✅ Module 21 "Python Basics" (Python QA course; shared with Python Developer) — 8 lessons, 44 tasks (35 Python code tasks incl. 12 variants, quizzes, an error-type classification): first program, variables/types, operators, strings & f-strings, conditions, loops (polling with while), functions (decomposition, assert), tracebacks & debugging. Strengthened to the TS course's depth: step-by-step walkthroughs (variable tables, loop iteration tables, call flow), "typical mistakes" sections, ~380 words per lesson, ~4 code tasks per lesson. Theory examples must not be the solution of a task in the same lesson.
- ✅ Module 22 "Python Collections" — 7 lessons, 35 tasks (28 Python code tasks incl. 10 variants, 7 quizzes; strengthened with walkthrough tables and typical mistakes): lists (copy vs alias), tuples & unpacking (enumerate/zip), dictionaries (count/group, missing contract fields), sets (missing/unexpected ids, duplicates), comprehensions + any/all (empty-list trap), sorting with key/lambda/tuple keys, nested JSON-like data + the json module.
- ✅ Module 23 "Functions, Modules & Errors" — 7 lessons, 36 tasks (26 Python code tasks incl. 9 variants, 7 quizzes, an output-order task, a type-hint table, a type-checker classify; strengthened with walkthroughs — argument binding, closure state between calls, callback flow, import steps, try/else/finally flow, generator next() table): parameters (**overrides builder, mutable default fix, *args), closures (limit checks, unique emails), functions as values (checks dict, retry/poll, map/filter), modules & stdlib (support file money.py, datetime, random.Random(seed)), exceptions (ValueError with context, ApiError from e via support file errors.py, pytest.raises), type hints (checked with typing.get_type_hints), generators (pages, endless emails, backoff, lazy log reading).
- ✅ Module 24 "OOP, Files & Project Setup" — 9 lessons, 40 tasks (27 Python code tasks incl. 9 variants, 7 quizzes, project-setup order / classify / command table / README written task, a tech check): classes (checklist, cart, run report), inheritance & composition (exception hierarchies, API client with an injected FakeSession support file), dataclasses (models, default_factory, frozen + replace), special methods (Money, Version, collection-like classes), files & pathlib (tmp_path tasks), JSON & CSV (DictReader with quoted commas, DictWriter), venv/pip/project structure (Windows-first), a 3-step mini-project (user model → JSON loader collecting errors → repository with CSV export), tech check "Python".
- ✅ Module 25 "pytest Basics" (course position 15) — 6 lessons, 24 tasks: 13 tests-mode tasks with 50 mutants (first tests for a discount function, boundary tests for ranges / password length / status classes, email normalization, "fix the test, not the code", a `class TestCart`, tests with a data builder, negative tests with pytest.raises + match, approx, an API exception hierarchy, a 6-mutant form validation suite, discount rules from a decision table), 6 quizzes, collection / output-marker / good-practice / weak-vs-strong classifies, a pytest command table.
- Next (Python QA course): 26 pytest in Depth (fixtures, conftest, parametrize, markers, monkeypatch), 27–28 Playwright for Python (needs a local Python lab like the Node one: venv + pytest-playwright, browsers in lab/.browsers), 29 API testing with Python, 30 CI, 31 interview, 32 final project.
- Outlines live in `content/courses/*.json` (status `available` / `in-progress` / `planned`, `order` in the catalog).

## Git
Repository on branch `main`, remote `origin` = https://github.com/czszwxy/taqc-course.git (push after each committed batch). Commit after every validated batch (`npm run validate` green) with a message like `Add module 03 Test Design Techniques`, so the owner can always roll back. Never rewrite history (no reset --hard / force) without the owner's explicit request. `.gitattributes` keeps `*.cmd` in CRLF.

## Workflow for a new content batch
1. Read this file and `src/content/schema.ts`; look at one existing lesson as a template.
2. Create `module.json`, lessons, tasks. Keep the course outline(s) in `content/courses/` in sync (lesson number = position; add the module to every course that should include it).
3. `npm run validate` until green; `npm run typecheck` if code changed.
4. Spot-check in the browser (`npm run dev`).
