import { useCallback, useEffect, useState } from 'react';
import { fetchSignals } from '../api/ghi';
import type { Signal } from '../types';

type UseLiveSignalsOptions = {
  status?: string;
  disease?: string;
  location?: string;
  pollIntervalMs?: number;
};

export const useLiveSignals = ({ status, disease, location, pollIntervalMs = 30000 }: UseLiveSignalsOptions) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadSignals = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchSignals(status, disease, location);
      setSignals(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to load signals');
    } finally {
      setLoading(false);
    }
  }, [status, disease, location]);

  useEffect(() => {
    loadSignals();
    const interval = setInterval(loadSignals, pollIntervalMs);
    return () => clearInterval(interval);
  }, [loadSignals, pollIntervalMs]);

  return { signals, loading, error, lastUpdated, refresh: loadSignals };
};
