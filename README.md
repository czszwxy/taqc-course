# my-university

Self-study courses for IT professions, from zero to your first job: theory (in Ukrainian), practice that is checked
automatically, real tools and a portfolio project. Free, no accounts — it runs in your browser.

**Website for your phone:** https://czszwxy.github.io/taqc-course/ — tasks that need a real browser lab (Playwright,
FastAPI, Django) run on your computer.

## Professions

| Profession | Stack | Status |
|---|---|---|
| QA Automation Engineer | TypeScript + Playwright | ready |
| QA Automation Engineer | Python + pytest + Playwright | ready |
| Python Developer | Python + FastAPI + Django | ready |
| Manual QA Engineer | Testing without code | growing |
| Frontend Developer | HTML + CSS + TypeScript + React | growing |
| Backend Developer | Node.js + TypeScript | coming soon |

Modules that several professions share — testing basics, the web and HTTP, Git, SQL, getting hired — are written once,
and your progress in them counts in every profession that uses them.

## Start on your computer

**Easiest:** double-click **my-university** on the desktop (or `Start my-university.cmd` in this folder).
It starts the local server in a minimized window and opens the app in your browser.
Keep that window open while you study; close it to stop the app.

Manual start (requires [Node.js](https://nodejs.org/) 20+):

```bash
npm install
npm run dev
```

Open http://localhost:5173 — always this exact address: your progress is saved in the browser for this address.

Labs, once: `npm run lab:setup` (Chromium for the Playwright tasks) and `npm run lab:python-setup`
(the Python lab for pytest + Playwright, FastAPI, Django and async tasks; needs Python 3.13).

## What's inside

- **Course map** drawn as a route: tracks are lines, modules are stations, lessons are stops, and the line ends at "First job".
- **Practice checked automatically:** quizzes, test design, test cases and bug reports, decision tables, SQL, CSS / XPath
  selectors, TypeScript and Python code with hidden tests (and mutation testing for your own tests), real Playwright in
  Chromium, HTML / CSS pages with live preview.
- **Bug Playground:** a demo shop with intentional bugs to hunt and automate.
- **Help when stuck:** hints one by one, similar tasks after mistakes, solutions after 3 attempts, "Copy for review"
  to get detailed feedback from Claude.
- **Progress** is saved in your browser. Move it between devices with *Settings → Export / Import*, or sync it through
  a private GitHub gist (*Settings → Sync*).

## Commands

```bash
npm run validate      # check all course content (every task must be solvable)
npm run validate:lab  # run every Playwright task in real Chromium
npm test              # the progress sync merge rules
npm run build         # typecheck + production build into dist/
```
