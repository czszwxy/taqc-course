/*
 * Extra Python packages bundled with the app: Pyodide wheels kept in vendor/pyodide-packages (copied from the
 * Pyodide release that matches the npm `pyodide` version — the same ABI). vite.config.ts serves and emits them
 * next to Pyodide under /pyodide/; scripts/python-node.ts loads them from the folder. A job loads a package only
 * when its code imports it, so ordinary Python tasks stay as fast as before.
 *
 * Adding a package: download its wheel (and the wheels of its dependencies that Pyodide does not ship in the
 * stdlib) from https://cdn.jsdelivr.net/pyodide/v<version>/full/ — names and sha256 are in pyodide-lock.json —
 * into vendor/pyodide-packages and add an entry here, dependencies first.
 */

export interface PythonPackage {
  /** The import name the job's code uses (`import sqlalchemy`, `from sqlalchemy.orm import …`). */
  readonly module: string;
  /** Wheel file names in vendor/pyodide-packages, dependencies first. */
  readonly wheels: readonly string[];
  /** Run once after loading, so the slow first import is not counted in the learner's time limit. */
  readonly warmUp: string;
}

export const PYTHON_PACKAGES_DIR = 'vendor/pyodide-packages';

export const PYTHON_PACKAGES: readonly PythonPackage[] = [
  {
    module: 'sqlalchemy',
    wheels: ['typing_extensions-4.15.0-py3-none-any.whl', 'sqlalchemy-2.0.48-cp314-cp314-pyemscripten_2026_0_wasm32.whl'],
    warmUp: 'import sqlalchemy, sqlalchemy.orm',
  },
];

/** Every bundled wheel file name (served and emitted by vite.config.ts). */
export const PYTHON_PACKAGE_WHEELS: readonly string[] = PYTHON_PACKAGES.flatMap((pkg) => pkg.wheels);

/** True when a line of `code` starts with an import of `module`. */
const importsModule = (code: string, module: string): boolean => {
  // A line that starts (indentation allowed) with `import <module>` or `from <module>`. For "sqlalchemy":
  // matches "from sqlalchemy.orm import Session" and "    import sqlalchemy"; rejects "import sqlalchemyx" and "# import sqlalchemy".
  // Try it: https://regex101.com/?regex=%5E%5B%20%5Ct%5D*(%3F%3Aimport%7Cfrom)%5B%20%5Ct%5D%2Bsqlalchemy%5Cb&flags=m&flavor=javascript
  const importLine = new RegExp(`^[ \\t]*(?:import|from)[ \\t]+${module}\\b`, 'm');
  return importLine.test(code);
};

/** The bundled packages that the job's files import. */
export function packagesFor(files: Readonly<Record<string, string>>): PythonPackage[] {
  const sources = Object.values(files);
  return PYTHON_PACKAGES.filter((pkg) => sources.some((code) => importsModule(code, pkg.module)));
}
