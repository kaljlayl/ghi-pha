import { useState, useEffect } from 'react';
import { fetchMapData } from '../api/ghi';
import type { MapDataResponse } from '../types';

export function useMapData(pollIntervalMs: number = 30000) {
  const [mapData, setMapData] = useState<MapDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const data = await fetchMapData();
        setMapData(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch map data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
    const interval = setInterval(loadMapData, pollIntervalMs);

    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  return { mapData, loading, error };
}
