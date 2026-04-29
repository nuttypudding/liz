import { useState, useCallback } from 'react';

export interface ScreeningStatus {
  application_status: string;
  application_risk_score?: number;
  screening_status?: string;
  screening_risk_score?: number;
  screening_recommendation?: string;
  updated_at: string;
}

export function useScreeningOrchestrator() {
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ScreeningStatus | null>(null);

  const initiateScreening = useCallback(async (applicationId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applications/${applicationId}/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to initiate screening');
      }

      const data = await res.json();
      setStatus({ application_status: data.status, updated_at: new Date().toISOString() });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const pollScreeningStatus = useCallback(async (applicationId: string): Promise<ScreeningStatus | null> => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/screen/status`);
      if (!res.ok) throw new Error('Failed to fetch screening status');
      const data: { success: boolean } & ScreeningStatus = await res.json();
      setStatus(data);
      return data;
    } catch (err) {
      console.error('Polling error:', err);
      return null;
    }
  }, []);

  const startPolling = useCallback(
    (applicationId: string, intervalMs = 5000): ReturnType<typeof setInterval> => {
      setPolling(true);
      const pollInterval = setInterval(async () => {
        const result = await pollScreeningStatus(applicationId);
        if (result && result.screening_status === 'completed') {
          clearInterval(pollInterval);
          setPolling(false);
        }
      }, intervalMs);
      return pollInterval;
    },
    [pollScreeningStatus]
  );

  return { initiateScreening, pollScreeningStatus, startPolling, loading, polling, error, status };
}
