import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BedDouble, Thermometer, Stethoscope,
  ClipboardList, AlertTriangle, CheckCircle, Clock, TrendingUp
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { KpiCard, Card } from '../components/ui/Card';
import { Badge, statusBadge } from '../components/ui/Badge';
import { useApp } from '../context/AppContext';
import { FEVER_THRESHOLD, MAX_BEDS } from '../data/seedData';

export default function Dashboard() {
  const { patients, beds, temperatures, doctorVisits, dischargeRecs, currentUser, getFeverFreeConsecutiveDays } = useApp();
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  const activePatients = patients.filter(p => p.status === 'active' || p.status === 'discharge_eligible');
  const occupiedBeds = beds.filter(b => b.isOccupied).length;
  const availableBeds = MAX_BEDS - occupiedBeds;

  // Today's task tracking
  const tempCheckedToday = new Set(
    temperatures.filter(t => t.recordedAt.startsWith(today)).map(t => t.patientId)
  );
  const visitedToday = new Set(
    doctorVisits.filter(v => v.visitDate === today && v.status === 'completed').map(v => v.patientId)
  );

  const tempPending = activePatients.filter(p => !tempCheckedToday.has(p.id));
  const visitPending = activePatients.filter(p => !visitedToday.has(p.id));
  const dischargeEligible = patients.filter(p => p.status === 'discharge_eligible');
  const pendingDischargeRecs = dischargeRecs.filter(d => d.status === 'pending_admin');

  // Attention queue — patients needing action
  const attentionQueue = activePatients
    .map(p => {
      const tempToday = temperatures.filter(t => t.patientId === p.id && t.recordedAt.startsWith(today))
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
      const visitToday = doctorVisits.find(v => v.patientId === p.id && v.visitDate === today);
      const bed = beds.find(b => b.patientId === p.id);
      const hasFever = tempToday && tempToday.temperature >= FEVER_THRESHOLD;
      const feverFreeDays = getFeverFreeConsecutiveDays(p.id);
      return { p, tempToday, visitToday, bed, hasFever, feverFreeDays };
    })
    .filter(({ tempToday, visitToday, hasFever }) => !tempToday || !visitToday || hasFever)
    .slice(0, 8);

  // Recent activity
  const recentTemps = [...temperatures]
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .slice(0, 5);

  return (
    <Layout
      title="Dashboard"
      subtitle={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${currentUser?.name?.split(' ')[0]}. Here's today's overview.`}
    >
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KpiCard
          title="Active Patients"
          value={activePatients.length}
          subtitle={`of ${MAX_BEDS} beds`}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <KpiCard
          title="Occupied Beds"
          value={occupiedBeds}
          subtitle={`${availableBeds} available`}
          icon={<BedDouble className="w-6 h-6 text-teal-600" />}
          iconBg="bg-teal-50"
        />
        <KpiCard
          title="Temp Checks Due"
          value={tempPending.length}
          subtitle="today"
          icon={<Thermometer className="w-6 h-6 text-amber-600" />}
          iconBg="bg-amber-50"
          alert={tempPending.length > 0}
        />
        <KpiCard
          title="Doctor Visits Due"
          value={visitPending.length}
          subtitle="today"
          icon={<Stethoscope className="w-6 h-6 text-indigo-600" />}
          iconBg="bg-indigo-50"
          alert={visitPending.length > 5}
        />
        <KpiCard
          title="Discharge Eligible"
          value={dischargeEligible.length}
          subtitle="awaiting review"
          icon={<ClipboardList className="w-6 h-6 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <KpiCard
          title="Pending Discharges"
          value={pendingDischargeRecs.length}
          subtitle="admin action needed"
          icon={<CheckCircle className="w-6 h-6 text-purple-600" />}
          iconBg="bg-purple-50"
          alert={pendingDischargeRecs.length > 0}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Attention Queue */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="font-semibold text-gray-800">Patient Attention Queue</h2>
              </div>
              <Badge variant="warning">{attentionQueue.length} need action</Badge>
            </div>
            {attentionQueue.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">All patients attended to!</p>
                <p className="text-gray-400 text-sm">No pending actions right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {attentionQueue.map(({ p, tempToday, visitToday, bed, hasFever, feverFreeDays }) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="px-5 py-3.5 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                        <span className="text-xs text-gray-400">{p.patientId}</span>
                        {bed && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{bed.bedNumber}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {!tempToday && (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <Thermometer className="w-3 h-3" /> Temp missing
                          </span>
                        )}
                        {hasFever && (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                            <AlertTriangle className="w-3 h-3" /> Fever {tempToday?.temperature}°C
                          </span>
                        )}
                        {!visitToday && (
                          <span className="flex items-center gap-1 text-xs text-indigo-600">
                            <Stethoscope className="w-3 h-3" /> Visit pending
                          </span>
                        )}
                        {feverFreeDays >= 3 && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle className="w-3 h-3" /> {feverFreeDays}d fever-free
                          </span>
                        )}
                      </div>
                    </div>
                    <div>{statusBadge(p.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Today's task completion */}
          <Card className="p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" /> Today's Progress
            </h2>
            <div className="space-y-3">
              {[
                {
                  label: 'Temperature Checks',
                  done: tempCheckedToday.size,
                  total: activePatients.length,
                  color: 'bg-teal-500',
                },
                {
                  label: 'Doctor Visits',
                  done: visitedToday.size,
                  total: activePatients.length,
                  color: 'bg-indigo-500',
                },
              ].map(({ label, done, total, color }) => {
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{label}</span>
                      <span className="font-semibold">{done}/{total}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Occupancy bar */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Bed Occupancy</span>
                <span className="font-semibold">{occupiedBeds}/{MAX_BEDS}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${occupiedBeds / MAX_BEDS > 0.9 ? 'bg-red-500' : occupiedBeds / MAX_BEDS > 0.75 ? 'bg-amber-500' : 'bg-teal-500'}`}
                  style={{ width: `${(occupiedBeds / MAX_BEDS) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{MAX_BEDS - occupiedBeds} beds available</p>
            </div>
          </Card>

          {/* Recent temp readings */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-800 text-sm">Recent Readings</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {recentTemps.map(t => {
                const pat = patients.find(p => p.id === t.patientId);
                const isFever = t.temperature >= FEVER_THRESHOLD;
                return (
                  <div key={t.id} className="px-5 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{pat?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{new Date(t.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className={`text-sm font-bold ${isFever ? 'text-red-600' : 'text-emerald-600'}`}>
                      {t.temperature}°C
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
