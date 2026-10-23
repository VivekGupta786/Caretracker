import React, { useState, useMemo } from 'react';
import {
  ClipboardList, CheckCircle, Clock, Stethoscope, AlertTriangle,
  TrendingUp, UserCheck, ArrowRight
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Badge, statusBadge } from '../components/ui/Badge';
import { Button, EmptyState } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { FEVER_THRESHOLD, FEVER_FREE_DAYS_REQUIRED } from '../data/seedData';

type Tab = 'awaiting' | 'recommended' | 'discharged';

export default function DischargeManagement() {
  const { patients, beds, temperatures, dischargeRecs, currentUser, getFeverFreeConsecutiveDays, isDischargeEligible, completeDischarge } = useApp();
  const { success, error, warning } = useToast();
  const [tab, setTab] = useState<Tab>('awaiting');
  const [confirmModal, setConfirmModal] = useState<string | null>(null); // recId

  // Awaiting clinical review: eligible patients without a recommendation yet
  const eligiblePatients = patients.filter(p => p.status === 'discharge_eligible');
  const awaiting = eligiblePatients.filter(p =>
    !dischargeRecs.some(r => r.patientId === p.id && (r.status === 'pending_admin' || r.status === 'completed'))
  );
  const recommended = dischargeRecs.filter(r => r.status === 'pending_admin');
  const discharged = dischargeRecs.filter(r => r.status === 'completed');

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'awaiting',   label: 'Awaiting Clinical Review', count: awaiting.length },
    { id: 'recommended', label: 'Doctor Recommended',       count: recommended.length },
    { id: 'discharged',  label: 'Discharged',                count: discharged.length },
  ];

  return (
    <Layout
      title="Discharge Management"
      subtitle={`3 full fever-free days required · threshold ${FEVER_THRESHOLD}°C`}
    >
      {/* Info banner */}
      <div className="mb-4 bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-start gap-3">
        <ClipboardList className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-teal-800">
          <p className="font-medium">Discharge workflow</p>
          <p className="text-teal-700 text-xs mt-0.5">
            Eligibility is calculated from consecutive fever-free days with valid observations. A doctor must recommend discharge; an admin then completes and records it. Beds are released only after discharge completion succeeds.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white text-navy-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-teal-100 text-teal-700' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'awaiting' && <AwaitingTab patients={awaiting} />}
      {tab === 'recommended' && (
        <RecommendedTab
          recs={recommended}
          canComplete={currentUser?.role === 'admin'}
          onComplete={(recId) => setConfirmModal(recId)}
        />
      )}
      {tab === 'discharged' && <DischargedTab recs={discharged} />}

      {/* Complete discharge confirm modal */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title="Confirm Discharge"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => {
              if (!confirmModal || !currentUser) return;
              const rec = dischargeRecs.find(r => r.id === confirmModal);
              if (!rec) return;
              const patient = patients.find(p => p.id === rec.patientId);
              const result = completeDischarge(confirmModal, currentUser.id, currentUser.name);
              if (result.success) {
                success('Patient discharged', `${patient?.name} discharged. Bed released.`);
                setConfirmModal(null);
              } else {
                error('Discharge failed', result.error);
              }
            }}>
              <CheckCircle className="w-4 h-4" /> Complete Discharge
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          Confirming this discharge will release the patient's bed and record a "survived" outcome. This action is audited.
        </p>
      </Modal>
    </Layout>
  );
}

// ── Awaiting Clinical Review ───────────────────────────────────────────────
function AwaitingTab({ patients }: { patients: any[] }) {
  const { beds, temperatures, getFeverFreeConsecutiveDays } = useApp();
  if (patients.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState icon={<ClipboardList className="w-12 h-12" />} title="No patients awaiting review" description="Eligible patients will appear here for doctor review." />
      </Card>
    );
  }
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {patients.map((p: any) => {
        const bed = beds.find(b => b.id === p.bedId);
        const feverFreeDays = getFeverFreeConsecutiveDays(p.id);
        const recentTemps = [...temperatures.filter(t => t.patientId === p.id)]
          .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()).slice(0, 5);
        return (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <span className="text-xs text-gray-400">{p.patientId}</span>
                </div>
                <p className="text-xs text-gray-400">{bed?.bedNumber} · Day {Math.ceil((Date.now() - new Date(p.admissionDate).getTime()) / 86400000)}</p>
              </div>
              <Badge variant="success">{feverFreeDays}d fever-free</Badge>
            </div>
            {/* Fever-free calc */}
            <div className="bg-emerald-50 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-700 font-medium">Consecutive fever-free days</span>
                <span className="text-emerald-800 font-bold">{feverFreeDays} / {FEVER_FREE_DAYS_REQUIRED}</span>
              </div>
              <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-2">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min((feverFreeDays / FEVER_FREE_DAYS_REQUIRED) * 100, 100)}%` }} />
              </div>
            </div>
            {/* Observation history */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Supporting observations (most recent)</p>
              <div className="flex gap-1.5 flex-wrap">
                {recentTemps.map(t => (
                  <span key={t.id} className={`text-xs px-2 py-1 rounded font-medium ${t.temperature >= FEVER_THRESHOLD ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {t.temperature}°C
                    <span className="text-gray-400 ml-1">{new Date(t.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2 text-xs text-indigo-600">
              <Stethoscope className="w-3.5 h-3.5" />
              A doctor must recommend this patient from the Doctor Visits page.
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── Doctor Recommended ─────────────────────────────────────────────────────
function RecommendedTab({ recs, canComplete, onComplete }: { recs: any[]; canComplete: boolean; onComplete: (recId: string) => void }) {
  const { patients, beds, getFeverFreeConsecutiveDays } = useApp();
  if (recs.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState icon={<UserCheck className="w-12 h-12" />} title="No pending recommendations" description="Doctor-recommended discharges will appear here for admin completion." />
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {recs.map((rec: any) => {
        const patient = patients.find(p => p.id === rec.patientId);
        const bed = patient ? beds.find(b => b.id === patient.bedId) : null;
        const feverFreeDays = patient ? getFeverFreeConsecutiveDays(patient.id) : 0;
        if (!patient) return null;
        return (
          <Card key={rec.id} className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{patient.name}</p>
                <span className="text-xs text-gray-400">{patient.patientId}</span>
                {bed && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{bed.bedNumber}</span>}
                <Badge variant="success">{feverFreeDays}d fever-free</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Recommended by {rec.recommendedByName} · {new Date(rec.recommendedAt).toLocaleString()}
              </p>
              {rec.notes && <p className="text-xs text-gray-600 mt-1 italic">"{rec.notes}"</p>}
            </div>
            {canComplete ? (
              <Button onClick={() => onComplete(rec.id)}>
                <ArrowRight className="w-4 h-4" /> Complete Discharge
              </Button>
            ) : (
              <Badge variant="info">Admin action required</Badge>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ── Discharged ──────────────────────────────────────────────────────────────
function DischargedTab({ recs }: { recs: any[] }) {
  const { patients, outcomes } = useApp();
  if (recs.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState icon={<CheckCircle className="w-12 h-12" />} title="No completed discharges" description="Completed discharges will be listed here with outcomes." />
      </Card>
    );
  }
  return (
    <Card className="divide-y divide-gray-50">
      {recs.map((rec: any) => {
        const patient = patients.find(p => p.id === rec.patientId);
        const outcome = outcomes.find(o => o.patientId === rec.patientId);
        if (!patient) return null;
        return (
          <div key={rec.id} className="px-5 py-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 text-sm">{patient.name}</p>
                <span className="text-xs text-gray-400">{patient.patientId}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Discharged by {rec.completedBy ? 'admin' : '—'} · {rec.completedAt ? new Date(rec.completedAt).toLocaleDateString() : '—'}
                {outcome && <> · {outcome.lengthOfStayDays} day stay</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {outcome && <Badge variant="success">Survived</Badge>}
              <Badge variant="neutral">Discharged</Badge>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
