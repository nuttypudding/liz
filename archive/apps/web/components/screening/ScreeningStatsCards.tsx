'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ScreeningStats {
  total_applications: number;
  pending_review: number;
  approved: number;
  denied: number;
  approval_rate: number;
}

export function ScreeningStatsCards() {
  const [stats, setStats] = useState<ScreeningStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [totalRes, approvedRes, deniedRes, submittedRes, screeningRes] = await Promise.all([
        fetch('/api/applications?limit=1'),
        fetch('/api/applications?status=approved&limit=1'),
        fetch('/api/applications?status=denied&limit=1'),
        fetch('/api/applications?status=submitted&limit=1'),
        fetch('/api/applications?status=screening&limit=1'),
      ]);

      const [totalData, approvedData, deniedData, submittedData, screeningData] = await Promise.all([
        totalRes.ok ? totalRes.json() : { pagination: { total: 0 } },
        approvedRes.ok ? approvedRes.json() : { pagination: { total: 0 } },
        deniedRes.ok ? deniedRes.json() : { pagination: { total: 0 } },
        submittedRes.ok ? submittedRes.json() : { pagination: { total: 0 } },
        screeningRes.ok ? screeningRes.json() : { pagination: { total: 0 } },
      ]);

      const total = totalData.pagination?.total ?? 0;
      const approved = approvedData.pagination?.total ?? 0;
      const denied = deniedData.pagination?.total ?? 0;
      const pending =
        (submittedData.pagination?.total ?? 0) + (screeningData.pagination?.total ?? 0);
      const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

      setStats({ total_applications: total, pending_review: pending, approved, denied, approval_rate: approvalRate });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-100 rounded-lg h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Total Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-slate-900">{stats.total_applications}</div>
          <p className="text-xs text-slate-500 mt-1">All time applications</p>
        </CardContent>
      </Card>

      <Card className="border-yellow-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-yellow-700">Pending Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600">{stats.pending_review}</div>
          <p className="text-xs text-yellow-600 mt-1">Awaiting screening</p>
        </CardContent>
      </Card>

      <Card className="border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-700">Approved</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          <p className="text-xs text-green-600 mt-1">Successful applications</p>
        </CardContent>
      </Card>

      <Card className="border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">Approval Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">{stats.approval_rate}%</div>
          <p className="text-xs text-blue-600 mt-1">
            {stats.total_applications > 0 ? 'Conversion rate' : 'No data yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
