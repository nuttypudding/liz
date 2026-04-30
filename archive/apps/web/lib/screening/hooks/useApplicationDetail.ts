import { useState, useCallback, useEffect } from 'react';
import { ApplicationDetailResponse } from '../types';

export function useApplicationDetail(applicationId: string | null) {
  const [data, setData] = useState<ApplicationDetailResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!applicationId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to fetch application');
      }

      const result: ApplicationDetailResponse = await res.json();
      setData(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (applicationId) {
      fetchDetail();
    }
  }, [applicationId, fetchDetail]);

  return { data, loading, error, refetch: fetchDetail };
}
