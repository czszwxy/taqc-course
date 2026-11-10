# QA Academy

Self-study app: from zero to **Trainee QA Automation Engineer** (TypeScript + Playwright).
Theory, curated resources and practice tasks that are checked automatically — all in your browser, offline, free.

## Start

**Easiest:** double-click **QA Academy** on the desktop (or `Start QA Academy.cmd` in this folder).
It starts the local server in a minimized window and opens the course in your browser.
Keep that window open while you study; close it to stop the app.

Manual start (requires [Node.js](https://nodejs.org/) 20+):

```bash
npm install
npm run dev
```

Open http://localhost:5173 — always this exact address: your progress is saved in the browser for this address.

## What's inside

- **Course map:** 6 tracks, 20 modules (see the dashboard). Ready now: *Programming Basics with TypeScript* (module 11) and the demo lesson *Registration form* (module 06).
- **Code tasks:** Monaco editor, real TypeScript compiler (strict mode) and hidden tests. Each failed test explains what is expected.
- **Quizzes**, **test design** tasks (with endless similar tasks), **test case** and **bug report** forms with automatic checks, model answers and self-review checklists.
- **Bug Playground:** demo pages with intentional bugs to hunt.
- **Hints** on demand, **similar tasks** after mistakes, solutions after 3 attempts.
- **Progress** saved in your browser. Use *Settings → Export progress* to back it up.

## Other commands

```bash
npm run validate   # check all course content (every task must be solvable)
npm run build      # production build into dist/
```
