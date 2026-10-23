import React, { useState, useMemo } from 'react';
import {
  Stethoscope, AlertTriangle, Clock, CheckCircle, Thermometer,
  ChevronRight, History, ClipboardList
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button, FormField, textareaCls, inputCls, EmptyState } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { FEVER_THRESHOLD } from '../data/seedData';

export default function DoctorVisits() {
  const { patients, beds, temperatures, doctorVisits, currentUser, getTodayTemp, addDoctorVisit, completeDoctorVisit, getFeverFreeConsecutiveDays, addDischargeRec, isDischargeEligible } = useApp();
  const { success, error, warning } = useToast();
  const [consultModal, setConsultModal] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const activePatients = patients.filter(p => p.status === 'active' || p.status === 'discharge_eligible');

  const queue = useMemo(() =>
    activePatients.map(p => {
      const todayTemp = getTodayTemp(p.id);
      const bed = beds.find(b => b.id === p.bedId);
      const recentTemps = [...temperatures.filter(t => t.patientId === p.id)]
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()).slice(0, 3);
      const todayVisit = doctorVisits.find(v => v.patientId === p.id && v.visitDate === today);
      const feverFreeDays = getFeverFreeConsecutiveDays(p.id);
      const eligible = isDischargeEligible(p.id);
      return { p, bed, todayTemp, recentTemps, todayVisit, feverFreeDays, eligible };
    }).sort((a, b) => {
      // pending first, then by fever status
      const aDone = a.todayVisit?.status === 'completed';
      const bDone = b.todayVisit?.status === 'completed';
      if (aDone !== bDone) return aDone ? 1 : -1;
      return 0;
    }),
    [activePatients, beds, temperatures, doctorVisits, getTodayTemp, getFeverFreeConsecutiveDays, isDischargeEligible, today]
  );

  const pending = queue.filter(({ todayVisit }) => !todayVisit || todayVisit.status !== 'completed');
  const completed = queue.filter(({ todayVisit }) => todayVisit?.status === 'completed');

  return (
    <Layout
      title="Doctor Visits"
      subtitle="Daily consultation queue and visit completion"
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> {pending.length} pending</Badge>
          <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> {completed.length} done</Badge>
        </div>
      }
    >
      {/* Pending queue */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-indigo-600" /> Awaiting Consultation
        </h2>
        <div className="grid lg:grid-cols-2 gap-4">
          {pending.length === 0 ? (
            <Card className="p-8 lg:col-span-2">
              <EmptyState icon={<CheckCircle className="w-12 h-12" />} title="All visits completed!" description="No patients awaiting consultation today." />
            </Card>
          ) : (
            pending.map(({ p, bed, todayTemp, recentTemps, feverFreeDays, eligible }) => {
              const isFever = todayTemp && todayTemp.temperature >= FEVER_THRESHOLD;
              return (
                <Card key={p.id} className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        <span className="text-xs text-gray-400">{p.patientId}</span>
                        {bed && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{bed.bedNumber}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{p.age}y · {p.gender} · Day {Math.ceil((Date.now() - new Date(p.admissionDate).getTime()) / 86400000)} of stay</p>
                    </div>
                    {eligible && <Badge variant="success">Eligible for discharge</Badge>}
                  </div>

                  {/* Temp status */}
                  {todayTemp ? (
                    <div className={`rounded-lg p-3 mb-3 ${isFever ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm">
                          <Thermometer className={`w-4 h-4 ${isFever ? 'text-red-500' : 'text-emerald-500'}`} />
                          Latest temperature
                        </span>
                        <span className={`font-bold text-lg ${isFever ? 'text-red-600' : 'text-emerald-600'}`}>{todayTemp.temperature}°C</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Recorded {new Date(todayTemp.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {todayTemp.recordedByName}</p>
                      {isFever && <p className="text-xs text-red-600 font-medium mt-1">⚠ Fever detected — requires clinical attention.</p>}
                    </div>
                  ) : (
                    <div className="rounded-lg p-3 mb-3 bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-amber-700 font-medium">No temperature recorded today</span>
                      </div>
                      <p className="text-xs text-amber-600 mt-1">Ask nursing staff to record temperature before consultation, or follow emergency procedure if urgent.</p>
                    </div>
                  )}

                  {/* Recent history */}
                  {recentTemps.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1">Recent readings</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {recentTemps.map(t => (
                          <span key={t.id} className={`text-xs px-2 py-1 rounded font-medium ${t.temperature >= FEVER_THRESHOLD ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            {t.temperature}°C
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fever-free progress */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1">Fever-free: {feverFreeDays} consecutive days</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-50">
                    <Button size="sm" onClick={() => setConsultModal(p.id)} className="flex-1">
                      <Stethoscope className="w-4 h-4" /> Start Consultation
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setHistoryModal(p.id)}>
                      <History className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Completed today */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Completed Today
          </h2>
          <Card className="divide-y divide-gray-50">
            {completed.map(({ p, bed, todayTemp, todayVisit }) => (
              <div key={p.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                    <span className="text-xs text-gray-400">{p.patientId}</span>
                    {bed && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{bed.bedNumber}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {todayVisit?.visitedAt && `Visited ${new Date(todayVisit.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    {todayVisit?.doctorName && ` · ${todayVisit.doctorName}`}
                  </p>
                  {todayVisit?.consultationNotes && <p className="text-xs text-gray-600 mt-1 italic">"{todayVisit.consultationNotes}"</p>}
                </div>
                <div className="flex items-center gap-2">
                  {todayTemp && <span className={`text-sm font-bold ${todayTemp.temperature >= FEVER_THRESHOLD ? 'text-red-600' : 'text-emerald-600'}`}>{todayTemp.temperature}°C</span>}
                  <Badge variant="success">Done</Badge>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Consultation modal */}
      <ConsultModal
        patientId={consultModal}
        onClose={() => setConsultModal(null)}
        onComplete={(notes, treatment, recommend) => {
          if (!consultModal || !currentUser) return;
          const patient = patients.find(p => p.id === consultModal);
          if (!patient) return;

          // Ensure a visit record exists, then complete it
          const existing = doctorVisits.find(v => v.patientId === consultModal && v.visitDate === today);
          let visitId = existing?.id;
          if (!existing) {
            visitId = `v${Date.now()}`;
            const res = addDoctorVisit({
              id: visitId, patientId: consultModal, visitDate: today,
              doctorId: currentUser.id, doctorName: currentUser.name, status: 'pending',
            });
            if (!res.success) { error('Could not start visit', res.error); return; }
          }
          completeDoctorVisit(visitId!, notes, treatment);

          if (recommend && isDischargeEligible(consultModal)) {
            addDischargeRec({
              id: `dr${Date.now()}`, patientId: consultModal,
              recommendedBy: currentUser.id, recommendedByName: currentUser.name,
              recommendedAt: new Date().toISOString(), status: 'pending_admin',
              notes: 'Recommended during consultation.',
            });
            success('Visit completed & discharge recommended', `${patient.name}'s case sent to admin for discharge.`);
          } else {
            success('Consultation completed', `Notes saved for ${patient.name}.`);
          }
          setConsultModal(null);
        }}
      />

      {/* History modal */}
      <HistoryModal patientId={historyModal} onClose={() => setHistoryModal(null)} />
    </Layout>
  );
}

// ── Consultation Modal ─────────────────────────────────────────────────────
function ConsultModal({
  patientId, onClose, onComplete
}: {
  patientId: string | null;
  onClose: () => void;
  onComplete: (notes: string, treatment: string, recommend: boolean) => void;
}) {
  const { patients, beds, getTodayTemp, isDischargeEligible } = useApp();
  const [notes, setNotes] = useState('');
  const [treatment, setTreatment] = useState('');
  const [recommend, setRecommend] = useState(false);

  React.useEffect(() => { setNotes(''); setTreatment(''); setRecommend(false); }, [patientId]);

  const patient = patients.find(p => p.id === patientId);
  if (!patient) return null;
  const bed = beds.find(b => b.id === patient.bedId);
  const todayTemp = patientId ? getTodayTemp(patientId) : undefined;
  const eligible = patientId ? isDischargeEligible(patientId) : false;

  return (
    <Modal
      open={!!patientId}
      onClose={onClose}
      title="Consultation"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={notes.trim().length < 5} onClick={() => onComplete(notes.trim(), treatment.trim(), recommend)}>
            <CheckCircle className="w-4 h-4" /> Complete Visit
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="font-semibold text-gray-900">{patient.name}</p>
          <p className="text-xs text-gray-500">{patient.patientId} · {bed ? bed.bedNumber : 'no bed'}</p>
        </div>

        {todayTemp ? (
          <div className={`rounded-lg p-3 ${todayTemp.temperature >= FEVER_THRESHOLD ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Today's temperature</span>
              <span className={`font-bold ${todayTemp.temperature >= FEVER_THRESHOLD ? 'text-red-600' : 'text-emerald-600'}`}>{todayTemp.temperature}°C</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Recorded at {new Date(todayTemp.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        ) : (
          <div className="rounded-lg p-3 bg-amber-50 border border-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p className="text-sm text-amber-700">No temperature on record today. You may still complete the visit — note the situation below.</p>
          </div>
        )}

        <FormField label="Consultation Notes" required hint="Minimum 5 characters">
          <textarea className={textareaCls} rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations, findings, patient-reported symptoms..." autoFocus />
        </FormField>
        <FormField label="Treatment Decision">
          <textarea className={textareaCls} rows={2} value={treatment} onChange={e => setTreatment(e.target.value)} placeholder="e.g. Continue antipyretics, monitor vitals..." />
        </FormField>

        {eligible && (
          <label className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer">
            <input type="checkbox" checked={recommend} onChange={e => setRecommend(e.target.checked)} className="mt-0.5 w-4 h-4 accent-teal-600" />
            <div>
              <p className="text-sm font-medium text-emerald-800">Recommend patient for discharge</p>
              <p className="text-xs text-emerald-600 mt-0.5">Patient meets the 3-day fever-free criterion. Sending to admin for discharge completion.</p>
            </div>
          </label>
        )}
      </div>
    </Modal>
  );
}

// ── History Modal ──────────────────────────────────────────────────────────
function HistoryModal({ patientId, onClose }: { patientId: string | null; onClose: () => void }) {
  const { patients, temperatures, doctorVisits } = useApp();
  const patient = patients.find(p => p.id === patientId);
  if (!patient) return null;

  const temps = [...temperatures.filter(t => t.patientId === patientId)]
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  const visits = [...doctorVisits.filter(v => v.patientId === patientId)]
    .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());

  return (
    <Modal open={!!patientId} onClose={onClose} title={`${patient.name} — History`} size="lg">
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Thermometer className="w-4 h-4 text-teal-600" /> Temperature Readings</h3>
          <div className="max-h-40 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
            {temps.length === 0 ? <p className="text-gray-400 text-sm p-3">No readings.</p> : temps.map(t => (
              <div key={t.id} className="px-3 py-2 flex items-center justify-between text-sm">
                <span className={`font-bold ${t.temperature >= FEVER_THRESHOLD ? 'text-red-600' : 'text-gray-700'}`}>{t.temperature}°C</span>
                <span className="text-xs text-gray-400">{new Date(t.recordedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-indigo-600" /> Consultations</h3>
          <div className="max-h-40 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
            {visits.length === 0 ? <p className="text-gray-400 text-sm p-3">No consultations.</p> : visits.map(v => (
              <div key={v.id} className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{v.doctorName}</span>
                  <Badge variant={v.status === 'completed' ? 'success' : 'warning'}>{v.status}</Badge>
                </div>
                {v.consultationNotes && <p className="text-xs text-gray-600 mt-0.5">{v.consultationNotes}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{v.visitedAt ? new Date(v.visitedAt).toLocaleString() : v.visitDate}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
