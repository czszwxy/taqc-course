import { executeModules, type ExecRequest } from './harness';

self.onmessage = async (e: MessageEvent<ExecRequest>) => {
  const out = await executeModules(e.data);
  self.postMessage(out);
};
