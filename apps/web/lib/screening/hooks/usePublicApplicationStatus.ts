import { useState, useCallback } from 'react';
import { PublicApplicationStatusResponse } from '../types';

export function usePublicApplicationStatus() {
  const [status, setStatus] = useState<PublicApplicationStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (trackingId: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applications/status/${trackingId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Application not found');
      }

      const data: PublicApplicationStatusResponse = await res.json();
      setStatus(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, error, fetchStatus };
}
