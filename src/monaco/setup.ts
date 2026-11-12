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

// Mirror the "QA Notebook" palette in src/index.css: blueprint navy (dark) and warm paper (light).
monaco.editor.defineTheme('qa-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#0b1628',
    'editorGutter.background': '#0b1628',
    'editor.lineHighlightBackground': '#13243f',
    'editorLineNumber.foreground': '#5b6f96',
    'editorLineNumber.activeForeground': '#b1c0dd',
    'editor.selectionBackground': '#2b4672',
  },
});
monaco.editor.defineTheme('qa-light', {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#fffdf7',
    'editorGutter.background': '#fffdf7',
    'editor.lineHighlightBackground': '#f5f0e3',
    'editorLineNumber.foreground': '#a79f8c',
    'editorLineNumber.activeForeground': '#48546d',
    'editor.selectionBackground': '#ffe9a3',
  },
});

loader.config({ monaco });

export { monaco };
