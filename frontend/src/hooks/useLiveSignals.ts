import { useCallback, useEffect, useState } from 'react';
import { fetchSignals } from '../api/ghi';
import type { Signal } from '../types';

type UseLiveSignalsOptions = {
  status?: string;
  pollIntervalMs?: number;
};

export const useLiveSignals = ({ status, pollIntervalMs = 30000 }: UseLiveSignalsOptions) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadSignals = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchSignals(status);
      setSignals(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to load signals');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadSignals();
    const interval = setInterval(loadSignals, pollIntervalMs);
    return () => clearInterval(interval);
  }, [loadSignals, pollIntervalMs]);

  return { signals, loading, error, lastUpdated, refresh: loadSignals };
};
