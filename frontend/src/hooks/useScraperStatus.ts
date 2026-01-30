import { useCallback, useEffect, useState } from 'react';
import { fetchScraperStatus, triggerManualSync } from '../api/ghi';
import type { ScraperStatus } from '../types';

export const useScraperStatus = (pollIntervalMs: number = 10000) => {
  const [status, setStatus] = useState<ScraperStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchScraperStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load scraper status');
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await triggerManualSync();
      // Immediately poll status to show active state
      await loadStatus();
    } catch (err: any) {
      setSyncError(err?.message || 'Failed to trigger sync');
    } finally {
      setSyncing(false);
    }
  }, [loadStatus]);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, pollIntervalMs);
    return () => clearInterval(interval);
  }, [loadStatus, pollIntervalMs]);

  return {
    status,
    loading,
    error,
    syncing,
    syncError,
    triggerSync,
    refresh: loadStatus,
  };
};
