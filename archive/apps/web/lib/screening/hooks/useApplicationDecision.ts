import { useState } from 'react';
import { Application, ApplicationDecisionPayload } from '../types';

export function useApplicationDecision() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (
    applicationId: string,
    payload: ApplicationDecisionPayload
  ): Promise<Application | null> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applications/${applicationId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to make decision');
      }

      const result = await res.json();
      return result.application;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { decide, loading, error };
}
