import React, { useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Heart, Calendar } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useApp } from '../context/AppContext';

const EXPECTED_MORTALITY = 15;
const EXPECTED_SUCCESS = 85;

export default function Reports() {
  const { patients, outcomes, beds } = useApp();

  // Finalized outcomes = deceased + discharged (survived)
  const deceasedOutcomes = outcomes.filter(o => o.outcome === 'deceased');
  const survivedOutcomes = outcomes.filter(o => o.outcome === 'survived');
  const finalized = deceasedOutcomes.length + survivedOutcomes.length;

  const deaths = deceasedOutcomes.length;
  const survivors = survivedOutcomes.length;
  const mortalityRate = finalized > 0 ? (deaths / finalized) * 100 : 0;
  const successRate = finalized > 0 ? (survivors / finalized) * 100 : 0;
  const avgLOS = outcomes.length > 0
    ? (outcomes.reduce((sum, o) => sum + o.lengthOfStayDays, 0) / outcomes.length).toFixed(1)
    : '—';

  const exceedsThreshold = finalized > 0 && mortalityRate > EXPECTED_MORTALITY;
  const sampleSizeWarning = finalized > 0 && finalized < 30;

  // Pie data
  const pieData = [
    { name: 'Survived', value: survivors, color: '#10b981' },
    { name: 'Deceased', value: deaths, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Admission trend (last 14 days) — derived from patient admission dates
  const trendData = useMemo(() => {
    const days: { date: string; label: string; admissions: number; discharges: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const admissions = patients.filter(p => p.admissionDate.startsWith(dStr)).length;
      const discharges = outcomes.filter(o => o.outcome === 'survived' && o.recordedAt.startsWith(dStr)).length;
      days.push({ date: dStr, label, admissions, discharges });
    }
    return days;
  }, [patients, outcomes]);

  // Bed occupancy trend (simulated from current + historical discharges)
  const occupancyTrend = useMemo(() => {
    const days: { label: string; occupied: number }[] = [];
    let base = beds.filter(b => b.isOccupied).length;
    // rough historical estimate
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const dischargesOnDay = outcomes.filter(o => o.recordedAt.startsWith(d.toISOString().split('T')[0])).length;
      base = i === 0 ? beds.filter(b => b.isOccupied).length : Math.min(MAX, base + Math.floor(dischargesOnDay));
      days.push({ label, occupied: base });
    }
    return days;
  }, [beds, outcomes]);

  return (
    <Layout
      title="Reports & Analytics"
      subtitle="Treatment outcomes and operational metrics"
    >
      {/* Threshold context banner */}
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
        <Activity className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Reporting cohort</p>
          <p className="text-blue-700 text-xs mt-0.5">
            Outcomes are counted only for finalized cases (discharged-survived or deceased). Active patients are excluded from the denominator. Benchmarks: mortality {EXPECTED_MORTALITY}%, success {EXPECTED_SUCCESS}%.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Finalized Outcomes</p>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{finalized}</p>
          <p className="text-xs text-gray-400 mt-1">{deaths} deaths · {survivors} survived</p>
        </Card>

        <Card className={`p-5 ${exceedsThreshold ? 'bg-red-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Mortality Rate</p>
            <TrendingDown className={`w-4 h-4 ${exceedsThreshold ? 'text-red-500' : 'text-gray-400'}`} />
          </div>
          <p className={`text-3xl font-bold ${exceedsThreshold ? 'text-red-600' : 'text-gray-900'}`}>
            {finalized > 0 ? `${mortalityRate.toFixed(1)}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">benchmark {EXPECTED_MORTALITY}% · {deaths}/{finalized}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Success Rate</p>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">
            {finalized > 0 ? `${successRate.toFixed(1)}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">benchmark {EXPECTED_SUCCESS}% · {survivors}/{finalized}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Avg Length of Stay</p>
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{avgLOS}</p>
          <p className="text-xs text-gray-400 mt-1">days (finalized cases)</p>
        </Card>
      </div>

      {/* Mortality warning */}
      {exceedsThreshold && (
        <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-semibold">Mortality rate exceeds expected benchmark</p>
            <p className="text-red-600 text-sm mt-0.5">
              Observed mortality ({mortalityRate.toFixed(1)}%) is above the {EXPECTED_MORTALITY}% benchmark. This requires clinical review of treatment protocols.
            </p>
          </div>
        </div>
      )}

      {sampleSizeWarning && finalized > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Small sample size ({finalized} finalized cases). These rates should not be interpreted as proof of treatment quality change. Continue collecting outcomes for statistically meaningful analysis.
          </p>
        </div>
      )}

      {finalized === 0 && (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-gray-500 text-sm">No finalized outcome data available yet. Metrics will populate as patients are discharged or outcomes recorded.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Outcome distribution */}
        <Card className="p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Outcome Distribution</h2>
          {pieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No finalized outcomes to display.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.name}: ${e.value}`}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Admission / discharge trend */}
        <Card className="p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Admissions & Discharges (14 days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={1} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="admissions" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="discharges" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Bed occupancy trend */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-800 mb-4">Bed Occupancy Trend (14 days)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={1} />
                <YAxis domain={[0, 74]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="occupied" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

const MAX = 74;
