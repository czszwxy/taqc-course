import { useRef, type ReactElement } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { monaco } from '../monaco/setup';
import { useSettings } from '../features/progress/store';
import type { CodeEditorProps } from './CodeEditor';

/**
 * The full editor (Monaco, the editor of VS Code). Loaded lazily by CodeEditor only when it is shown,
 * so a phone that uses the simple editor never downloads Monaco (~3 MB).
 */

const FONT_FAMILY = '"JetBrains Mono Variable", "JetBrains Mono", "Cascadia Code", Consolas, monospace';
const MONACO_FONT_SIZE = 14;
const MONACO_PADDING_TOP = 12;

export default function MonacoCodeEditor({ path, language, initialValue, tabSize, onChange, onSubmit, onReady }: CodeEditorProps): ReactElement {
  const theme = useSettings((s) => s.theme);
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;

  const onMount: OnMount = (editor) => {
    if (editor.getValue() !== initialValue) editor.setValue(initialValue);
    onReady({ setValue: (value) => editor.setValue(value) });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => submitRef.current());
  };

  return (
    <Editor
      path={path}
      defaultLanguage={language}
      defaultValue={initialValue}
      theme={theme === 'dark' ? 'qa-dark' : 'qa-light'}
      onChange={(value) => onChange(value ?? '')}
      onMount={onMount}
      loading={<div className="p-4 text-sm text-muted">Loading editor…</div>}
      options={{
        minimap: { enabled: false },
        fontSize: MONACO_FONT_SIZE,
        fontFamily: FONT_FAMILY,
        scrollBeyondLastLine: false,
        tabSize,
        insertSpaces: true,
        automaticLayout: true,
        padding: { top: MONACO_PADDING_TOP },
        renderLineHighlight: 'line',
      }}
    />
  );
}
