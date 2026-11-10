import type * as TS from 'typescript';
import { DEFAULT_LIB } from './lib-files';

export interface CompileDiagnostic {
  file: string;
  line: number;
  column: number;
  code: number;
  message: string;
  category: 'error' | 'warning';
}

export interface CompileResult {
  diagnostics: CompileDiagnostic[];
  /** Emitted JavaScript, keyed by output path (e.g. "/solution.js"). */
  outputs: Record<string, string>;
}

const LIB_DIR = '/lib/';

/**
 * Creates a compile function backed by the real TypeScript compiler and an in-memory file system.
 * Pure: works in a Web Worker (browser) and in Node (validate-content script).
 */
export function createCompiler(ts: typeof TS, libFiles: Record<string, string>) {
  const libCache = new Map<string, TS.SourceFile>();

  const options: TS.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    lib: [DEFAULT_LIB],
    strict: true,
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: true,
    esModuleInterop: true,
    skipLibCheck: true,
    types: [],
    noEmitOnError: false,
    newLine: ts.NewLineKind.LineFeed,
  };

  return function compile(files: Record<string, string>): CompileResult {
    const outputs: Record<string, string> = {};
    const libName = (fileName: string) => (fileName.startsWith(LIB_DIR) ? fileName.slice(LIB_DIR.length) : null);

    const host: TS.CompilerHost = {
      getSourceFile(fileName, languageVersion) {
        const lib = libName(fileName);
        if (lib !== null) {
          let sf = libCache.get(lib);
          if (!sf) {
            const text = libFiles[lib];
            if (text === undefined) return undefined;
            sf = ts.createSourceFile(fileName, text, languageVersion);
            libCache.set(lib, sf);
          }
          return sf;
        }
        const text = files[fileName];
        return text === undefined ? undefined : ts.createSourceFile(fileName, text, languageVersion);
      },
      getDefaultLibFileName: () => LIB_DIR + DEFAULT_LIB,
      writeFile: (fileName, text) => {
        outputs[fileName] = text;
      },
      getCurrentDirectory: () => '/',
      getCanonicalFileName: (f) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (f) => {
        const lib = libName(f);
        return lib !== null ? lib in libFiles : f in files;
      },
      readFile: (f) => {
        const lib = libName(f);
        return lib !== null ? libFiles[lib] : files[f];
      },
      directoryExists: (d) => d === '/' || d === '/lib' || d === LIB_DIR,
      getDirectories: () => [],
    };

    const program = ts.createProgram({ rootNames: Object.keys(files), options, host });
    const diagnostics = ts.getPreEmitDiagnostics(program).map((d) => toDiagnostic(ts, d));
    program.emit();
    return { diagnostics, outputs };
  };
}

function toDiagnostic(ts: typeof TS, d: TS.Diagnostic): CompileDiagnostic {
  let line = 0;
  let column = 0;
  let file = '';
  if (d.file && d.start !== undefined) {
    const pos = d.file.getLineAndCharacterOfPosition(d.start);
    line = pos.line + 1;
    column = pos.character + 1;
    file = d.file.fileName;
  }
  return {
    file,
    line,
    column,
    code: d.code,
    message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
    category: d.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
  };
}
