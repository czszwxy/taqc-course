import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <div className="text-5xl">🔎</div>
      <h1 className="mt-4 font-display text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">
        Expected result: the page exists. Actual result: it doesn&apos;t. Severity: minor 🙂
      </p>
      <Link to="/" className="btn btn-primary mt-6">
        Back to all courses
      </Link>
    </div>
  );
}
