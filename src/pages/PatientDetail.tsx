import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Thermometer, Stethoscope, BedDouble, Calendar, Activity, TrendingUp } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Badge, statusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/FormField';
import { useApp } from '../context/AppContext';
import { FEVER_THRESHOLD, FEVER_FREE_DAYS_REQUIRED } from '../data/seedData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients, beds, temperatures, doctorVisits, currentUser, getFeverFreeConsecutiveDays, isDischargeEligible } = useApp();

  const patient = patients.find(p => p.id === id);
  if (!patient) {
    return (
      <Layout title="Patient Not Found">
        <Card className="p-10 text-center">
          <p className="text-gray-500">This patient could not be found.</p>
          <Button className="mt-4" onClick={() => navigate('/patients')}><ArrowLeft className="w-4 h-4" /> Back to Patients</Button>
        </Card>
      </Layout>
    );
  }

  const bed = beds.find(b => b.id === patient.bedId);
  const patientTemps = [...temperatures.filter(t => t.patientId === patient.id)]
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const patientVisits = [...doctorVisits.filter(v => v.patientId === patient.id)]
    .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  const latestTemp = patientTemps[patientTemps.length - 1];
  const feverFreeDays = getFeverFreeConsecutiveDays(patient.id);
  const eligible = isDischargeEligible(patient.id);
  const daysAdmitted = Math.ceil((Date.now() - new Date(patient.admissionDate).getTime()) / 86400000);

  const chartData = patientTemps.map(t => ({
    date: new Date(t.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    temp: t.temperature,
    isFever: t.temperature >= FEVER_THRESHOLD,
  }));

  return (
    <Layout
      title={patient.name}
      subtitle={`${patient.patientId} · ${patient.age}y · ${patient.gender}`}
      actions={<Button variant="outline" onClick={() => navigate('/patients')}><ArrowLeft className="w-4 h-4" /> Back</Button>}
    >
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><BedDouble className="w-4 h-4" /> Bed</div>
          <p className="text-lg font-bold text-gray-900">{bed ? bed.bedNumber : '—'}</p>
          <p className="text-xs text-gray-400">{bed?.ward}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Calendar className="w-4 h-4" /> Admitted</div>
          <p className="text-lg font-bold text-gray-900">{new Date(patient.admissionDate).toLocaleDateString()}</p>
          <p className="text-xs text-gray-400">Day {daysAdmitted} of stay</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Activity className="w-4 h-4" /> Status</div>
          <div className="mt-1">{statusBadge(patient.status)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><TrendingUp className="w-4 h-4" /> Fever-Free</div>
          <p className="text-lg font-bold text-gray-900">{feverFreeDays} <span className="text-sm font-normal text-gray-400">days</span></p>
          <p className="text-xs text-gray-400">{FEVER_FREE_DAYS_REQUIRED} required for discharge</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Temperature chart */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-teal-600" /> Temperature History
            </h2>
            {chartData.length === 0 ? (
              <p className="text-gray-400 text-sm py-10 text-center">No temperature readings yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis domain={[35, 42]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                      formatter={(v: number) => [`${v}°C`, 'Temperature']}
                    />
                    <ReferenceLine y={FEVER_THRESHOLD} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Fever', position: 'right', fontSize: 10, fill: '#ef4444' }} />
                    <Line type="monotone" dataKey="temp" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Readings table */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">All Readings</h3>
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                {[...patientTemps].reverse().map(t => (
                  <div key={t.id} className="py-2 flex items-center justify-between text-sm">
                    <div>
                      <span className={`font-bold ${t.temperature >= FEVER_THRESHOLD ? 'text-red-600' : 'text-emerald-600'}`}>{t.temperature}°C</span>
                      {t.isCorrected && <Badge variant="warning" className="ml-2">corrected</Badge>}
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">{new Date(t.recordedAt).toLocaleString()}</p>
                      <p className="text-gray-400 text-xs">by {t.recordedByName}</p>
                    </div>
                  </div>
                ))}
                {patientTemps.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">No readings recorded.</p>}
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Discharge eligibility */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Discharge Eligibility</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fever-free days</span>
                <span className="font-bold text-gray-900">{feverFreeDays} / {FEVER_FREE_DAYS_REQUIRED}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${eligible ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((feverFreeDays / FEVER_FREE_DAYS_REQUIRED) * 100, 100)}%` }} />
              </div>
              {eligible ? (
                <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-emerald-700 text-sm font-medium">✓ Eligible for discharge review</p>
                  <p className="text-emerald-600 text-xs mt-0.5">Doctor must recommend before admin completes discharge.</p>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-700 text-sm font-medium">⏳ Not yet eligible</p>
                  <p className="text-amber-600 text-xs mt-0.5">{FEVER_FREE_DAYS_REQUIRED - feverFreeDays} more fever-free day(s) required.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Visit history */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-indigo-600" /> Consultation History
            </h3>
            <div className="space-y-3">
              {patientVisits.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">No consultations yet.</p>}
              {patientVisits.slice(0, 5).map(v => (
                <div key={v.id} className="border-l-2 border-indigo-100 pl-3 py-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{v.doctorName}</p>
                    <Badge variant={v.status === 'completed' ? 'success' : 'warning'}>{v.status}</Badge>
                  </div>
                  {v.consultationNotes && <p className="text-xs text-gray-600 mt-0.5">{v.consultationNotes}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{v.visitedAt ? new Date(v.visitedAt).toLocaleString() : v.visitDate}</p>
                </div>
              ))}
            </div>
          </Card>

          {patient.notes && (
            <Card className="p-5">
              <h3 className="font-semibold text-gray-800 mb-2">Clinical Notes</h3>
              <p className="text-sm text-gray-600">{patient.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
