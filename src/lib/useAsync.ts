import { useEffect, useState, type DependencyList } from 'react';

export interface AsyncState<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ loading: true });
  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    fn().then(
      (data) => alive && setState({ data, loading: false }),
      (e: unknown) => alive && setState({ error: e instanceof Error ? e.message : String(e), loading: false }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
