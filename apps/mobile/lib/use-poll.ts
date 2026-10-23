import { useIsFocused } from 'expo-router';
import * as React from 'react';

/**
 * Loads `key`'s data now and every `intervalMs` while the screen is focused, until
 * `stopWhen` returns true for the latest data. Pass a null key to pause.
 * `setData` lets a mutation show its result without waiting for the next tick.
 */
export function usePoll<T>(
  key: string | null,
  load: () => Promise<T>,
  { intervalMs = 4000, stopWhen }: { intervalMs?: number; stopWhen?: (data: T) => boolean } = {}
) {
  const focused = useIsFocused();
  const [result, setResult] = React.useState<{ key: string; data?: T; error?: string } | null>(
    null
  );
  const [nonce, setNonce] = React.useState(0);
  const loadLatest = React.useEffectEvent(load);

  const current = result?.key === key ? result : null;
  const stopped = current?.data !== undefined && !!stopWhen?.(current.data);

  React.useEffect(() => {
    if (!key || !focused || stopped) return;
    let cancelled = false;
    const tick = () =>
      loadLatest().then(
        (data) => !cancelled && setResult({ key, data }),
        (error: Error) =>
          !cancelled &&
          setResult((prev) => ({
            key,
            data: prev?.key === key ? prev.data : undefined,
            error: error.message,
          }))
      );
    tick();
    const timer = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [key, focused, stopped, intervalMs, nonce]);

  return {
    data: current?.data,
    error: current?.error,
    loading: !!key && !current,
    refresh: () => setNonce((n) => n + 1),
    setData: (data: T) => key && setResult({ key, data }),
  };
}
