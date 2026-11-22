import { Link } from 'react-router-dom';
import { Icon } from '../components/icons';

const ICON_SIZE = 48;

export function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <Icon name="search" size={ICON_SIZE} className="mx-auto text-pen" />
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
