import type { LabStatus } from '../../../server/lab-types';
import { CodeBlock } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { IS_STATIC_SITE } from '../../site';

interface LabSetupCalloutProps {
  status: LabStatus;
  /** "Playwright lab" / "Python lab" — shown in the title. */
  labName: string;
  command: string;
  onRecheck: () => void;
}

/** Shown when a task needs the local lab (Playwright, the Python venv) and it is not ready, or on the website. */
export function LabSetupCallout({ status, labName, command, onRecheck }: LabSetupCalloutProps) {
  if (IS_STATIC_SITE) {
    return (
      <Callout tone="warn" title="💻 This task runs on your computer">
        <p className="text-sm">{status.message}</p>
        <p className="mt-2 text-sm">To take the draft with you: Settings → Export progress here, then Import it in the course on your computer.</p>
      </Callout>
    );
  }
  return (
    <Callout tone="warn" title={`One-time setup of the ${labName}`}>
      <p className="text-sm">{status.message}</p>
      <p className="mt-2 text-sm">
        Open a terminal <b>outside</b> this app (Windows Terminal, cmd or the VS Code terminal) in the project folder and run:
      </p>
      <CodeBlock code={command} />
      <button className="btn btn-secondary btn-sm mt-2" onClick={onRecheck}>
        ↻ Check again
      </button>
    </Callout>
  );
}
