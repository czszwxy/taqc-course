import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { TEST_GLOBALS_DTS } from '../runner/harness-dts';

// Use the locally bundled Monaco (no CDN) so the editor works offline.
(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
  },
};

const ts = monaco.languages.typescript;
ts.typescriptDefaults.setCompilerOptions({
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  strict: true,
  noImplicitReturns: true,
  allowNonTsExtensions: true,
  noEmit: true,
});
ts.typescriptDefaults.setEagerModelSync(true);
// describe / it / expect for tasks where the learner writes tests.
ts.typescriptDefaults.addExtraLib(TEST_GLOBALS_DTS, 'file:///qa-academy/test-globals.d.ts');

monaco.editor.defineTheme('qa-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#15181d',
    'editorGutter.background': '#15181d',
    'editor.lineHighlightBackground': '#1f232b',
    'editorLineNumber.foreground': '#5d6577',
    'editorLineNumber.activeForeground': '#adb5c3',
  },
});
monaco.editor.defineTheme('qa-light', {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#ffffff',
    'editor.lineHighlightBackground': '#f4f5f8',
    'editorLineNumber.foreground': '#9aa1b0',
    'editorLineNumber.activeForeground': '#4b5466',
  },
});

loader.config({ monaco });

export { monaco };
