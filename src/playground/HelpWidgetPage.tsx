import { useState, type FormEvent } from 'react';
import { isFixedMode, withLabMode } from './PlaygroundShell';

/**
 * The "Help chat" widget that AccountPage embeds in an <iframe> (practice for frameLocator / contentFrame).
 * Bug flag `helpEmpty` belongs to the "account" playground page (registry bugIds).
 */

const MSG = {
  required: 'Please type your question',
  sent: "Thanks! We'll reply within 24 hours.",
};

export function HelpWidgetPage() {
  const bug = withLabMode({ helpEmpty: !isFixedMode() }); // an empty question is sent
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!question.trim() && !bug.helpEmpty) {
      setError(MSG.required);
      return;
    }
    setError(null);
    setSent(true);
  };

  return (
    <div className="min-h-full bg-white p-4 text-slate-900" style={{ colorScheme: 'light' }}>
      <div className="text-sm font-semibold text-orange-600">💬 Gadgetly help</div>
      {sent ? (
        <p role="status" data-testid="help-sent" className="mt-3 text-sm">
          {MSG.sent}
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-2 space-y-2">
          <label htmlFor="help-question" className="block text-sm font-medium text-slate-700">
            Your question
          </label>
          <textarea
            id="help-question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button type="submit" className="rounded-md bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-600">
            Send
          </button>
        </form>
      )}
    </div>
  );
}
