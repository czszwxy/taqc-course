import ts from 'typescript';
import libs from 'virtual:ts-libs';
import { createCompiler } from './compiler';

const compile = createCompiler(ts, libs);

self.onmessage = (e: MessageEvent<{ id: number; files: Record<string, string> }>) => {
  const { id, files } = e.data;
  try {
    const result = compile(files);
    self.postMessage({ id, ...result });
  } catch (err) {
    self.postMessage({ id, fatal: err instanceof Error ? err.message : String(err) });
  }
};
